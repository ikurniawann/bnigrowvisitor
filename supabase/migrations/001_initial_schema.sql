-- BNI Grow Visitor Management System
-- Initial Database Schema
-- Created: April 2026

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

-- User roles
CREATE TYPE user_role AS ENUM ('admin', 'pic', 'member');

-- Visitor status
CREATE TYPE visitor_status AS ENUM (
  'new',           -- Baru Daftar
  'followup',      -- Follow Up
  'confirmed',     -- Konfirmasi Hadir
  'attended',      -- Hadir
  'no_show',       -- Tidak Hadir
  'interview',     -- Interview
  'member',        -- Jadi Member
  'not_continue'   -- Tidak Lanjut
);

-- Interview interest level
CREATE TYPE interest_level AS ENUM ('high', 'medium', 'low');

-- History action types
CREATE TYPE history_action_type AS ENUM (
  'status_change',
  'note_added',
  'pic_assigned',
  'data_edited'
);

-- ============================================
-- TABLES
-- ============================================

-- 1. USERS TABLE
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL,
  email varchar(150) UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role user_role NOT NULL DEFAULT 'pic',
  phone varchar(20),
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for email lookup
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- 2. MEETINGS TABLE
CREATE TABLE meetings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title varchar(100) NOT NULL,
  meeting_date date NOT NULL,
  location varchar(200),
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for meeting date
CREATE INDEX idx_meetings_date ON meetings(meeting_date DESC);
CREATE INDEX idx_meetings_created_by ON meetings(created_by);

-- 3. VISITORS TABLE
CREATE TABLE visitors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL,
  phone varchar(30) NOT NULL,
  email varchar(150),
  business_field varchar(150),
  company varchar(150),
  chapter varchar(100),
  referral_name varchar(100),
  referral_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  meeting_id uuid REFERENCES meetings(id) ON DELETE SET NULL,
  pic_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status visitor_status NOT NULL DEFAULT 'new',
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_visitors_meeting ON visitors(meeting_id);
CREATE INDEX idx_visitors_pic ON visitors(pic_id);
CREATE INDEX idx_visitors_status ON visitors(status);
CREATE INDEX idx_visitors_created_at ON visitors(created_at DESC);
CREATE INDEX idx_visitors_phone ON visitors(phone);
CREATE INDEX idx_visitors_chapter ON visitors(chapter);

-- 4. VISITOR HISTORY TABLE (Audit Trail)
CREATE TABLE visitor_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_id uuid NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  action_type history_action_type NOT NULL,
  old_value jsonb,
  new_value jsonb,
  note text,
  performed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for history queries
CREATE INDEX idx_visitor_history_visitor ON visitor_history(visitor_id);
CREATE INDEX idx_visitor_history_created_at ON visitor_history(created_at DESC);
CREATE INDEX idx_visitor_history_action ON visitor_history(action_type);

-- 5. INTERVIEW NOTES TABLE
CREATE TABLE interview_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_id uuid NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  interviewer_id uuid REFERENCES users(id) ON DELETE SET NULL,
  interest_level interest_level,
  business_category varchar(100),
  content text NOT NULL,
  follow_up_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_interview_notes_visitor ON interview_notes(visitor_id);
CREATE INDEX idx_interview_notes_interviewer ON interview_notes(interviewer_id);
CREATE INDEX idx_interview_notes_follow_up ON interview_notes(follow_up_date);

-- 6. OCR SESSIONS TABLE
CREATE TABLE ocr_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  image_url text NOT NULL,
  extracted_data jsonb,
  used boolean NOT NULL DEFAULT false,
  visitor_id uuid REFERENCES visitors(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ocr_sessions_uploaded_by ON ocr_sessions(uploaded_by);
CREATE INDEX idx_ocr_sessions_visitor ON ocr_sessions(visitor_id);
CREATE INDEX idx_ocr_sessions_used ON ocr_sessions(used);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visitors_updated_at
  BEFORE UPDATE ON visitors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interview_notes_updated_at
  BEFORE UPDATE ON interview_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_sessions ENABLE ROW LEVEL SECURITY;

-- Users can see all users (for PIC assignment dropdown)
CREATE POLICY "Users can view all active users"
  ON users FOR SELECT
  USING (is_active = true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- All authenticated users can view meetings
CREATE POLICY "Authenticated users can view meetings"
  ON meetings FOR SELECT
  TO authenticated
  USING (true);

-- Only admin/pic can create/edit meetings
CREATE POLICY "Admin/PIC can manage meetings"
  ON meetings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'pic')
    )
  );

