ALTER TABLE users
ADD COLUMN IF NOT EXISTS business_classification varchar(150);

COMMENT ON COLUMN users.business_classification IS 'Klasifikasi bisnis PIC untuk placeholder {pic_bisnis} pada template WhatsApp';
