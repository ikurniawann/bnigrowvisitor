-- Guest data is intentionally separated from visitors. BNI registration
-- reports contain both Type = Visitor and Type = Guest; only visitors enter
-- the follow-up pipeline, while guests stay in this operational list.

CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id uuid REFERENCES chapters(id) ON DELETE CASCADE,
  name varchar(150) NOT NULL,
  gender varchar(20),
  business_field varchar(150),
  company varchar(150),
  phone varchar(30),
  email varchar(150),
  chapter varchar(100),
  referral_name varchar(150),
  meeting_id uuid REFERENCES meetings(id) ON DELETE SET NULL,
  meeting_date date,
  meeting_format varchar(20),
  visit_date date,
  source_type varchar(50) NOT NULL DEFAULT 'Guest',
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guests_chapter ON guests(chapter_id);
CREATE INDEX IF NOT EXISTS idx_guests_meeting ON guests(meeting_id);
CREATE INDEX IF NOT EXISTS idx_guests_meeting_date ON guests(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_guests_created_at ON guests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone);
CREATE INDEX IF NOT EXISTS idx_guests_name ON guests(name);

CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_phone_per_meeting_unique
  ON guests(chapter_id, meeting_id, phone)
  WHERE phone IS NOT NULL AND phone <> '';

DROP TRIGGER IF EXISTS update_guests_updated_at ON guests;
CREATE TRIGGER update_guests_updated_at
  BEFORE UPDATE ON guests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON guests FROM anon, authenticated;
