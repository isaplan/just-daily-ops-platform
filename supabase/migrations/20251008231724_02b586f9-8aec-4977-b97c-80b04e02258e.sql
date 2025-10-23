-- Drop the old check constraint
ALTER TABLE data_imports DROP CONSTRAINT IF EXISTS data_imports_import_type_check;

-- Add new check constraint with Eitje import types included
ALTER TABLE data_imports ADD CONSTRAINT data_imports_import_type_check 
  CHECK (import_type IN ('bork_sales', 'eitje_productivity', 'eitje_labor', 'powerbi_pnl'));