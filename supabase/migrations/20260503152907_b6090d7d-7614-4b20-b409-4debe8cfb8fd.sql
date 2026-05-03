
-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Security definer role check (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin');
$$;

-- Auto-create profile and assign role on signup (first user = admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count INT;
  assigned_role app_role;
BEGIN
  INSERT INTO public.profiles (id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.email)
  );

  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'user';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Billing cycles
CREATE TABLE public.billing_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

-- Meals
CREATE TABLE public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.billing_cycles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_count NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (meal_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, cycle_id, date)
);

-- Bazar
CREATE TABLE public.bazar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.billing_cycles(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  item_list TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deposits
CREATE TABLE public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.billing_cycles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extra costs
CREATE TABLE public.extra_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.billing_cycles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation: entry date within cycle range
CREATE OR REPLACE FUNCTION public.validate_entry_date()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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

CREATE TRIGGER meals_validate_date BEFORE INSERT OR UPDATE ON public.meals
FOR EACH ROW EXECUTE FUNCTION public.validate_entry_date();
CREATE TRIGGER bazar_validate_date BEFORE INSERT OR UPDATE ON public.bazar
FOR EACH ROW EXECUTE FUNCTION public.validate_entry_date();
CREATE TRIGGER deposits_validate_date BEFORE INSERT OR UPDATE ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.validate_entry_date();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bazar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extra_costs ENABLE ROW LEVEL SECURITY;

-- Profiles: everyone authenticated can read (needed for showing names); users update own; admin manages all
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- User roles: users see own; admin manages all
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Billing cycles: all authenticated can read; admin writes
CREATE POLICY "cycles_select_all" ON public.billing_cycles FOR SELECT TO authenticated USING (true);
CREATE POLICY "cycles_admin_all" ON public.billing_cycles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Meals: all read; user inserts/updates own; admin manages all
CREATE POLICY "meals_select_all" ON public.meals FOR SELECT TO authenticated USING (true);
CREATE POLICY "meals_insert_own" ON public.meals FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "meals_update_own" ON public.meals FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "meals_delete_own" ON public.meals FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "meals_admin_all" ON public.meals FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Bazar: all read; admin manages all
CREATE POLICY "bazar_select_all" ON public.bazar FOR SELECT TO authenticated USING (true);
CREATE POLICY "bazar_admin_all" ON public.bazar FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Deposits: all read; user inserts own; admin manages all
CREATE POLICY "deposits_select_all" ON public.deposits FOR SELECT TO authenticated USING (true);
CREATE POLICY "deposits_insert_own" ON public.deposits FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "deposits_admin_all" ON public.deposits FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Extra costs: all read; admin writes
CREATE POLICY "extra_costs_select_all" ON public.extra_costs FOR SELECT TO authenticated USING (true);
CREATE POLICY "extra_costs_admin_all" ON public.extra_costs FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
