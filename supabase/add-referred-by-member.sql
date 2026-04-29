-- Add referred_by_member_id to visitors table
-- This links visitors to the BNI member who referred them

-- Add the column
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS referred_by_member_id UUID REFERENCES members(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_visitors_referred_by ON visitors(referred_by_member_id);

-- Verify
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'visitors' 
AND column_name = 'referred_by_member_id';
