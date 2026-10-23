CREATE TABLE public.friend_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  revoked_at timestamptz,
  CONSTRAINT friend_invites_valid_expiry CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX friend_invites_one_active_idx
  ON public.friend_invites (inviter_id)
  WHERE revoked_at IS NULL;

CREATE INDEX friend_invites_token_active_idx
  ON public.friend_invites (token, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE public.friend_invite_claims (
  invite_id uuid NOT NULL REFERENCES public.friend_invites(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (invite_id, invitee_id),
  CONSTRAINT friend_invite_claims_distinct_users CHECK (inviter_id <> invitee_id),
  CONSTRAINT friend_invite_claims_pair_unique UNIQUE (inviter_id, invitee_id)
);

CREATE INDEX friend_invite_claims_invitee_idx
  ON public.friend_invite_claims (invitee_id, claimed_at DESC);

ALTER TABLE public.friend_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_invite_claims ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_or_create_friend_invite()
RETURNS TABLE (
  invite_token uuid,
  invite_expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_approved() THEN
    RETURN;
  END IF;

  UPDATE public.friend_invites AS invite
  SET revoked_at = now()
  WHERE invite.inviter_id = auth.uid()
    AND invite.revoked_at IS NULL
    AND invite.expires_at <= now();

  RETURN QUERY
    SELECT invite.token, invite.expires_at
    FROM public.friend_invites AS invite
    WHERE invite.inviter_id = auth.uid()
      AND invite.revoked_at IS NULL
      AND invite.expires_at > now()
    LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  INSERT INTO public.friend_invites (inviter_id)
  VALUES (auth.uid())
  ON CONFLICT DO NOTHING;

  RETURN QUERY
    SELECT invite.token, invite.expires_at
    FROM public.friend_invites AS invite
    WHERE invite.inviter_id = auth.uid()
      AND invite.revoked_at IS NULL
      AND invite.expires_at > now()
    LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_friend_invite_preview(p_token uuid)
RETURNS TABLE (
  inviter_id uuid,
  display_name text,
  avatar_url text,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT profile.id, profile.display_name, profile.avatar_url, invite.expires_at
  FROM public.friend_invites AS invite
  JOIN public.profiles AS profile ON profile.id = invite.inviter_id
  WHERE invite.token = p_token
    AND invite.revoked_at IS NULL
    AND invite.expires_at > now()
    AND profile.is_approved
    AND profile.deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.claim_friend_invite(p_token uuid)
RETURNS TABLE (
  claim_status text,
  inviter_id uuid,
  inviter_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  invite_record record;
  existing_friendship_id uuid;
  existing_friendship_status public.friendship_status;
  inserted_claims integer;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN QUERY SELECT 'not_authenticated'::text, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles AS current_profile
    WHERE current_profile.id = current_user_id
      AND current_profile.deleted_at IS NULL
  ) THEN
    RETURN QUERY SELECT 'profile_missing'::text, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  SELECT invite.id, invite.inviter_id, profile.display_name
  INTO invite_record
  FROM public.friend_invites AS invite
  JOIN public.profiles AS profile ON profile.id = invite.inviter_id
  WHERE invite.token = p_token
    AND invite.revoked_at IS NULL
    AND invite.expires_at > now()
    AND profile.is_approved
    AND profile.deleted_at IS NULL
  FOR UPDATE OF invite;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'invalid'::text, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  IF invite_record.inviter_id = current_user_id THEN
    RETURN QUERY
      SELECT 'self'::text, invite_record.inviter_id, invite_record.display_name;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.blocks AS block
    WHERE (block.blocker_id = invite_record.inviter_id AND block.blocked_id = current_user_id)
       OR (block.blocker_id = current_user_id AND block.blocked_id = invite_record.inviter_id)
  ) THEN
    RETURN QUERY
      SELECT 'blocked'::text, invite_record.inviter_id, invite_record.display_name;
    RETURN;
  END IF;

  SELECT friendship.id, friendship.status
  INTO existing_friendship_id, existing_friendship_status
  FROM public.friendships AS friendship
  WHERE (friendship.requester_id = invite_record.inviter_id AND friendship.addressee_id = current_user_id)
     OR (friendship.requester_id = current_user_id AND friendship.addressee_id = invite_record.inviter_id)
  FOR UPDATE;

  IF existing_friendship_status = 'accepted'::public.friendship_status THEN
    INSERT INTO public.friend_invite_claims (invite_id, inviter_id, invitee_id)
    VALUES (invite_record.id, invite_record.inviter_id, current_user_id)
    ON CONFLICT DO NOTHING;

    RETURN QUERY
      SELECT 'already_friends'::text, invite_record.inviter_id, invite_record.display_name;
    RETURN;
  END IF;

  INSERT INTO public.friend_invite_claims (invite_id, inviter_id, invitee_id)
  VALUES (invite_record.id, invite_record.inviter_id, current_user_id)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS inserted_claims = ROW_COUNT;
  IF inserted_claims = 0 THEN
    RETURN QUERY
      SELECT 'already_claimed'::text, invite_record.inviter_id, invite_record.display_name;
    RETURN;
  END IF;

  IF existing_friendship_id IS NOT NULL THEN
    DELETE FROM public.friendships
    WHERE id = existing_friendship_id;
  END IF;

  INSERT INTO public.friendships (
    requester_id,
    addressee_id,
    status,
    responded_at
  ) VALUES (
    invite_record.inviter_id,
    current_user_id,
    'accepted'::public.friendship_status,
    now()
  );

  RETURN QUERY
    SELECT 'claimed'::text, invite_record.inviter_id, invite_record.display_name;
END;
$$;

REVOKE ALL ON TABLE public.friend_invites, public.friend_invite_claims
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.get_or_create_friend_invite()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_friend_invite_preview(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_friend_invite(uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_or_create_friend_invite()
  TO authenticated, project_admin;
GRANT EXECUTE ON FUNCTION public.get_friend_invite_preview(uuid)
  TO anon, authenticated, project_admin;
GRANT EXECUTE ON FUNCTION public.claim_friend_invite(uuid)
  TO authenticated, project_admin;
