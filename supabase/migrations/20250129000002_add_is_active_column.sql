ALTER TABLE organigramas ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organigramas_file_name_key'
  ) THEN
    ALTER TABLE organigramas ADD CONSTRAINT organigramas_file_name_key UNIQUE (file_name);
  END IF;
END $$;

UPDATE organigramas SET is_active = TRUE WHERE is_active IS NULL;

