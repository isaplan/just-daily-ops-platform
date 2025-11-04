-- ========================================
-- UNIFIED USERS AND TEAMS SYSTEM
-- ========================================
-- This migration creates unified user and team tables that bind
-- all different external user/team IDs (Eitje, Bork, etc.) to single UUIDs
-- and links them to locations

-- ========================================
-- 1. UNIFIED USERS TABLE
-- ========================================
-- Canonical user record - one UUID per actual person
CREATE TABLE IF NOT EXISTS unified_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Common user information
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  employee_number TEXT,
  hire_date DATE,
  is_active BOOLEAN DEFAULT true,
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========================================
-- 2. USER SYSTEM MAPPINGS TABLE
-- ========================================
-- Maps external system IDs (Eitje, Bork, etc.) to unified user UUID
CREATE TABLE IF NOT EXISTS user_system_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unified_user_id UUID NOT NULL REFERENCES unified_users(id) ON DELETE CASCADE,
  -- External system information
  system_name TEXT NOT NULL, -- 'eitje', 'bork', 'internal', etc.
  external_id TEXT NOT NULL, -- The ID from the external system (eitje_id, bork_id, etc.)
  -- Additional metadata
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure one mapping per system+external_id combination
  UNIQUE(system_name, external_id)
);

-- ========================================
-- 3. USER LOCATIONS TABLE
-- ========================================
-- Many-to-many relationship: users can work at multiple locations
CREATE TABLE IF NOT EXISTS user_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unified_user_id UUID NOT NULL REFERENCES unified_users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  -- Role/position at this location
  role TEXT, -- 'manager', 'employee', 'admin', etc.
  start_date DATE,
  end_date DATE, -- NULL if still active
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(unified_user_id, location_id)
);

-- ========================================
-- 4. UNIFIED TEAMS TABLE
-- ========================================
-- Canonical team record - one UUID per actual team
CREATE TABLE IF NOT EXISTS unified_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Common team information
  name TEXT NOT NULL,
  description TEXT,
  team_type TEXT, -- 'kitchen', 'service', 'management', etc.
  is_active BOOLEAN DEFAULT true,
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========================================
-- 5. TEAM SYSTEM MAPPINGS TABLE
-- ========================================
-- Maps external system IDs (Eitje, Bork, etc.) to unified team UUID
CREATE TABLE IF NOT EXISTS team_system_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unified_team_id UUID NOT NULL REFERENCES unified_teams(id) ON DELETE CASCADE,
  -- External system information
  system_name TEXT NOT NULL, -- 'eitje', 'bork', 'internal', etc.
  external_id TEXT NOT NULL, -- The ID from the external system (eitje_id, bork_id, etc.)
  -- Additional metadata
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure one mapping per system+external_id combination
  UNIQUE(system_name, external_id)
);

-- ========================================
-- 6. TEAM LOCATIONS TABLE
-- ========================================
-- Many-to-many relationship: teams can exist at multiple locations
CREATE TABLE IF NOT EXISTS team_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unified_team_id UUID NOT NULL REFERENCES unified_teams(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  -- Team-specific info at this location
  start_date DATE,
  end_date DATE, -- NULL if still active
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(unified_team_id, location_id)
);

