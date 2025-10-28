ALTER TABLE organigramas DROP CONSTRAINT IF EXISTS organigramas_orden_key;

CREATE INDEX IF NOT EXISTS idx_organigramas_orden_active ON organigramas(orden) WHERE is_active = true;

