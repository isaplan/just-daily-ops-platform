-- Create package_usage_logs table
CREATE TABLE package_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_date TIMESTAMPTZ DEFAULT NOW(),
  scan_type TEXT NOT NULL CHECK (scan_type IN ('incremental', 'full')),
  files_scanned INTEGER NOT NULL DEFAULT 0,
  new_usages JSONB DEFAULT '{}',
  deprecated_usages JSONB DEFAULT '{}',
  orphaned_functions JSONB DEFAULT '{}',
  changes_detected INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('no_changes', 'pending_review', 'applied')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create package_migrations table
CREATE TABLE package_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT NOT NULL,
  from_package TEXT,
  to_package TEXT,
  affected_functions JSONB DEFAULT '[]',
  status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'completed', 'failed', 'rolled_back')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rollback_commit TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE package_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_migrations ENABLE ROW LEVEL SECURITY;

-- Create policies (read-only for authenticated users)
CREATE POLICY "Package usage logs are viewable by authenticated users"
ON package_usage_logs FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Package migrations are viewable by authenticated users"
ON package_migrations FOR SELECT
USING (auth.role() = 'authenticated');

-- Create indexes for performance
CREATE INDEX idx_package_usage_logs_scan_date ON package_usage_logs(scan_date DESC);
CREATE INDEX idx_package_migrations_plan_id ON package_migrations(plan_id);
CREATE INDEX idx_package_migrations_status ON package_migrations(status);