-- Update gender based on name patterns
-- This script auto-detects gender from visitor names

-- First, set default for all existing records
UPDATE visitors 
SET gender = 'Laki-laki'
WHERE gender IS NULL;

-- Update to Perempuan for common female name patterns
UPDATE visitors 
SET gender = 'Perempuan'
WHERE LOWER(name) LIKE '%a%' 
  AND (
    -- Common female endings in Indonesian names
    LOWER(name) LIKE '%wati%' OR
    LOWER(name) LIKE '%yani%' OR
    LOWER(name) LIKE '%ti%' OR
    LOWER(name) LIKE '%ah%' OR
    LOWER(name) LIKE '%ah %' OR
    LOWER(name) LIKE '%nia%' OR
    LOWER(name) LIKE '%lia%' OR
    LOWER(name) LIKE '%sia%' OR
    LOWER(name) LIKE '%ra%' OR
    LOWER(name) LIKE '%da%' OR
    -- Common female first names
    LOWER(name) LIKE 'siti%' OR
    LOWER(name) LIKE 'sri%' OR
    LOWER(name) LIKE 'dewi%' OR
    LOWER(name) LIKE 'putri%' OR
    LOWER(name) LIKE 'indah%' OR
    LOWER(name) LIKE 'ratna%' OR
    LOWER(name) LIKE 'maya%' OR
    LOWER(name) LIKE 'rina%' OR
    LOWER(name) LIKE 'rini%' OR
    LOWER(name) LIKE 'ani%' OR
    LOWER(name) LIKE 'ana%' OR
    LOWER(name) LIKE 'yuni%' OR
    LOWER(name) LIKE 'yanti%' OR
    LOWER(name) LIKE 'harti%' OR
    LOWER(name) LIKE 'astuti%' OR
    LOWER(name) LIKE 'lestari%' OR
    LOWER(name) LIKE 'handayani%' OR
    LOWER(name) LIKE 'kurnia%' OR
    LOWER(name) LIKE 'persada%' OR
    -- Specific female names from the database
    LOWER(name) LIKE 'aurelia%' OR
    LOWER(name) LIKE 'agnes%' OR
    LOWER(name) LIKE 'anna%' OR
    LOWER(name) LIKE 'elisabeth%' OR
    LOWER(name) LIKE 'eva%' OR
    LOWER(name) LIKE 'febri%' OR
    LOWER(name) LIKE 'grace%' OR
    LOWER(name) LIKE 'irma%' OR
    LOWER(name) LIKE 'jennyke%' OR
    LOWER(name) LIKE 'ken%' OR
    LOWER(name) LIKE 'kezia%' OR
    LOWER(name) LIKE 'kiyoko%' OR
    LOWER(name) LIKE 'lie%' OR
    LOWER(name) LIKE 'lurus%' OR
    LOWER(name) LIKE 'maria%' OR
    LOWER(name) LIKE 'mayawati%' OR
    LOWER(name) LIKE 'mella%' OR
    LOWER(name) LIKE 'meilita%' OR
    LOWER(name) LIKE 'natalia%' OR
    LOWER(name) LIKE 'nida%' OR
    LOWER(name) LIKE 'novi%' OR
    LOWER(name) LIKE 'renni%' OR
    LOWER(name) LIKE 'selviya%' OR
    LOWER(name) LIKE 'sindy%' OR
    LOWER(name) LIKE 'siti%' OR
    LOWER(name) LIKE 'teti%' OR
    LOWER(name) LIKE 'frida%' OR
    LOWER(name) LIKE 'dw%' OR
    LOWER(name) LIKE 'ayudya%'
  );

-- Verify the update
SELECT 
  gender,
  COUNT(*) as count,
  ARRAY_AGG(DISTINCT LEFT(name, 20)) as sample_names
FROM visitors
GROUP BY gender
ORDER BY count DESC;
