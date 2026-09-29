-- Draft cart safety net / mirror table.
-- Keeps the latest active cart state even if the browser state or live draft row disappears.
CREATE TABLE IF NOT EXISTS b2b_draft_cart_snapshots (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         uuid        NOT NULL,
  customer_email   text,
  items           jsonb       NOT NULL DEFAULT '{}',
  total_units     integer     NOT NULL DEFAULT 0,
  total_estimated numeric(10,2) NOT NULL DEFAULT 0,
  source          text        NOT NULL DEFAULT 'portal',   -- 'portal' | 'catalogue'
  last_reminder_sent_at timestamptz,
  reminder_count  integer     NOT NULL DEFAULT 0,
  customer_action text,
  customer_action_at timestamptz,
  customer_action_note text,
  archived_at     timestamptz,
  archived_reason text,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source)
);

ALTER TABLE b2b_draft_cart_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can upsert own draft cart snapshots" ON b2b_draft_cart_snapshots;
CREATE POLICY "Users can upsert own draft cart snapshots"
  ON b2b_draft_cart_snapshots FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage draft cart snapshots" ON b2b_draft_cart_snapshots;
CREATE POLICY "Admins can manage draft cart snapshots"
  ON b2b_draft_cart_snapshots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM b2b_admins
      WHERE b2b_admins.email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM b2b_admins
      WHERE b2b_admins.email = auth.jwt() ->> 'email'
    )
  );
