-- Monthly review reminder (1st of the month, switched in admin).
alter table public.ambassador_applications add column if not exists monthly_review_reminder_at timestamptz;
insert into public.app_settings (key, value, updated_by) values ('monthly_review_reminder_on', 'false'::jsonb, 'setup') on conflict (key) do nothing;
