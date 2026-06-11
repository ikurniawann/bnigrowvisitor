-- Clarify Airtime choices used by the MCQA flow.
-- status = attendance/pipeline state, attended_choice_* = Airtime result after the visitor actually attends.

ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS attended_choice_number INTEGER,
ADD COLUMN IF NOT EXISTS attended_choice_note VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_visitors_airtime_choice_number
ON visitors(attended_choice_number);

COMMENT ON COLUMN visitors.attended_choice_number IS
'Airtime result after visitor attends: 1=Bersedia Bergabung, 2=Pikir-pikir Dulu, 3=Tidak Tertarik';

COMMENT ON COLUMN visitors.attended_choice_note IS
'Human readable Airtime result label';
