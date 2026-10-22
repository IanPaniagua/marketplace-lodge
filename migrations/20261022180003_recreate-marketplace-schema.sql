CREATE TYPE public.listing_category AS ENUM (
  'furniture',
  'kitchen',
  'electronics',
  'books',
  'clothes',
  'other'
);

CREATE TYPE public.listing_condition AS ENUM (
  'new',
  'like_new',
  'used',
  'worn'
);

CREATE TYPE public.listing_status AS ENUM (
  'draft',
  'pending',
  'live',
  'sold',
  'archived',
  'rejected'
);

CREATE TYPE public.report_status AS ENUM (
  'open',
  'resolved',
  'dismissed'
);

CREATE TYPE public.report_target_type AS ENUM (
  'user',
  'listing',
  'conversation'
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 40),
  avatar_url text,
  bio text CHECK (char_length(bio) <= 200),
  room_number text CHECK (char_length(room_number) <= 10),
  is_admin boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz
);

CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 80),
  description text CHECK (description IS NULL OR char_length(description) <= 2000),
  price_eur numeric(10, 2) CHECK (price_eur IS NULL OR price_eur >= 0),
  is_gift boolean NOT NULL DEFAULT false,
  category public.listing_category NOT NULL,
  condition public.listing_condition NOT NULL,
  status public.listing_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  first_approved_at timestamptz,
  CONSTRAINT price_or_gift CHECK (
    (is_gift = true AND price_eur IS NULL)
    OR (is_gift = false AND price_eur IS NOT NULL)
  )
);

CREATE TABLE public.listing_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversations_listing_buyer_unique UNIQUE (listing_id, buyer_id),
  CONSTRAINT conversations_distinct_participants CHECK (buyer_id <> seller_id)
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rater_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ratee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text CHECK (char_length(comment) <= 280),
  created_at timestamptz NOT NULL DEFAULT now(),
  edit_locked_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  CONSTRAINT ratings_unique UNIQUE (rater_id, ratee_id, listing_id),
  CONSTRAINT ratings_distinct_users CHECK (rater_id <> ratee_id)
);

CREATE TABLE public.blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT blocks_distinct_users CHECK (blocker_id <> blocked_id)
);

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type public.report_target_type NOT NULL,
  target_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 5 AND 1000),
  status public.report_status NOT NULL DEFAULT 'open',
  resolved_by uuid REFERENCES public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh_key text NOT NULL,
  auth_key text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_user_endpoint_unique UNIQUE (user_id, endpoint)
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('message', 'listing', 'admin_user', 'admin_listing')),
  ref_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_is_approved_idx
  ON public.profiles (is_approved) WHERE deleted_at IS NULL;
CREATE INDEX profiles_last_active_at_idx
  ON public.profiles (last_active_at) WHERE deleted_at IS NULL;
CREATE INDEX listings_status_created_idx
  ON public.listings (status, created_at DESC);
CREATE INDEX listings_owner_idx
  ON public.listings (owner_id);
CREATE INDEX listings_first_approved_at_idx
  ON public.listings (first_approved_at) WHERE first_approved_at IS NOT NULL;
CREATE INDEX listing_photos_listing_idx
  ON public.listing_photos (listing_id, sort_order);
CREATE INDEX conversations_buyer_idx
  ON public.conversations (buyer_id, last_message_at DESC);
CREATE INDEX conversations_seller_idx
  ON public.conversations (seller_id, last_message_at DESC);
CREATE INDEX messages_conversation_idx
  ON public.messages (conversation_id, created_at);
CREATE INDEX ratings_ratee_idx
  ON public.ratings (ratee_id, created_at DESC);
CREATE INDEX push_subscriptions_user_idx
  ON public.push_subscriptions (user_id);
