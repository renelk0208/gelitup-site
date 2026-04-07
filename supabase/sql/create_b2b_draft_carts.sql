-- Draft / abandoned carts – synced from the client browser so admins
-- can see what customers are building before they submit.
CREATE TABLE IF NOT EXISTS b2b_draft_carts (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       uuid        NOT NULL,
  customer_email text,
  items         jsonb       NOT NULL DEFAULT '{}',
  total_units   integer     NOT NULL DEFAULT 0,
  total_estimated numeric(10,2) NOT NULL DEFAULT 0,
  source        text        NOT NULL DEFAULT 'portal',   -- 'portal' | 'catalogue'
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source)
);

-- Users can manage their own draft cart row
ALTER TABLE b2b_draft_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can upsert own draft cart"
  ON b2b_draft_carts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins (service role or via b2b_admins check) can read all
CREATE POLICY "Admins can read all draft carts"
  ON b2b_draft_carts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM b2b_admins
      WHERE b2b_admins.email = auth.jwt() ->> 'email'
    )
  );
