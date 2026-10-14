-- Ambassador packages: "Processing" stage.
-- Set when the packing sheet is printed/downloaded in the admin; cleared when
-- the package is sent (Save & send). Already applied to production.
alter table public.ambassador_applications
  add column if not exists package_processing_at timestamptz,
  add column if not exists package_processing_by text;
