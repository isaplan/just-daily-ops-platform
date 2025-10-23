-- Clean up stuck PowerBI imports that have been processing for more than 5 minutes
UPDATE data_imports 
SET 
  status = 'failed',
  error_message = 'Processing interrupted - no records parsed. Please retry the upload.',
  completed_at = NOW()
WHERE 
  status = 'processing' 
  AND import_type = 'powerbi_pnl'
  AND processed_records = 0
  AND created_at < NOW() - INTERVAL '5 minutes';