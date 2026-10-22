ALTER TABLE public.ekskuls ADD COLUMN available_months integer[];
ALTER TABLE public.ekskul_enrollments ADD COLUMN participation_months text[];
ALTER TABLE public.ekskul_payments ADD COLUMN month_key text;
COMMENT ON COLUMN public.ekskul_enrollments.participation_months IS 'Selected YYYY-MM participation months; NULL preserves legacy semester-wide enrollment.';
CREATE UNIQUE INDEX ekskul_monthly_bill_unique ON public.ekskul_payments (enrollment_id, month_key) WHERE month_key IS NOT NULL;
ALTER TABLE public.ekskuls ADD CONSTRAINT ekskul_available_months_range CHECK (available_months IS NULL OR (cardinality(available_months) > 0 AND available_months <@ ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]));