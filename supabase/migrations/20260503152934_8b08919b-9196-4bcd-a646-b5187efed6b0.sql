
-- Fix search_path on validate_entry_date
CREATE OR REPLACE FUNCTION public.validate_entry_date()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  c_start DATE;
  c_end DATE;
BEGIN
  SELECT start_date, end_date INTO c_start, c_end
  FROM public.billing_cycles WHERE id = NEW.cycle_id;
  IF NEW.date < c_start OR NEW.date > c_end THEN
    RAISE EXCEPTION 'Date % is outside billing cycle range (% to %)', NEW.date, c_start, c_end;
  END IF;
  RETURN NEW;
END;
$$;

-- Revoke public/anon execute on SECURITY DEFINER functions (only triggers / authed RLS need them)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(UUID) FROM PUBLIC, anon;