CREATE INDEX notifications_recipient_idx
  ON public.notifications (recipient_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT coalesce(
    (SELECT p.is_admin FROM public.profiles AS p WHERE p.id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT coalesce(
    (
      SELECT p.is_approved AND p.deleted_at IS NULL
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_blocked_by(target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.blocks AS b
    WHERE (b.blocker_id = target AND b.blocked_id = auth.uid())
       OR (b.blocker_id = auth.uid() AND b.blocked_id = target)
  );
$$;

CREATE OR REPLACE FUNCTION public.bump_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_bump_conv
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.bump_conversation_last_message();

CREATE OR REPLACE FUNCTION public.protect_listing_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'owner_id cannot be changed';
  END IF;

  IF auth.uid() IS NOT NULL THEN
    IF NEW.first_approved_at IS DISTINCT FROM OLD.first_approved_at
       OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
      RAISE EXCEPTION 'approval fields are server maintained';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status IN ('live'::public.listing_status, 'rejected'::public.listing_status) THEN
      RAISE EXCEPTION 'only an administrator can publish or reject a listing';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER listings_protect_fields
BEFORE UPDATE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.protect_listing_fields();

CREATE OR REPLACE FUNCTION public.reject_listing(p_id uuid, p_reason text)
RETURNS TABLE (
  id uuid,
  status public.listing_status,
  rejection_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  RETURN QUERY
    UPDATE public.listings AS l
    SET status = 'rejected'::public.listing_status,
        rejection_reason = p_reason,
        updated_at = now()
    WHERE l.id = p_id
    RETURNING l.id, l.status, l.rejection_reason;
END;
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select
ON public.profiles FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR (
    public.is_approved()
    AND deleted_at IS NULL
    AND (
      id = auth.uid()
      OR (is_approved AND NOT public.is_blocked_by(id))
      OR EXISTS (
        SELECT 1
        FROM public.blocks AS b
        WHERE b.blocker_id = auth.uid() AND b.blocked_id = profiles.id
      )
    )
  )
);

CREATE POLICY profiles_insert
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (
  id = auth.uid()
  AND is_admin = false
  AND is_approved = false
);

CREATE POLICY profiles_update
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

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
      FROM public.profiles AS p
      WHERE p.id = owner_id AND p.deleted_at IS NULL
    )
  )
);

CREATE POLICY listings_insert
ON public.listings FOR INSERT TO authenticated
WITH CHECK (
  public.is_approved()
  AND owner_id = auth.uid()
  AND status IN ('draft', 'pending')
);

CREATE POLICY listings_update_own
ON public.listings FOR UPDATE TO authenticated
USING (owner_id = auth.uid() AND public.is_approved())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY listings_delete_own
ON public.listings FOR DELETE TO authenticated
USING (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY listing_photos_select
ON public.listing_photos FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.listings AS l
    WHERE l.id = listing_photos.listing_id
  )
);

CREATE POLICY listing_photos_insert
ON public.listing_photos FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.listings AS l
    WHERE l.id = listing_photos.listing_id AND l.owner_id = auth.uid()
  )
);

CREATE POLICY listing_photos_update
ON public.listing_photos FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.listings AS l
    WHERE l.id = listing_photos.listing_id AND l.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.listings AS l
    WHERE l.id = listing_photos.listing_id AND l.owner_id = auth.uid()
  )
);

CREATE POLICY listing_photos_delete
ON public.listing_photos FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.listings AS l
    WHERE l.id = listing_photos.listing_id AND l.owner_id = auth.uid()
  )
  OR public.is_admin()
);

CREATE POLICY conversations_select
ON public.conversations FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR (
    auth.uid() IN (buyer_id, seller_id)
    AND NOT public.is_blocked_by(
      CASE WHEN buyer_id = auth.uid() THEN seller_id ELSE buyer_id END
    )
  )
);

CREATE POLICY conversations_insert
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (
  public.is_approved()
  AND buyer_id = auth.uid()
  AND NOT public.is_blocked_by(seller_id)
);

CREATE POLICY messages_select
ON public.messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations AS c
    WHERE c.id = messages.conversation_id
      AND (auth.uid() IN (c.buyer_id, c.seller_id) OR public.is_admin())
  )
);

CREATE POLICY messages_insert
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  public.is_approved()
  AND sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.conversations AS c
    WHERE c.id = messages.conversation_id
      AND auth.uid() IN (c.buyer_id, c.seller_id)
      AND NOT public.is_blocked_by(
        CASE WHEN c.buyer_id = auth.uid() THEN c.seller_id ELSE c.buyer_id END
      )
  )
);

