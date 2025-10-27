-- Add missing RLS policies for master data tables
-- This migration adds INSERT, UPDATE, and DELETE policies

-- Product Groups policies
CREATE POLICY "Allow authenticated users to insert master data" ON bork_product_groups
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update master data" ON bork_product_groups
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete master data" ON bork_product_groups
  FOR DELETE USING (auth.role() = 'authenticated');

-- Payment Methods policies
CREATE POLICY "Allow authenticated users to insert master data" ON bork_payment_methods
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update master data" ON bork_payment_methods
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete master data" ON bork_payment_methods
  FOR DELETE USING (auth.role() = 'authenticated');

-- Cost Centers policies
CREATE POLICY "Allow authenticated users to insert master data" ON bork_cost_centers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update master data" ON bork_cost_centers
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete master data" ON bork_cost_centers
  FOR DELETE USING (auth.role() = 'authenticated');

-- Users policies
CREATE POLICY "Allow authenticated users to insert master data" ON bork_users
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update master data" ON bork_users
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete master data" ON bork_users
  FOR DELETE USING (auth.role() = 'authenticated');