-- ========================================
-- 7. TEAM MEMBERS TABLE
-- ========================================
-- Many-to-many relationship: users can be in multiple teams
CREATE TABLE IF NOT EXISTS team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unified_user_id UUID NOT NULL REFERENCES unified_users(id) ON DELETE CASCADE,
  unified_team_id UUID NOT NULL REFERENCES unified_teams(id) ON DELETE CASCADE,
  -- Role in this team
  role TEXT, -- 'member', 'leader', 'coordinator', etc.
  start_date DATE,
  end_date DATE, -- NULL if still active
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(unified_user_id, unified_team_id)
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_user_system_mappings_unified_user_id ON user_system_mappings(unified_user_id);
CREATE INDEX IF NOT EXISTS idx_user_system_mappings_system_external ON user_system_mappings(system_name, external_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(unified_user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_location_id ON user_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_active ON user_locations(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_team_system_mappings_unified_team_id ON team_system_mappings(unified_team_id);
CREATE INDEX IF NOT EXISTS idx_team_system_mappings_system_external ON team_system_mappings(system_name, external_id);
CREATE INDEX IF NOT EXISTS idx_team_locations_team_id ON team_locations(unified_team_id);
CREATE INDEX IF NOT EXISTS idx_team_locations_location_id ON team_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_team_locations_active ON team_locations(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(unified_user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(unified_team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_unified_users_email ON unified_users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unified_users_active ON unified_users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_unified_teams_active ON unified_teams(is_active) WHERE is_active = true;

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================
CREATE TRIGGER update_unified_users_updated_at
  BEFORE UPDATE ON unified_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_system_mappings_updated_at
  BEFORE UPDATE ON user_system_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_locations_updated_at
  BEFORE UPDATE ON user_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unified_teams_updated_at
  BEFORE UPDATE ON unified_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_system_mappings_updated_at
  BEFORE UPDATE ON team_system_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_locations_updated_at
  BEFORE UPDATE ON team_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- RLS POLICIES
-- ========================================
-- Enable RLS on all tables
ALTER TABLE unified_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_system_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_system_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Policies for unified_users
CREATE POLICY "Anyone can view unified users"
  ON unified_users FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert unified users"
  ON unified_users FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update unified users"
  ON unified_users FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete unified users"
  ON unified_users FOR DELETE
  USING (auth.role() = 'authenticated');

-- Policies for user_system_mappings
CREATE POLICY "Anyone can view user system mappings"
  ON user_system_mappings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage user system mappings"
  ON user_system_mappings FOR ALL
  USING (auth.role() = 'authenticated');

-- Policies for user_locations
CREATE POLICY "Anyone can view user locations"
  ON user_locations FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage user locations"
  ON user_locations FOR ALL
  USING (auth.role() = 'authenticated');

-- Policies for unified_teams
CREATE POLICY "Anyone can view unified teams"
  ON unified_teams FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert unified teams"
  ON unified_teams FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update unified teams"
  ON unified_teams FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete unified teams"
  ON unified_teams FOR DELETE
  USING (auth.role() = 'authenticated');

-- Policies for team_system_mappings
CREATE POLICY "Anyone can view team system mappings"
  ON team_system_mappings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage team system mappings"
  ON team_system_mappings FOR ALL
  USING (auth.role() = 'authenticated');

-- Policies for team_locations
CREATE POLICY "Anyone can view team locations"
  ON team_locations FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage team locations"
  ON team_locations FOR ALL
  USING (auth.role() = 'authenticated');

-- Policies for team_members
CREATE POLICY "Anyone can view team members"
  ON team_members FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage team members"
  ON team_members FOR ALL
  USING (auth.role() = 'authenticated');

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to get unified user ID from external system ID
CREATE OR REPLACE FUNCTION get_unified_user_id(
  p_system_name TEXT,
  p_external_id TEXT
) RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT unified_user_id
    FROM user_system_mappings
    WHERE system_name = p_system_name
      AND external_id = p_external_id::TEXT
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get unified team ID from external system ID
CREATE OR REPLACE FUNCTION get_unified_team_id(
  p_system_name TEXT,
  p_external_id TEXT
) RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT unified_team_id
    FROM team_system_mappings
    WHERE system_name = p_system_name
      AND external_id = p_external_id::TEXT
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE unified_users IS 'Canonical user records - one UUID per actual person';
COMMENT ON TABLE user_system_mappings IS 'Maps external system user IDs (Eitje, Bork, etc.) to unified user UUIDs';
COMMENT ON TABLE user_locations IS 'Many-to-many relationship: users can work at multiple locations';
COMMENT ON TABLE unified_teams IS 'Canonical team records - one UUID per actual team';
COMMENT ON TABLE team_system_mappings IS 'Maps external system team IDs (Eitje, Bork, etc.) to unified team UUIDs';
COMMENT ON TABLE team_locations IS 'Many-to-many relationship: teams can exist at multiple locations';
COMMENT ON TABLE team_members IS 'Many-to-many relationship: users can be in multiple teams';


