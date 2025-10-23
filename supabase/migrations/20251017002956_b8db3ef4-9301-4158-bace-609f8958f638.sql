-- Add worker_interval_minutes to bork_sync_config
ALTER TABLE public.bork_sync_config 
ADD COLUMN IF NOT EXISTS worker_interval_minutes INTEGER DEFAULT 5 
CHECK (worker_interval_minutes IN (1, 5, 10, 15, 30, 60));

-- Create bork_backfill_progress table
CREATE TABLE IF NOT EXISTS public.bork_backfill_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_chunks INTEGER NOT NULL,
  completed_chunks INTEGER DEFAULT 0,
  current_chunk_start DATE,
  current_chunk_end DATE,
  records_fetched INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'pending',
  last_error TEXT
);

-- Enable RLS on bork_backfill_progress
ALTER TABLE public.bork_backfill_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for bork_backfill_progress
CREATE POLICY "Authenticated users can view backfill_progress"
ON public.bork_backfill_progress FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can manage backfill_progress"
ON public.bork_backfill_progress FOR ALL
TO authenticated
USING (true);

-- Create bork_backfill_queue table
CREATE TABLE IF NOT EXISTS public.bork_backfill_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_id UUID REFERENCES public.bork_backfill_progress(id) ON DELETE CASCADE,
  chunk_start DATE NOT NULL,
  chunk_end DATE NOT NULL,
  location_id UUID REFERENCES public.locations(id),
  status TEXT DEFAULT 'pending',
  next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  records_inserted INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on bork_backfill_queue
ALTER TABLE public.bork_backfill_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for bork_backfill_queue
CREATE POLICY "Authenticated users can view backfill_queue"
ON public.bork_backfill_queue FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can manage backfill_queue"
ON public.bork_backfill_queue FOR ALL
TO authenticated
USING (true);

-- Create function to update bork backfill cron job
CREATE OR REPLACE FUNCTION public.update_bork_backfill_cron(interval_minutes INTEGER)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $function$
DECLARE
  cron_schedule TEXT;
  cron_command TEXT;
BEGIN
  -- Unschedule any existing bork backfill worker jobs
  PERFORM cron.unschedule(jobname)
  FROM cron.job
  WHERE jobname LIKE 'bork-backfill-worker%';
  
  -- Build the cron schedule string
  cron_schedule := format('*/%s * * * *', interval_minutes);
  
  -- Build the command to execute
  cron_command := 'SELECT net.http_post(url:=''https://cajxmwyiwrhzryvawjkm.supabase.co/functions/v1/bork-backfill-worker'', headers:=''{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhanhtd3lpd3JoenJ5dmF3amttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzA3ODYsImV4cCI6MjA3NDc0Njc4Nn0.fxTY36IVlMiocfwx6R7DoViIOgq-U-EFxtbz9Y_3wsQ"}''::jsonb, body:=''{}''::jsonb) as request_id;';
  
  -- Schedule new job with updated interval
  PERFORM cron.schedule(
    'bork-backfill-worker',
    cron_schedule,
    cron_command
  );
END;
$function$;