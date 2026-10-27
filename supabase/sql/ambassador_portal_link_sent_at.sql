-- Shipments → "Send profile login links": when each ambassador was last emailed her login link.
alter table public.ambassador_applications add column if not exists portal_link_sent_at timestamptz;
