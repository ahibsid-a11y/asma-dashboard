
CREATE TYPE public.calendar_target_type AS ENUM ('ALL','ROLE','USERS');

CREATE OR REPLACE FUNCTION public.current_account_type()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT account_type FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_calendar_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
      AND account_type IN ('super_admin','mudir','kepala_sekolah','waka_kurikulum','kabid_kesantrian')
  )
$$;

CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  location text,
  event_date date NOT NULL,
  end_date date,
  all_day boolean NOT NULL DEFAULT false,
  start_time time,
  end_time time,
  color text NOT NULL DEFAULT 'primary',
  target_type public.calendar_target_type NOT NULL DEFAULT 'ALL',
  target_roles public.app_role[] NOT NULL DEFAULT '{}',
  target_user_ids uuid[] NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX calendar_events_date_idx ON public.calendar_events (event_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View targeted calendar events" ON public.calendar_events
FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_calendar_admin(auth.uid())
  OR target_type = 'ALL'
  OR (target_type = 'USERS' AND auth.uid() = ANY (target_user_ids))
  OR (target_type = 'ROLE' AND public.current_account_type() = ANY (target_roles))
);

CREATE POLICY "Calendar admins create events" ON public.calendar_events
FOR INSERT TO authenticated
WITH CHECK (public.is_calendar_admin(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Calendar admins update events" ON public.calendar_events
FOR UPDATE TO authenticated
USING (public.is_calendar_admin(auth.uid()))
WITH CHECK (public.is_calendar_admin(auth.uid()));

CREATE POLICY "Calendar admins delete events" ON public.calendar_events
FOR DELETE TO authenticated
USING (public.is_calendar_admin(auth.uid()));

CREATE TRIGGER calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
