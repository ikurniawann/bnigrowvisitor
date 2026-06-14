-- Assign initial SaaS roles for the existing single-chapter installation.

DO $$
DECLARE
  v_org_id uuid;
  v_chapter_id uuid;
BEGIN
  SELECT id INTO v_org_id
  FROM organizations
  WHERE code = 'bni_indonesia'
  LIMIT 1;

  SELECT c.id INTO v_chapter_id
  FROM chapters c
  JOIN areas a ON a.id = c.area_id
  JOIN cities city ON city.id = a.city_id
  JOIN organizations org ON org.id = city.organization_id
  WHERE org.code = 'bni_indonesia'
    AND city.name = 'Jakarta'
    AND a.name = 'Jakarta Barat'
    AND c.name = 'BNI Grow'
  LIMIT 1;

  UPDATE users
  SET role = 'national_admin',
      organization_id = COALESCE(organization_id, v_org_id),
      chapter_id = COALESCE(chapter_id, v_chapter_id)
  WHERE email = 'admin@bnigrow.com';

  UPDATE users
  SET organization_id = COALESCE(organization_id, v_org_id),
      chapter_id = COALESCE(chapter_id, v_chapter_id)
  WHERE organization_id IS NULL
     OR chapter_id IS NULL;
END $$;
