-- Add attended_choice columns to visitors table
-- Stores both the number (1, 2, 3) and description when visitor status is "Hadir"

-- Drop old column if exists (from previous implementation)
ALTER TABLE visitors 
DROP COLUMN IF EXISTS attended_choice;

-- Add new columns
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS attended_choice_number INTEGER,
ADD COLUMN IF NOT EXISTS attended_choice_note VARCHAR(255);

-- Create indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_visitors_attended_number ON visitors(attended_choice_number);
CREATE INDEX IF NOT EXISTS idx_visitors_attended_note ON visitors(attended_choice_note);

-- Add comments
COMMENT ON COLUMN visitors.attended_choice_number IS 'Choice number (1, 2, or 3) when status is attended';
COMMENT ON COLUMN visitors.attended_choice_note IS 'Choice description when status is attended';

-- Verify
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'visitors' 
AND (column_name = 'attended_choice_number' OR column_name = 'attended_choice_note');
