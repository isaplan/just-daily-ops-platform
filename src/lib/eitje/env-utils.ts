<<<<<<< HEAD
/**
 * Eitje Environment Utilities
 * 
 * This module provides utility functions for managing and resolving Eitje environment IDs.
 * Eitje environments represent different business locations or entities in the Eitje system.
 */

import { createClient } from "@/integrations/supabase/client";

/**
 * Resolve Eitje environment IDs (external ids) for a given location UUID by
 * matching the location name to eitje_environments.raw_data.name
 * (case-insensitive). Uses `eitje_id` to avoid schema mismatch errors.
=======
import { createClient } from "@/integrations/supabase/client";

/**
 * Resolve Eitje environment IDs for a given location UUID by matching the
 * location's name against eitje_environments.raw_data.name. This avoids
 * depending on schema variants (e.g., missing location_id column) and
 * works across environments.
>>>>>>> eitje-data-views
 */
export async function getEnvIdsForLocation(locationId: string): Promise<number[]> {
  const supabase = createClient();

<<<<<<< HEAD
  const { data: locs } = await supabase
=======
  // Fetch location name by id
  const { data: locs, error: locErr } = await supabase
>>>>>>> eitje-data-views
    .from("locations")
    .select("id, name")
    .eq("id", locationId)
    .limit(1);

<<<<<<< HEAD
  const locationName = locs?.[0]?.name?.toLowerCase();
  if (!locationName) return [];

  const { data: envs, error } = await supabase
    .from("eitje_environments")
    .select("eitje_id, raw_data");

  if (error) return [];

  return (envs || [])
    .filter((e: any) => (e.raw_data?.name || "").toLowerCase() === locationName)
    .map((e: any) => e.eitje_id)
=======
  if (locErr || !locs?.[0]?.name) return [];
  const locationName = String(locs[0].name).toLowerCase();

  // Fetch all environments and match by raw_data.name
  const { data: envs, error: envErr } = await supabase
    .from("eitje_environments")
    .select("eitje_environment_id, raw_data");

  if (envErr) return [];

  return (envs || [])
    .filter((e: any) => (e.raw_data?.name || "").toLowerCase() === locationName)
    .map((e: any) => e.eitje_environment_id)
>>>>>>> eitje-data-views
    .filter((id: any) => id != null);
}


<<<<<<< HEAD

=======
>>>>>>> eitje-data-views
