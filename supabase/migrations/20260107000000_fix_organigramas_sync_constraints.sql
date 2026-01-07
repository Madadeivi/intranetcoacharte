ALTER TABLE organigramas DROP CONSTRAINT IF EXISTS organigramas_file_name_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organigramas_orden_key'
  ) THEN
    ALTER TABLE organigramas ADD CONSTRAINT organigramas_orden_key UNIQUE (orden);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_organigramas_orden_active ON organigramas(orden) WHERE is_active = true;


