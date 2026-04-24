ALTER TABLE public.player
ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '';

UPDATE public.player p
SET
    display_name = COALESCE(
        NULLIF(TRIM(a.name), ''),
        display_name,
        ''
    )
FROM public.app_user a
WHERE
    a.id = p.user_id
    AND COALESCE(NULLIF(TRIM(a.name), ''), '') <> '';