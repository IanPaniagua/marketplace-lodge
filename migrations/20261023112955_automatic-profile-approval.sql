ALTER TABLE public.profiles
  ALTER COLUMN is_approved SET DEFAULT true;

UPDATE public.profiles
SET is_approved = true
WHERE is_approved = false
  AND deleted_at IS NULL;

DROP POLICY profiles_insert ON public.profiles;

CREATE POLICY profiles_insert
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (
  id = (SELECT auth.uid())
  AND is_admin = false
  AND is_approved = true
  AND deleted_at IS NULL
);
