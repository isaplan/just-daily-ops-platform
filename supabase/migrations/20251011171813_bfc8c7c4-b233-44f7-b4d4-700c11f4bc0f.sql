-- Create import validation logs table for tracking schema and data errors
CREATE TABLE IF NOT EXISTS public.import_validation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID REFERENCES public.data_imports(id) ON DELETE CASCADE,
  validation_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('error', 'warning', 'info')),
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_validation_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view validation logs"
  ON public.import_validation_logs
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert validation logs"
  ON public.import_validation_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for faster queries
CREATE INDEX idx_validation_logs_import_id ON public.import_validation_logs(import_id);
CREATE INDEX idx_validation_logs_severity ON public.import_validation_logs(severity);