ALTER TABLE spk ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS spk_updated_at_trigger ON spk;
CREATE TRIGGER spk_updated_at_trigger
  BEFORE UPDATE ON spk
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();