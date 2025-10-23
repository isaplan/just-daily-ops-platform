-- Create queue table for managing backfill chunks
CREATE TABLE public.eitje_backfill_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_id UUID NOT NULL REFERENCES public.eitje_backfill_progress(id) ON DELETE CASCADE,
  chunk_start DATE NOT NULL,
  chunk_end DATE NOT NULL,
  endpoints TEXT[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempt INTEGER NOT NULL DEFAULT 0,
  next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX idx_queue_progress_id ON public.eitje_backfill_queue(progress_id);
CREATE INDEX idx_queue_status_next_run_at ON public.eitje_backfill_queue(status, next_run_at);

-- Add trigger for auto-updating updated_at
CREATE TRIGGER update_eitje_backfill_queue_updated_at
  BEFORE UPDATE ON public.eitje_backfill_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.eitje_backfill_queue ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view queue (for UI display if needed)
CREATE POLICY "Authenticated users can view queue"
  ON public.eitje_backfill_queue
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- System can manage queue (edge functions use service role)
CREATE POLICY "System can manage queue"
  ON public.eitje_backfill_queue
  FOR ALL
  USING (auth.uid() IS NOT NULL);