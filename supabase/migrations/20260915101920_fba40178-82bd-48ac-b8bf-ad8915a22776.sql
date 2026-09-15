DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ekskuls','ekskul_enrollments','ekskul_payments','ekskul_sessions','ekskul_attendances','ekskul_grades']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_write_%s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "auth_write_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_update_%s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "auth_update_%s" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_delete_%s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "auth_delete_%s" ON public.%I FOR DELETE TO authenticated USING (true)', t, t);
  END LOOP;
END $$;