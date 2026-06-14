-- National governance foundation: chapter KPI targets, national policies /
-- templates (with per-chapter override), and a login audit trail.
--
-- Convention for targets & policies: a row with chapter_id IS NULL is the
-- national default applied to every chapter; a row with a chapter_id overrides
-- that default for one chapter only.

-- ---------------------------------------------------------------------------
-- chapter_targets: KPI targets set by national admin.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chapter_targets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES chapters(id) ON DELETE CASCADE,
  visitors_per_meeting integer NOT NULL DEFAULT 10,
  member_conversion_pct integer NOT NULL DEFAULT 15,
  min_active_pic integer NOT NULL DEFAULT 3,
  min_weekly_meetings_per_month integer NOT NULL DEFAULT 4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chapter_id)
);

-- Exactly one national default (chapter_id IS NULL).
CREATE UNIQUE INDEX IF NOT EXISTS chapter_targets_default_uniq
  ON chapter_targets ((1)) WHERE chapter_id IS NULL;

-- ---------------------------------------------------------------------------
-- national_policies: default WA templates, pipeline config, required fields.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS national_policies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES chapters(id) ON DELETE CASCADE,
  policy_type varchar(40) NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chapter_id, policy_type)
);

-- Exactly one national default per policy_type.
CREATE UNIQUE INDEX IF NOT EXISTS national_policies_default_uniq
  ON national_policies (policy_type) WHERE chapter_id IS NULL;

-- ---------------------------------------------------------------------------
-- login_audit: one row per login attempt (success or failure).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_audit (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  email varchar(180),
  success boolean NOT NULL,
  reason varchar(120),
  ip varchar(60),
  user_agent text,
  organization_id uuid,
  chapter_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_audit_created_idx ON login_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS login_audit_email_idx ON login_audit (lower(email));
CREATE INDEX IF NOT EXISTS login_audit_chapter_idx ON login_audit (chapter_id);

-- ---------------------------------------------------------------------------
-- RLS: service-role only. The app reaches these tables exclusively through
-- server API routes, matching the lockdown in migration 011.
-- ---------------------------------------------------------------------------
ALTER TABLE chapter_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE national_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_audit ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON chapter_targets FROM anon, authenticated;
REVOKE ALL ON national_policies FROM anon, authenticated;
REVOKE ALL ON login_audit FROM anon, authenticated;
