CREATE OR REPLACE FUNCTION public.guard_application_message_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND OLD.message IS NOT NULL
       AND NEW.message IS NULL THEN
        RAISE EXCEPTION 'Cannot clear application message when changing status.'
            USING ERRCODE = '23514',
                  HINT = 'Preserve the existing message or provide a replacement message while updating status.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_application_message_on_status_change_before_update ON public.application;

CREATE TRIGGER guard_application_message_on_status_change_before_update
BEFORE UPDATE ON public.application
FOR EACH ROW
EXECUTE FUNCTION public.guard_application_message_on_status_change();