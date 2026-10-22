CREATE OR REPLACE FUNCTION public.enroll_monthly_ekskul(p_ekskul_id text, p_student_id uuid, p_semester text, p_academic_year text, p_months text[]) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE e public.ekskuls; enr public.ekskul_enrollments; m text; permitted text[]; initial_status text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Silakan masuk kembali'; END IF;
 IF p_student_id <> auth.uid() AND NOT public.is_not_santri(auth.uid()) THEN RAISE EXCEPTION 'Tidak dapat mendaftarkan santri lain'; END IF;
 SELECT * INTO e FROM public.ekskuls WHERE id=p_ekskul_id;
 IF NOT FOUND OR NOT e.is_active OR e.fee_period <> 'per_bulan' THEN RAISE EXCEPTION 'Program bulanan tidak tersedia'; END IF;
 IF p_semester NOT IN ('1','2') OR p_academic_year !~ '^\d{4}/\d{4}$' OR cardinality(p_months) IS NULL OR cardinality(p_months)=0 THEN RAISE EXCEPTION 'Pilih bulan dan periode yang valid'; END IF;
 SELECT array_agg((CASE WHEN p_semester='1' THEN split_part(p_academic_year,'/',1) ELSE split_part(p_academic_year,'/',2) END)||'-'||lpad(n::text,2,'0')) INTO permitted FROM generate_series(CASE WHEN p_semester='1' THEN 7 ELSE 1 END, CASE WHEN p_semester='1' THEN 12 ELSE 6 END) n;
 FOREACH m IN ARRAY p_months LOOP
  IF NOT m=ANY(permitted) OR (e.available_months IS NOT NULL AND NOT substring(m from 6 for 2)::integer=ANY(e.available_months)) THEN RAISE EXCEPTION 'Bulan tidak tersedia pada semester ini'; END IF;
 END LOOP;
 initial_status := CASE WHEN e.category='pilihan' AND e.fee>0 THEN 'menunggu_konfirmasi' ELSE 'aktif' END;
 INSERT INTO public.ekskul_enrollments(ekskul_id,student_id,semester,academic_year,status,participation_months)
 VALUES(p_ekskul_id,p_student_id,p_semester,p_academic_year,initial_status,p_months)
 ON CONFLICT(ekskul_id,student_id,semester,academic_year) DO UPDATE SET
 participation_months=CASE WHEN ekskul_enrollments.participation_months IS NULL THEN NULL ELSE ARRAY(SELECT DISTINCT x FROM unnest(ekskul_enrollments.participation_months || excluded.participation_months) x ORDER BY x) END
 RETURNING * INTO enr;
 IF e.category='pilihan' AND e.fee>0 THEN
  INSERT INTO public.ekskul_payments(enrollment_id,ekskul_id,student_id,period_label,month_key,amount,status)
  SELECT enr.id,e.id,p_student_id,(ARRAY['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'])[substring(x from 6 for 2)::integer] || ' ' || substring(x from 1 for 4),x,e.fee,'belum_bayar' FROM (SELECT DISTINCT unnest(p_months) x) months
  ON CONFLICT(enrollment_id,month_key) WHERE month_key IS NOT NULL DO NOTHING;
 END IF;
 RETURN to_jsonb(enr);
END;
$$;
REVOKE ALL ON FUNCTION public.enroll_monthly_ekskul(text,uuid,text,text,text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.enroll_monthly_ekskul(text,uuid,text,text,text[]) TO authenticated;