-- All authenticated users can view visitors
CREATE POLICY "Authenticated users can view visitors"
  ON visitors FOR SELECT
  TO authenticated
  USING (true);

-- Admin/PIC can manage visitors
CREATE POLICY "Admin/PIC can manage visitors"
  ON visitors FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'pic')
    )
  );

-- All authenticated users can view visitor history
CREATE POLICY "Authenticated users can view visitor history"
  ON visitor_history FOR SELECT
  TO authenticated
  USING (true);

-- Admin/PIC can insert visitor history
CREATE POLICY "Admin/PIC can insert visitor history"
  ON visitor_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'pic')
    )
  );

-- All authenticated users can view interview notes
CREATE POLICY "Authenticated users can view interview notes"
  ON interview_notes FOR SELECT
  TO authenticated
  USING (true);

-- Admin/PIC can manage interview notes
CREATE POLICY "Admin/PIC can manage interview notes"
  ON interview_notes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'pic')
    )
  );

-- All authenticated users can view OCR sessions
CREATE POLICY "Authenticated users can view OCR sessions"
  ON ocr_sessions FOR SELECT
  TO authenticated
  USING (true);

-- Admin/PIC can manage OCR sessions
CREATE POLICY "Admin/PIC can manage OCR sessions"
  ON ocr_sessions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'pic')
    )
  );

-- ============================================
-- STORAGE BUCKETS (for Supabase Storage)
-- ============================================

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for OCR images
INSERT INTO storage.buckets (id, name, public)
VALUES ('ocr-images', 'ocr-images', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- DEFAULT ADMIN USER
-- ============================================

-- Insert default admin user
-- Email: admin@bnigrow.com
-- Password: admin123 (change after first login!)
INSERT INTO users (name, email, password_hash, role, phone)
VALUES (
  'Admin BNI Grow',
  'admin@bnigrow.com',
  '$2b$10$rMx9zKqQ8vL3jN5wY6tH7OZGxK4pW2nR8sT1uV3xY5zA6bC7dE8fG', -- admin123
  'admin',
  '+6281234567890'
) ON CONFLICT (email) DO NOTHING;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get visitor count by status
CREATE OR REPLACE FUNCTION get_visitor_stats(
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL
)
RETURNS TABLE (
  status visitor_status,
  count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT v.status, COUNT(*)::bigint
  FROM visitors v
  WHERE (p_date_from IS NULL OR v.created_at >= p_date_from)
    AND (p_date_to IS NULL OR v.created_at <= p_date_to)
  GROUP BY v.status;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get PIC workload
CREATE OR REPLACE FUNCTION get_pic_workload()
RETURNS TABLE (
  pic_id uuid,
  pic_name varchar,
  active_visitors bigint,
  total_visitors bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.name,
    COUNT(CASE WHEN v.status NOT IN ('member', 'not_continue') THEN 1 END)::bigint,
    COUNT(*)::bigint
  FROM users u
  LEFT JOIN visitors v ON v.pic_id = u.id
  WHERE u.role = 'pic' AND u.is_active = true
  GROUP BY u.id, u.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE users IS 'System users (Admin, PIC, Member)';
COMMENT ON TABLE meetings IS 'Weekly meeting sessions';
COMMENT ON TABLE visitors IS 'Main visitor data';
COMMENT ON TABLE visitor_history IS 'Audit trail for visitor changes';
COMMENT ON TABLE interview_notes IS 'Interview-specific notes';
COMMENT ON TABLE ocr_sessions IS 'OCR extraction session logs';

COMMENT ON COLUMN visitors.status IS 'new=Baru Daftar, followup=Follow Up, confirmed=Konfirmasi Hadir, attended=Hadir, no_show=Tidak Hadir, interview=Interview, member=Jadi Member, not_continue=Tidak Lanjut';
