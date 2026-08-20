-- Ambassador program with fixed customer discount.
-- Clients always receive 20% off with ambassador codes.
-- Ambassador journey milestones still track progress at €1,000 and €2,000.
-- Commission ambassadors earn stays at 20% regardless of milestone.
-- Safe to run multiple times.

-- Step 1: Ensure all existing ambassador codes are 20% for clients.
UPDATE public.ambassador_codes
SET discount_pct = 20
WHERE active = true OR active IS NULL;

-- Step 2: Update approve_ambassador_application to create new codes at 20%.
CREATE OR REPLACE FUNCTION public.approve_ambassador_application(
  p_application_id bigint
)
RETURNS TABLE (
  discount_code text,
  reviewed_at timestamptz,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.ambassador_applications%rowtype;
  v_code text;
  v_seed bytea;
  v_alphabet text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_suffix text;
  i integer;
BEGIN
  SELECT *
    INTO v_row
  FROM public.ambassador_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ambassador application not found';
  END IF;

  v_code := nullif(trim(coalesce(v_row.discount_code, '')), '');

  IF v_code IS NULL THEN
    SELECT c.code INTO v_code
    FROM public.ambassador_codes c
    WHERE lower(coalesce(c.ambassador_email, '')) = lower(coalesce(v_row.email, ''))
    ORDER BY c.id DESC LIMIT 1;
  END IF;

  IF v_code IS NULL THEN
    SELECT c.code INTO v_code
    FROM public.ambassador_codes c
    WHERE lower(coalesce(c.ambassador_name, '')) = lower(coalesce(v_row.full_name, ''))
    ORDER BY c.id DESC LIMIT 1;
  END IF;

  IF v_code IS NULL THEN
    v_code := public.generate_ambassador_discount_code(v_row.full_name, v_row.id);
  END IF;

  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.ambassador_codes c WHERE upper(c.code) = upper(v_code)
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.ambassador_applications a
      WHERE a.id <> p_application_id
        AND upper(coalesce(a.discount_code, '')) = upper(v_code)
    );

    v_seed := decode(md5(
      random()::text ||
      clock_timestamp()::text ||
      coalesce(v_row.id::text, '') ||
      coalesce(v_row.full_name, '')
    ), 'hex');
    v_suffix := '';
    FOR i IN 0..7 LOOP
      v_suffix := v_suffix || substr(v_alphabet, (get_byte(v_seed, i) % 32) + 1, 1);
    END LOOP;
    v_code := 'GIUP-' || substr(v_suffix, 1, 4) || '-' || substr(v_suffix, 5, 4);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM public.ambassador_codes c WHERE upper(c.code) = upper(v_code)
  ) THEN
    INSERT INTO public.ambassador_codes (
      code, ambassador_name, ambassador_email,
      discount_pct, commission_pct, active, notes
    ) VALUES (
      v_code,
      v_row.full_name,
      v_row.email,
      20,   -- clients always receive 20%
      20,
      true,
      concat('Auto-created from approved ambassador application #', v_row.id)
    );
  ELSE
    UPDATE public.ambassador_codes c
       SET ambassador_name  = coalesce(nullif(trim(v_row.full_name), ''), c.ambassador_name),
           ambassador_email = coalesce(nullif(trim(v_row.email), ''), c.ambassador_email),
           active           = true
     WHERE upper(c.code) = upper(v_code);
  END IF;

  UPDATE public.ambassador_applications
     SET status                   = 'approved',
         reviewed_at              = coalesce(reviewed_at, now()),
         reviewed_by              = coalesce(reviewed_by, auth.email()),
         discount_code            = v_code,
         discount_code_created_at = coalesce(discount_code_created_at, now())
   WHERE id = p_application_id;

  RETURN QUERY
  SELECT v_code, reviewed_at, status
  FROM public.ambassador_applications
  WHERE id = p_application_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_ambassador_application(bigint) TO authenticated;

