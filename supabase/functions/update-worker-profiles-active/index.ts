// =====================================================
// Update Worker Profiles Active Status
// =====================================================
// Weekly cronjob to update is_active column for all worker_profiles
// Based on effective_from and effective_to dates

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[update-worker-profiles-active] Starting update...");

    // Call the SQL function to update is_active for all records
    const { data, error } = await supabase.rpc("update_worker_profiles_is_active");

    if (error) {
      console.error("[update-worker-profiles-active] Error:", error);
      throw error;
    }

    const updatedCount = data || 0;

    console.log(`[update-worker-profiles-active] Successfully updated ${updatedCount} records`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated ${updatedCount} worker profiles`,
        updatedCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[update-worker-profiles-active] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to update worker profiles",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

