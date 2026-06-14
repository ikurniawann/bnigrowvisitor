-- Add SaaS-aware user roles.
-- This is intentionally separated from role data updates because enum values
-- can be unsafe to use in the same transaction immediately after creation.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'national_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'chapter_admin';

COMMENT ON TYPE user_role IS
'admin=legacy national admin, national_admin=BNI Indonesia admin, chapter_admin=chapter admin, pic=chapter PIC, member=member account';
