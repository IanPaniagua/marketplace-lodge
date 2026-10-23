CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted');
CREATE TYPE public.listing_visibility AS ENUM ('everyone', 'friends');

ALTER TABLE public.listings
  ADD COLUMN visibility public.listing_visibility NOT NULL DEFAULT 'everyone';

CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.friendship_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT friendships_distinct_users CHECK (requester_id <> addressee_id),
  CONSTRAINT friendships_response_state CHECK (
    (status = 'pending' AND responded_at IS NULL)
    OR (status = 'accepted' AND responded_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX friendships_pair_unique_idx
  ON public.friendships (
    (LEAST(requester_id, addressee_id)),
    (GREATEST(requester_id, addressee_id))
  );
CREATE INDEX friendships_requester_status_idx
  ON public.friendships (requester_id, status, created_at DESC);
CREATE INDEX friendships_addressee_status_idx
  ON public.friendships (addressee_id, status, created_at DESC);

CREATE INDEX listings_visibility_status_idx
  ON public.listings (visibility, status, created_at DESC);

CREATE OR REPLACE FUNCTION public.are_friends(p_first uuid, p_second uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friendships AS f
    WHERE f.status = 'accepted'::public.friendship_status
      AND (
        (f.requester_id = p_first AND f.addressee_id = p_second)
        OR (f.requester_id = p_second AND f.addressee_id = p_first)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.protect_friendship_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW.requester_id IS DISTINCT FROM OLD.requester_id
     OR NEW.addressee_id IS DISTINCT FROM OLD.addressee_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'friendship identities cannot be changed';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT (
       OLD.status = 'pending'::public.friendship_status
       AND NEW.status = 'accepted'::public.friendship_status
       AND auth.uid() = OLD.addressee_id
     ) THEN
    RAISE EXCEPTION 'invalid friendship transition';
  END IF;

  IF NEW.responded_at IS DISTINCT FROM OLD.responded_at
     AND NOT (
       OLD.status = 'pending'::public.friendship_status
       AND NEW.status = 'accepted'::public.friendship_status
       AND auth.uid() = OLD.addressee_id
     ) THEN
    RAISE EXCEPTION 'responded_at is server maintained';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER friendships_protect_fields
BEFORE UPDATE ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.protect_friendship_fields();

CREATE OR REPLACE FUNCTION public.respond_friend_request(
  p_friendship_id uuid,
  p_accept boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  affected_rows integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF p_accept THEN
    UPDATE public.friendships AS f
    SET status = 'accepted'::public.friendship_status,
        responded_at = now()
    WHERE f.id = p_friendship_id
      AND f.addressee_id = auth.uid()
      AND f.status = 'pending'::public.friendship_status
      AND NOT public.is_blocked_by(f.requester_id);
  ELSE
    DELETE FROM public.friendships AS f
    WHERE f.id = p_friendship_id
      AND f.addressee_id = auth.uid()
      AND f.status = 'pending'::public.friendship_status;
  END IF;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_friendship_on_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  DELETE FROM public.friendships AS f
  WHERE (f.requester_id = NEW.blocker_id AND f.addressee_id = NEW.blocked_id)
     OR (f.requester_id = NEW.blocked_id AND f.addressee_id = NEW.blocker_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER blocks_remove_friendship
AFTER INSERT ON public.blocks
FOR EACH ROW
EXECUTE FUNCTION public.remove_friendship_on_block();

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY friendships_select_participants
ON public.friendships FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR auth.uid() IN (requester_id, addressee_id)
);

CREATE POLICY friendships_insert_requester
ON public.friendships FOR INSERT TO authenticated
WITH CHECK (
  public.is_approved()
  AND requester_id = auth.uid()
  AND requester_id <> addressee_id
  AND status = 'pending'::public.friendship_status
  AND responded_at IS NULL
  AND NOT public.is_blocked_by(addressee_id)
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS target
    WHERE target.id = addressee_id
      AND target.is_approved
      AND target.deleted_at IS NULL
  )
);

CREATE POLICY friendships_delete_participants
ON public.friendships FOR DELETE TO authenticated
USING (
  public.is_admin()
  OR auth.uid() IN (requester_id, addressee_id)
);

DROP POLICY listings_select ON public.listings;

CREATE POLICY listings_select
ON public.listings FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR owner_id = auth.uid()
  OR (
    public.is_approved()
    AND status IN ('live', 'sold')
    AND NOT public.is_blocked_by(owner_id)
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS owner_profile
      WHERE owner_profile.id = owner_id
        AND owner_profile.deleted_at IS NULL
    )
    AND (
      visibility = 'everyone'::public.listing_visibility
      OR public.are_friends(owner_id, auth.uid())
    )
  )
);

REVOKE ALL ON TABLE public.friendships FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.friendships TO authenticated;
GRANT UPDATE (visibility) ON TABLE public.listings TO authenticated;
GRANT USAGE ON TYPE public.friendship_status, public.listing_visibility TO authenticated;

REVOKE ALL ON FUNCTION public.are_friends(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_friendship_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.respond_friend_request(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_friendship_on_block() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO authenticated, project_admin;
GRANT EXECUTE ON FUNCTION public.respond_friend_request(uuid, boolean) TO authenticated;
