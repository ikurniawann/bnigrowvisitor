-- Create members table for BNI Grow Members
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  business_field VARCHAR(255),
  company VARCHAR(255),
  chapter VARCHAR(100),
  joined_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for development
ALTER TABLE members DISABLE ROW LEVEL SECURITY;

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_joined_date ON members(joined_date);

-- Insert sample data (optional)
-- INSERT INTO members (name, phone, email, business_field, company) VALUES
--   ('Ahmad Santoso', '081234567890', 'ahmad@example.com', 'Consulting', 'PT Santoso Jaya'),
--   ('Budi Wijaya', '081234567891', 'budi@example.com', 'Manufacturing', 'CV Wijaya Makmur');

COMMENT ON TABLE members IS 'BNI Grow Members - Member yang sudah resmi bergabung';
COMMENT ON COLUMN members.name IS 'Nama lengkap member';
COMMENT ON COLUMN members.phone IS 'Nomor WhatsApp (optional)';
COMMENT ON COLUMN members.email IS 'Email address';
COMMENT ON COLUMN members.business_field IS 'Bidang usaha';
COMMENT ON COLUMN members.company IS 'Nama perusahaan';
COMMENT ON COLUMN members.chapter IS 'Chapter BNI';
COMMENT ON COLUMN members.joined_date IS 'Tanggal bergabung';
COMMENT ON COLUMN members.status IS 'Status: active, inactive, suspended';
