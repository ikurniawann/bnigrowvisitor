-- Update gender based on visitor names
-- Run this script to auto-populate gender field

-- Step 1: Set default 'Laki-laki' for all NULL genders
UPDATE visitors 
SET gender = 'Laki-laki'
WHERE gender IS NULL OR gender = '';

-- Step 2: Update to 'Perempuan' for female names
UPDATE visitors 
SET gender = 'Perempuan'
WHERE (
  -- Common female name patterns
  LOWER(name) ~ '(wati|yani|ti|ah|nia|lia|sia|ra|da)$' OR
  LOWER(name) ~ '^(siti|sri|dewi|putri|indah|ratna|maya|rina|rini|ani|ana|yuni|yanti|harti|astuti|lestari|handayani|kurnia)' OR
  
  -- Specific female names from database
  LOWER(name) ~ '^(aurelia|agnes|anna|elisabeth|eva|febri|grace|irma|jennyke|ken|kezia|kiyoko|maria|mayawati|mella|meilita|natalia|nida|novi|renni|selviya|sindy|teti|frida|ayudya)' OR
  
  -- Additional common Indonesian female names
  LOWER(name) ~ '(chandra|linda|mira|siska|desi|rizky|fitri|eka|prima|dian|tanti|lili|susanti|wulandari)'
);

-- Step 3: Verify results
SELECT 
  gender,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
  STRING_AGG(LEFT(name, 25), ', ' ORDER BY name LIMIT 10) as sample_names
FROM visitors
GROUP BY gender
ORDER BY total DESC;

-- Step 4: Show sample of each gender
SELECT '=== LAKI-LAKI ===' as info;
SELECT name FROM visitors WHERE gender = 'Laki-laki' ORDER BY name LIMIT 10;

SELECT '=== PEREMPUAN ===' as info;
SELECT name FROM visitors WHERE gender = 'Perempuan' ORDER BY name LIMIT 10;
