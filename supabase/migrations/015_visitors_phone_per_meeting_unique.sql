-- Allow a returning visitor (same WA number) to appear in multiple weekly
-- meetings. Previously visitors.phone had a GLOBAL unique constraint, so a
-- person could exist only once in the whole table — a re-visit at a later
-- meeting was rejected. Replace it with a per-meeting unique so the same phone
-- can recur across meetings while staying unique WITHIN a meeting (no dupes on
-- re-import). Visit history = the set of visitor rows sharing a phone.

-- Drop the old global unique on phone (constraint and/or stray index).
ALTER TABLE visitors DROP CONSTRAINT IF EXISTS visitors_phone_key;
DROP INDEX IF EXISTS visitors_phone_key;

-- Unique per meeting, ignoring rows without a phone (multiple NULLs allowed).
CREATE UNIQUE INDEX IF NOT EXISTS visitors_meeting_phone_key
  ON visitors (meeting_id, phone)
  WHERE phone IS NOT NULL AND meeting_id IS NOT NULL;

COMMENT ON INDEX visitors_meeting_phone_key IS 'A WA number is unique within a meeting, but the same visitor may recur across meetings (visit history).';
