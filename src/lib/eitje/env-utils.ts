import { createClient } from "@/integrations/supabase/client";

/**
 * Resolve Eitje environment IDs for a given location UUID by matching the
 * location's name against eitje_environments.raw_data.name. This avoids
 * depending on schema variants (e.g., missing location_id column) and
 * works across environments.
 */
export async function getEnvIdsForLocation(locationId: string): Promise<number[]> {
  const supabase = createClient();

  // Fetch location name by id
  const { data: locs, error: locErr } = await supabase
    .from("locations")
    .select("id, name")
    .eq("id", locationId)
    .limit(1);

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
    .filter((id: any) => id != null);
}


