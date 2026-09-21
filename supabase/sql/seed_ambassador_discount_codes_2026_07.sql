-- Seed ambassador discount codes (20% each).
-- Safe to re-run: existing codes are updated; missing codes are inserted.
-- Run in Supabase SQL Editor after create_ambassador_codes.sql.

with incoming(code, ambassador_name, instagram, country, discount_pct) as (
  values
    ('STELA20', 'Stela Shabani', '@Stela_nailss_', 'Greece', 20),
    ('ANNA20', 'Anna Regucka-Pasternak', '@a.r.p.nails', 'Poland', 20),
    ('THEODORA20', 'Theodora Augusta Lionti', '@Fortunecat_nails', 'Greece', 20),
    ('ALEKSANDRA20', 'Aleksandra Stankovic', '@kodsandrenanokte', 'Serbia', 20),
    ('KONSTANTINA20', 'Konstantina Dionysatou', '@nail_glam_k', 'Greece', 20),
    ('EIRINI20', 'Eirini Anastogianni', '@eirenails', 'Greece', 20),
    ('JULIA20', 'Julia Szymoniak', '@julia.glam.nails_', 'Poland', 20),
    ('MADALINA20', 'Madalina Iutis', '@i_madalina.art', 'Germany', 20),
    ('LJUBICA20', 'Ljubica Nović', '@startodnule', 'Serbia', 20)
)
update public.ambassador_codes c
set
  ambassador_name = i.ambassador_name,
  discount_pct = i.discount_pct,
  active = true,
  notes = concat('Instagram: ', i.instagram, '; Country: ', i.country)
from incoming i
where upper(c.code) = upper(i.code);

with incoming(code, ambassador_name, instagram, country, discount_pct) as (
  values
    ('STELA20', 'Stela Shabani', '@Stela_nailss_', 'Greece', 20),
    ('ANNA20', 'Anna Regucka-Pasternak', '@a.r.p.nails', 'Poland', 20),
    ('THEODORA20', 'Theodora Augusta Lionti', '@Fortunecat_nails', 'Greece', 20),
    ('ALEKSANDRA20', 'Aleksandra Stankovic', '@kodsandrenanokte', 'Serbia', 20),
    ('KONSTANTINA20', 'Konstantina Dionysatou', '@nail_glam_k', 'Greece', 20),
    ('EIRINI20', 'Eirini Anastogianni', '@eirenails', 'Greece', 20),
    ('JULIA20', 'Julia Szymoniak', '@julia.glam.nails_', 'Poland', 20),
    ('MADALINA20', 'Madalina Iutis', '@i_madalina.art', 'Germany', 20),
    ('LJUBICA20', 'Ljubica Nović', '@startodnule', 'Serbia', 20)
)
insert into public.ambassador_codes (
  code,
  ambassador_name,
  discount_pct,
  active,
  notes
)
select
  upper(i.code),
  i.ambassador_name,
  i.discount_pct,
  true,
  concat('Instagram: ', i.instagram, '; Country: ', i.country)
from incoming i
where not exists (
  select 1
  from public.ambassador_codes c
  where upper(c.code) = upper(i.code)
);
