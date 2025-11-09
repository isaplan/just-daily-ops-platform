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
 */
export async function getEnvIdsForLocation(locationId: string): Promise<number[]> {
  const supabase = createClient();

  const { data: locs } = await supabase
    .from("locations")
    .select("id, name")
    .eq("id", locationId)
    .limit(1);

  const locationName = locs?.[0]?.name?.toLowerCase();
  if (!locationName) return [];

  const { data: envs, error } = await supabase
    .from("eitje_environments")
    .select("eitje_id, raw_data");

  if (error) return [];

  return (envs || [])
    .filter((e: any) => (e.raw_data?.name || "").toLowerCase() === locationName)
    .map((e: any) => e.eitje_id)
    .filter((id: any) => id != null);
}