-- Step 3: Validate ambassador code with fixed 20% customer discount.
CREATE OR REPLACE FUNCTION public.validate_ambassador_code(p_code text)
RETURNS TABLE (
  code            text,
  ambassador_name text,
  discount_pct    numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.code,
    c.ambassador_name,
    20::numeric
  FROM public.ambassador_codes c
  WHERE upper(c.code) = upper(p_code)
    AND c.active = true
    AND (c.max_redemptions IS NULL OR c.redemption_count < c.max_redemptions);
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_ambassador_code(text) TO anon, authenticated;

-- Step 4: Replace get_my_ambassador_wallet with fixed client discount and
-- milestone progress fields for the ambassador slider.
CREATE OR REPLACE FUNCTION public.get_my_ambassador_wallet()
RETURNS TABLE (
  code              text,
  ambassador_name   text,
  available_eur     numeric,
  earned_eur        numeric,
  spent_eur         numeric,
  commission_pct    numeric,
  discount_pct      numeric,
  total_redeemed_eur numeric,
  next_tier_at      numeric,
  next_tier_pct     numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email     text;
  v_full_name text;
BEGIN
  v_email     := lower(trim(coalesce(auth.email(), '')));
  v_full_name := lower(trim(coalesce(
    auth.jwt() -> 'user_metadata' ->> 'full_name',
    auth.jwt() ->> 'full_name',
    ''
  )));

  IF v_email = '' THEN RETURN; END IF;

  RETURN QUERY
  WITH me AS (
    SELECT c.id, c.code, c.ambassador_name, c.commission_pct
    FROM public.ambassador_codes c
    WHERE lower(coalesce(c.ambassador_email, '')) = v_email
      AND c.active = true
    ORDER BY c.id DESC LIMIT 1
  ),
  me_by_name AS (
    SELECT c.id, c.code, c.ambassador_name, c.commission_pct
    FROM public.ambassador_codes c
    WHERE NOT EXISTS (SELECT 1 FROM me)
      AND v_full_name <> ''
      AND lower(coalesce(c.ambassador_name, '')) = v_full_name
      AND c.active = true
    ORDER BY c.id DESC LIMIT 1
  ),
  resolved AS (
    SELECT * FROM me
    UNION ALL
    SELECT * FROM me_by_name
    LIMIT 1
  ),
  redeemed AS (
    SELECT coalesce(SUM(r.order_total_eur), 0)::numeric AS total
    FROM resolved m
    LEFT JOIN public.ambassador_redemptions r ON upper(r.code) = upper(m.code)
  ),
  earned AS (
    SELECT coalesce(SUM(
      coalesce(r.commission_amount_eur,
        ROUND(coalesce(r.order_total_eur, 0) * coalesce(m.commission_pct, 0) / 100, 2))
    ), 0)::numeric AS total
    FROM resolved m
    LEFT JOIN public.ambassador_redemptions r ON upper(r.code) = upper(m.code)
  ),
  spent AS (
    SELECT coalesce(SUM(s.amount_eur), 0)::numeric AS total
    FROM resolved m
    LEFT JOIN public.ambassador_wallet_spends s
      ON s.ambassador_code_id = m.id
     AND s.reversed_at IS NULL
  )
  SELECT
    m.code,
    m.ambassador_name,
    greatest(0, ROUND(e.total - s.total, 2))   AS available_eur,
    ROUND(e.total, 2)                            AS earned_eur,
    ROUND(s.total, 2)                            AS spent_eur,
    m.commission_pct,
    20::numeric                                   AS discount_pct,
    ROUND(rd.total, 2)                           AS total_redeemed_eur,
    -- Next tier threshold (null if already at max)
    CASE
      WHEN rd.total >= 2000 THEN NULL
      WHEN rd.total >= 1000 THEN 2000
      ELSE 1000
    END::numeric                                 AS next_tier_at,
    -- What discount they'll unlock at next tier
    CASE
      WHEN rd.total >= 2000 THEN NULL
      WHEN rd.total >= 1000 THEN 20
      ELSE 15
    END::numeric                                 AS next_tier_pct
  FROM resolved m
  CROSS JOIN earned e
  CROSS JOIN spent s
  CROSS JOIN redeemed rd;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_ambassador_wallet() TO authenticated;
