CREATE OR REPLACE FUNCTION public.get_app_user_names_by_user_ids(user_ids UUID[])
RETURNS TABLE (id UUID, name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT app_user.id, app_user.name
    FROM public.app_user
    WHERE app_user.id = ANY (COALESCE(user_ids, '{}'::UUID[]));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_app_user_names_by_user_ids(UUID[]) TO authenticated;