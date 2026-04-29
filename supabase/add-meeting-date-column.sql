-- ============================================
-- ADD meeting_date COLUMN - visitors table
-- ============================================
-- Run this in Supabase SQL Editor

-- Add meeting_date column to visitors table
ALTER TABLE visitors 
ADD COLUMN meeting_date DATE;

-- Migrate existing data from meeting_id to meeting_date (if meetings table has date)
-- UPDATE visitors v
-- SET meeting_date = m.meeting_date
-- FROM meetings m
-- WHERE v.meeting_id = m.id;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_visitors_meeting_date 
ON visitors(meeting_date DESC);

-- Verify: Check if column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'visitors' 
AND column_name = 'meeting_date';
