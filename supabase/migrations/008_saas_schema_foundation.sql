-- SaaS multi-chapter foundation.
-- Adds BNI Indonesia > City > Area > Chapter master data and scopes existing data to BNI Grow Chapter.

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(150) NOT NULL UNIQUE,
  code varchar(80) NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS areas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city_id, name)
);

CREATE TABLE IF NOT EXISTS chapters (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_id uuid NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  display_name varchar(180) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (area_id, name)
);

CREATE TABLE IF NOT EXISTS chapter_domains (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  domain varchar(255) NOT NULL UNIQUE,
  type varchar(30) NOT NULL DEFAULT 'subdomain',
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chapter_domains_type_check CHECK (type IN ('subdomain', 'custom_domain', 'localhost'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chapter_domains_primary
ON chapter_domains(chapter_id)
WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_cities_organization_id ON cities(organization_id);
CREATE INDEX IF NOT EXISTS idx_areas_city_id ON areas(city_id);
CREATE INDEX IF NOT EXISTS idx_chapters_area_id ON chapters(area_id);
CREATE INDEX IF NOT EXISTS idx_chapter_domains_chapter_id ON chapter_domains(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_domains_domain ON chapter_domains(domain);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL;

ALTER TABLE meetings
ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL;

ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL;

ALTER TABLE visitor_history
ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL;

ALTER TABLE interview_notes
ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL;

ALTER TABLE ocr_sessions
ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS members
ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS activity_logs
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_chapter_id ON users(chapter_id);
CREATE INDEX IF NOT EXISTS idx_meetings_chapter_id ON meetings(chapter_id);
CREATE INDEX IF NOT EXISTS idx_visitors_chapter_id ON visitors(chapter_id);
CREATE INDEX IF NOT EXISTS idx_visitor_history_chapter_id ON visitor_history(chapter_id);
CREATE INDEX IF NOT EXISTS idx_interview_notes_chapter_id ON interview_notes(chapter_id);
CREATE INDEX IF NOT EXISTS idx_ocr_sessions_chapter_id ON ocr_sessions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_organization_id ON activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_chapter_id ON activity_logs(chapter_id);

DO $$
BEGIN
  IF to_regclass('public.members') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_members_chapter_id ON members(chapter_id);
  END IF;
END $$;

DO $$
DECLARE
  v_org_id uuid;
  v_city_id uuid;
  v_area_id uuid;
  v_chapter_id uuid;
BEGIN
  INSERT INTO organizations (name, code)
  VALUES ('BNI Indonesia', 'bni_indonesia')
  ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      is_active = true,
      updated_at = now()
  RETURNING id INTO v_org_id;

  INSERT INTO cities (organization_id, name)
  VALUES (v_org_id, 'Jakarta')
  ON CONFLICT (organization_id, name) DO UPDATE
  SET is_active = true,
      updated_at = now()
  RETURNING id INTO v_city_id;

  INSERT INTO areas (city_id, name)
  VALUES (v_city_id, 'Jakarta Barat')
  ON CONFLICT (city_id, name) DO UPDATE
  SET is_active = true,
      updated_at = now()
  RETURNING id INTO v_area_id;

  INSERT INTO chapters (area_id, name, display_name)
  VALUES (v_area_id, 'BNI Grow', 'BNI Grow Chapter')
  ON CONFLICT (area_id, name) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      is_active = true,
      updated_at = now()
  RETURNING id INTO v_chapter_id;

  INSERT INTO chapter_domains (chapter_id, domain, type, is_primary)
  VALUES
    (v_chapter_id, 'bnigrowvisitor.vercel.app', 'subdomain', true),
    (v_chapter_id, 'bnigrowvisitor-ikurniawanns-projects.vercel.app', 'subdomain', false),
    (v_chapter_id, 'localhost:3001', 'localhost', false)
  ON CONFLICT (domain) DO UPDATE
  SET chapter_id = EXCLUDED.chapter_id,
      type = EXCLUDED.type,
      is_active = true,
      updated_at = now();

  UPDATE users
  SET organization_id = COALESCE(organization_id, v_org_id),
      chapter_id = COALESCE(chapter_id, v_chapter_id)
  WHERE organization_id IS NULL OR chapter_id IS NULL;

  UPDATE meetings
  SET chapter_id = COALESCE(chapter_id, v_chapter_id)
  WHERE chapter_id IS NULL;

  UPDATE visitors
  SET chapter_id = COALESCE(chapter_id, v_chapter_id),
      chapter = COALESCE(NULLIF(chapter, ''), 'BNI Grow Chapter')
  WHERE chapter_id IS NULL OR chapter IS NULL OR chapter = '';

  UPDATE visitor_history vh
  SET chapter_id = COALESCE(vh.chapter_id, v.chapter_id, v_chapter_id)
  FROM visitors v
  WHERE vh.visitor_id = v.id
    AND vh.chapter_id IS NULL;

  UPDATE interview_notes notes
  SET chapter_id = COALESCE(notes.chapter_id, v.chapter_id, v_chapter_id)
  FROM visitors v
  WHERE notes.visitor_id = v.id
    AND notes.chapter_id IS NULL;

  UPDATE ocr_sessions ocr
  SET chapter_id = COALESCE(ocr.chapter_id, v.chapter_id, v_chapter_id)
  FROM visitors v
  WHERE ocr.visitor_id = v.id
    AND ocr.chapter_id IS NULL;

  UPDATE ocr_sessions
  SET chapter_id = COALESCE(chapter_id, v_chapter_id)
  WHERE chapter_id IS NULL;

  IF to_regclass('public.members') IS NOT NULL THEN
    UPDATE members
    SET chapter_id = COALESCE(chapter_id, v_chapter_id),
        chapter = COALESCE(NULLIF(chapter, ''), 'BNI Grow Chapter')
    WHERE chapter_id IS NULL OR chapter IS NULL OR chapter = '';
  END IF;

  IF to_regclass('public.activity_logs') IS NOT NULL THEN
    UPDATE activity_logs
    SET organization_id = COALESCE(organization_id, v_org_id),
        chapter_id = COALESCE(chapter_id, v_chapter_id)
    WHERE organization_id IS NULL OR chapter_id IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_organizations_updated_at
      BEFORE UPDATE ON organizations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_cities_updated_at
      BEFORE UPDATE ON cities
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_areas_updated_at
      BEFORE UPDATE ON areas
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_chapters_updated_at
      BEFORE UPDATE ON chapters
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_chapter_domains_updated_at
      BEFORE UPDATE ON chapter_domains
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE cities DISABLE ROW LEVEL SECURITY;
ALTER TABLE areas DISABLE ROW LEVEL SECURITY;
ALTER TABLE chapters DISABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_domains DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE organizations IS 'Top-level organizations for SaaS structure, initially BNI Indonesia';
COMMENT ON TABLE cities IS 'City master data under an organization';
COMMENT ON TABLE areas IS 'Area master data under a city';
COMMENT ON TABLE chapters IS 'Chapter master data under an area';
COMMENT ON TABLE chapter_domains IS 'Subdomain/custom domain mapping for chapter tenant resolution';
COMMENT ON COLUMN users.chapter_id IS 'SaaS chapter scope for chapter admin, PIC, and member users';
COMMENT ON COLUMN visitors.chapter_id IS 'SaaS chapter scope; existing data backfilled to BNI Grow Chapter';
