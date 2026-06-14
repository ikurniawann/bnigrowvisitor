-- Phase 2 of the SaaS lockdown (the TODO left in migration 011).
--
-- Migration 011 left the operational data tables openly readable/writable with
-- the public anon key (transitional `<t>_anon_all USING (true)` policies) and
-- kept anon column grants on `users`. With more than one chapter live, that
-- means anyone holding the anon key (it ships in the browser bundle) can read
-- or write EVERY chapter's data and forge audit rows.
--
-- The app now reaches every one of these tables exclusively through
-- session-checked, chapter-scoped server routes under /api/data/* (service
-- role). So we can revoke the anon/authenticated keys from the data tables
-- entirely. RLS stays ENABLED; the service role bypasses it.
--
-- ORDER OF OPERATIONS: apply this migration ONLY AFTER the refactored app
-- (server routes + client using /api/data/*) is deployed. Applied earlier, the
-- still-anon client would break.

-- ---------------------------------------------------------------------------
-- Operational data tables: service-role only.
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
      -- Keep RLS on (deny-by-default) and drop the transitional open policy.
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "%s_anon_all" ON %I', t, t);
      -- Remove every privilege from the public keys. No policies + no grants
      -- => anon/authenticated cannot touch the table at all.
      EXECUTE format('REVOKE ALL ON %I FROM anon, authenticated', t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- users: drop the anon PIC/member policies and column grants from migration
-- 011. PIC/member rows are now read and written only through server routes
-- (auth, /api/data/pics, /api/data/accounts/*). RLS stays ENABLED.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_select_pic_member" ON users;
DROP POLICY IF EXISTS "users_insert_pic_member" ON users;
DROP POLICY IF EXISTS "users_update_pic_member" ON users;

REVOKE ALL ON users FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- Rollback (manual, if a missed anon consumer surfaces): re-grant the needed
-- privileges and recreate the transitional policies from migration 011. Prefer
-- fixing the consumer to route through /api/data/* instead.
-- ---------------------------------------------------------------------------
