-- Member renewal lifecycle + external (BNI Finance) API access.
--
-- Two concerns:
--  1. Members gain a renewal_date (the date the renewal invoice is sent). A
--     member stays `active` until renewal lapses; a daily job flips overdue
--     members to `inactive`. Finance can write back a confirmed renewal to push
--     the date forward and reactivate.
--  2. A new `api_keys` table backs machine-to-machine auth for external systems
--     (BNI Finance). Keys are stored only as a SHA-256 hash, never in clear.
--
-- Consistent with migration 013: every table here is reached exclusively via
-- session/key-checked server routes using the service role, so the anon and
-- authenticated keys get no grants and RLS stays enabled (deny-by-default).

-- ---------------------------------------------------------------------------
-- 1. Member renewal columns
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS members
  ADD COLUMN IF NOT EXISTS renewal_date date,
  ADD COLUMN IF NOT EXISTS last_renewed_at timestamptz;

DO $$
BEGIN
  IF to_regclass('public.members') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_members_renewal_date ON members(renewal_date);
    -- The daily deactivation job scans (status, renewal_date); a partial index
    -- on active members keeps that scan cheap as the table grows.
    CREATE INDEX IF NOT EXISTS idx_members_active_renewal
      ON members(renewal_date)
      WHERE status = 'active';
  END IF;
END $$;

COMMENT ON COLUMN members.renewal_date IS 'Tanggal kirim invoice perpanjangan keanggotaan. Lewat tanggal ini (+ masa tenggang) tanpa perpanjangan => status inactive.';
COMMENT ON COLUMN members.last_renewed_at IS 'Kapan perpanjangan terakhir dikonfirmasi (mis. oleh BNI Finance).';

-- ---------------------------------------------------------------------------
-- 2. API keys for external systems (BNI Finance)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  -- Human-recognisable leading slice of the raw key, safe to display. The full
  -- key is never stored; only its SHA-256 hash is.
  key_prefix varchar(20) NOT NULL,
  key_hash varchar(64) NOT NULL UNIQUE,
  scope varchar(40) NOT NULL DEFAULT 'finance',
  is_active boolean NOT NULL DEFAULT true,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_organization_id ON api_keys(organization_id);

-- Service-role only, same lockdown posture as the operational data tables.
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON api_keys FROM anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_api_keys_updated_at
      BEFORE UPDATE ON api_keys
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE api_keys IS 'Machine-to-machine API keys for external integrations (e.g. BNI Finance). Stored as SHA-256 hash only.';
COMMENT ON COLUMN api_keys.scope IS 'Capability grant: finance = read members + write-back renewal.';
COMMENT ON COLUMN api_keys.key_prefix IS 'Leading slice of the raw key for display/identification; not secret.';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hex of the full raw key. The raw key is shown once at creation and never stored.';
