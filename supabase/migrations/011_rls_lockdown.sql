-- RLS lockdown for the SaaS multi-chapter foundation.
--
-- Makes the live security posture explicit and closes the two biggest holes:
--   1. password_hash was readable and writable with the public anon key.
--   2. Master tables (organizations..chapter_domains) had inconsistent RLS
--      state between migration 008 (disabled) and the live database (enabled).
--
-- Model after this migration:
--   - Master tables: service-role only. The app reads them through server API
--     routes (/api/tenant-context, /api/chapter-context, /api/master-data).
--   - users: anon may read/manage PIC & member accounts only, and can never
--     see or change password_hash (column-level privileges). Auth happens
--     server-side in /api/auth/* with the service role.
--   - Data tables: still openly accessible with the anon key (transitional,
--     matches the current client-side app). Phase 2 should move these behind
--     session-checked server routes and tighten the policies per chapter.

-- ---------------------------------------------------------------------------
-- Master tables: enable RLS, no anon policies (service role bypasses RLS).
-- ---------------------------------------------------------------------------
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations_anon_all" ON organizations;
DROP POLICY IF EXISTS "cities_anon_all" ON cities;
DROP POLICY IF EXISTS "areas_anon_all" ON areas;
DROP POLICY IF EXISTS "chapters_anon_all" ON chapters;
DROP POLICY IF EXISTS "chapter_domains_anon_all" ON chapter_domains;

-- ---------------------------------------------------------------------------
-- users: RLS limits anon to PIC/member rows; column privileges hide
-- password_hash entirely from the public keys.
-- ---------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_pic_member" ON users;
CREATE POLICY "users_select_pic_member" ON users
  FOR SELECT TO anon, authenticated
  USING (role IN ('pic', 'member'));

DROP POLICY IF EXISTS "users_insert_pic_member" ON users;
CREATE POLICY "users_insert_pic_member" ON users
  FOR INSERT TO anon, authenticated
  WITH CHECK (role IN ('pic', 'member'));

DROP POLICY IF EXISTS "users_update_pic_member" ON users;
CREATE POLICY "users_update_pic_member" ON users
  FOR UPDATE TO anon, authenticated
  USING (role IN ('pic', 'member'))
  WITH CHECK (role IN ('pic', 'member'));

-- No DELETE policy: the app soft-deletes via is_active.

-- Column-level privileges. NOTE: new columns added to users later must be
-- granted here explicitly, otherwise the client cannot read them.
REVOKE ALL ON users FROM anon, authenticated;

GRANT SELECT (
  id, name, email, role, phone, avatar_url, is_active,
  created_at, updated_at, business_classification, organization_id, chapter_id
) ON users TO anon, authenticated;

-- INSERT keeps password_hash so the app can seed a random placeholder for new
-- PIC accounts; UPDATE intentionally excludes it so passwords can only be
-- changed through the server-side auth routes.
GRANT INSERT (
  id, name, email, role, phone, avatar_url, is_active,
  created_at, updated_at, business_classification, organization_id, chapter_id,
  password_hash
) ON users TO anon, authenticated;

GRANT UPDATE (
  name, email, role, phone, avatar_url, is_active,
  updated_at, business_classification, organization_id, chapter_id
) ON users TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Data tables: explicit transitional policies matching current app behavior.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'visitors', 'members', 'meetings', 'visitor_history',
    'interview_notes', 'ocr_sessions', 'activity_logs'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "%s_anon_all" ON %I', t, t);
      EXECUTE format(
        'CREATE POLICY "%s_anon_all" ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)',
        t, t
      );
    END IF;
  END LOOP;
END $$;
