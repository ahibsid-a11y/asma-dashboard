ALTER TABLE public.attendance_records DROP CONSTRAINT attendance_records_user_id_fkey;
ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.attendance_records DROP CONSTRAINT attendance_records_recorded_by_fkey;
ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_records_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.violation_records DROP CONSTRAINT violation_records_user_id_fkey;
ALTER TABLE public.violation_records ADD CONSTRAINT violation_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.violation_records DROP CONSTRAINT violation_records_recorded_by_fkey;
ALTER TABLE public.violation_records ADD CONSTRAINT violation_records_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.incidental_attendance_records DROP CONSTRAINT incidental_attendance_records_user_id_fkey;
ALTER TABLE public.incidental_attendance_records ADD CONSTRAINT incidental_attendance_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.incidental_attendance_records DROP CONSTRAINT incidental_attendance_records_recorded_by_fkey;
ALTER TABLE public.incidental_attendance_records ADD CONSTRAINT incidental_attendance_records_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.incidental_attendance_records DROP CONSTRAINT incidental_attendance_records_event_id_fkey;
ALTER TABLE public.incidental_attendance_records ADD CONSTRAINT incidental_attendance_records_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.incidental_attendance_events(id) ON DELETE CASCADE;

ALTER TABLE public.incidental_attendance_events DROP CONSTRAINT incidental_attendance_events_created_by_fkey;
ALTER TABLE public.incidental_attendance_events ADD CONSTRAINT incidental_attendance_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;