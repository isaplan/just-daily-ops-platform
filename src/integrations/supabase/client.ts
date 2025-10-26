import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('❌ Missing Supabase environment variables:', {
    url: SUPABASE_URL,
    key: SUPABASE_PUBLISHABLE_KEY ? 'Present' : 'Missing'
  });
}

// Singleton pattern to prevent multiple client instances
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(
      SUPABASE_URL!,
      SUPABASE_PUBLISHABLE_KEY!
    );
  }
  return supabaseClient;
}

// Export the singleton client instance
export const supabase = createClient();
