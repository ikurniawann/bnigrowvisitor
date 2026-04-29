-- Add attended_choice column to visitors table
-- Stores the choice (1, 2, or 3) when visitor status is "Hadir"

ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS attended_choice VARCHAR(10);

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_visitors_attended_choice ON visitors(attended_choice);

-- Add comment
COMMENT ON COLUMN visitors.attended_choice IS 'Choice 1, 2, or 3 when status is attended (Hadir)';

-- Verify
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'visitors' 
AND column_name = 'attended_choice';
