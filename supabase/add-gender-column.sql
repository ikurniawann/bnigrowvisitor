-- Add gender column to visitors table
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'Laki-laki';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_visitors_gender ON visitors(gender);

-- Verify
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'visitors' 
AND column_name = 'gender';