CREATE POLICY messages_update_read
ON public.messages FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations AS c
    WHERE c.id = messages.conversation_id
      AND auth.uid() IN (c.buyer_id, c.seller_id)
      AND messages.sender_id <> auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.conversations AS c
    WHERE c.id = messages.conversation_id
      AND auth.uid() IN (c.buyer_id, c.seller_id)
      AND messages.sender_id <> auth.uid()
  )
);

CREATE POLICY ratings_select
ON public.ratings FOR SELECT TO authenticated
USING (
  public.is_approved()
  AND NOT public.is_blocked_by(ratee_id)
  AND NOT public.is_blocked_by(rater_id)
);

CREATE POLICY ratings_insert
ON public.ratings FOR INSERT TO authenticated
WITH CHECK (
  public.is_approved()
  AND rater_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.conversations AS c
    JOIN public.messages AS m ON m.conversation_id = c.id
    WHERE c.listing_id = ratings.listing_id
      AND auth.uid() IN (c.buyer_id, c.seller_id)
      AND ratings.ratee_id IN (c.buyer_id, c.seller_id)
  )
);

CREATE POLICY ratings_update_own
ON public.ratings FOR UPDATE TO authenticated
USING (rater_id = auth.uid() AND now() < edit_locked_at)
WITH CHECK (rater_id = auth.uid() AND now() < edit_locked_at);

CREATE POLICY blocks_select_own
ON public.blocks FOR SELECT TO authenticated
USING (blocker_id = auth.uid());

CREATE POLICY blocks_insert_own
ON public.blocks FOR INSERT TO authenticated
WITH CHECK (blocker_id = auth.uid());

CREATE POLICY blocks_delete_own
ON public.blocks FOR DELETE TO authenticated
USING (blocker_id = auth.uid());

CREATE POLICY reports_select
ON public.reports FOR SELECT TO authenticated
USING (public.is_admin() OR reporter_id = auth.uid());

CREATE POLICY reports_insert
ON public.reports FOR INSERT TO authenticated
WITH CHECK (public.is_approved() AND reporter_id = auth.uid());

CREATE POLICY reports_update_admin
ON public.reports FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY push_subscriptions_select_own
ON public.push_subscriptions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY push_subscriptions_insert_own
ON public.push_subscriptions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_approved());

CREATE POLICY push_subscriptions_delete_own
ON public.push_subscriptions FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY notifications_select_own
ON public.notifications FOR SELECT TO authenticated
USING (recipient_id = auth.uid());

CREATE POLICY app_config_admin
ON public.app_config FOR ALL TO project_admin
USING (true)
WITH CHECK (true);

GRANT USAGE ON SCHEMA public TO authenticated;

REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (display_name, avatar_url, bio, room_number, deleted_at, last_active_at)
  ON TABLE public.profiles TO authenticated;

REVOKE ALL ON TABLE public.listings FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.listings TO authenticated;
GRANT UPDATE (title, description, price_eur, is_gift, category, condition, status, updated_at)
  ON TABLE public.listings TO authenticated;

REVOKE ALL ON TABLE public.listing_photos FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.listing_photos TO authenticated;
GRANT UPDATE (sort_order) ON TABLE public.listing_photos TO authenticated;

REVOKE ALL ON TABLE public.conversations FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.conversations TO authenticated;

REVOKE ALL ON TABLE public.messages FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.messages TO authenticated;
GRANT UPDATE (read_at) ON TABLE public.messages TO authenticated;

REVOKE ALL ON TABLE public.ratings FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.ratings TO authenticated;
GRANT UPDATE (stars, comment) ON TABLE public.ratings TO authenticated;

REVOKE ALL ON TABLE public.blocks FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.blocks TO authenticated;

REVOKE ALL ON TABLE public.reports FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.reports TO authenticated;

REVOKE ALL ON TABLE public.push_subscriptions FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.push_subscriptions TO authenticated;

REVOKE ALL ON TABLE public.notifications FROM anon, authenticated;
GRANT SELECT ON TABLE public.notifications TO authenticated;

REVOKE ALL ON TABLE public.app_config FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_approved() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_blocked_by(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_listing(uuid, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, project_admin;
GRANT EXECUTE ON FUNCTION public.is_approved() TO authenticated, project_admin;
GRANT EXECUTE ON FUNCTION public.is_blocked_by(uuid) TO authenticated, project_admin;
GRANT EXECUTE ON FUNCTION public.reject_listing(uuid, text) TO project_admin;
