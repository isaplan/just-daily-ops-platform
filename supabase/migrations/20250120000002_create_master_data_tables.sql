-- Create master data tables for Bork API
CREATE TABLE bork_product_groups (
  id SERIAL PRIMARY KEY,
  location_id UUID REFERENCES locations(id),
  bork_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id, bork_id)
);

CREATE TABLE bork_payment_methods (
  id SERIAL PRIMARY KEY,
  location_id UUID REFERENCES locations(id),
  bork_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id, bork_id)
);

CREATE TABLE bork_cost_centers (
  id SERIAL PRIMARY KEY,
  location_id UUID REFERENCES locations(id),
  bork_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id, bork_id)
);

CREATE TABLE bork_users (
  id SERIAL PRIMARY KEY,
  location_id UUID REFERENCES locations(id),
  bork_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(100),
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id, bork_id)
);

-- Add indexes for performance
CREATE INDEX idx_bork_product_groups_location ON bork_product_groups(location_id);
CREATE INDEX idx_bork_payment_methods_location ON bork_payment_methods(location_id);
CREATE INDEX idx_bork_cost_centers_location ON bork_cost_centers(location_id);
CREATE INDEX idx_bork_users_location ON bork_users(location_id);

-- Add RLS policies
ALTER TABLE bork_product_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE bork_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE bork_cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bork_users ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to read master data" ON bork_product_groups
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert master data" ON bork_product_groups
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update master data" ON bork_product_groups
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete master data" ON bork_product_groups
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read master data" ON bork_payment_methods
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert master data" ON bork_payment_methods
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update master data" ON bork_payment_methods
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete master data" ON bork_payment_methods
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read master data" ON bork_cost_centers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert master data" ON bork_cost_centers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update master data" ON bork_cost_centers
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete master data" ON bork_cost_centers
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read master data" ON bork_users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert master data" ON bork_users
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update master data" ON bork_users
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete master data" ON bork_users
  FOR DELETE USING (auth.role() = 'authenticated');

