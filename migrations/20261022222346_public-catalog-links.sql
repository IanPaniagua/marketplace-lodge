CREATE OR REPLACE FUNCTION public.get_catalog_profile(p_profile_id uuid)
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  bio text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT p.id, p.display_name, p.avatar_url, p.bio
  FROM public.profiles AS p
  WHERE p.id = p_profile_id
    AND p.is_approved
    AND p.deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.is_public_catalog_owner(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = p_profile_id
      AND p.is_approved
      AND p.deleted_at IS NULL
  );
$$;

CREATE POLICY listings_select_public_link
ON public.listings FOR SELECT TO anon
USING (
  status = 'live'::public.listing_status
  AND visibility = 'everyone'::public.listing_visibility
  AND public.is_public_catalog_owner(owner_id)
);

CREATE POLICY listing_photos_select_public_link
ON public.listing_photos FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.listings AS visible_listing
    WHERE visible_listing.id = listing_photos.listing_id
  )
);

GRANT SELECT ON TABLE public.listings, public.listing_photos TO anon;

REVOKE ALL ON FUNCTION public.get_catalog_profile(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_public_catalog_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_catalog_profile(uuid) TO anon, authenticated, project_admin;
GRANT EXECUTE ON FUNCTION public.is_public_catalog_owner(uuid) TO anon, authenticated, project_admin;
