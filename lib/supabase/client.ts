import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/database.types"
import { getEnvVariable } from "@/lib/env"

let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClientSupabaseClient() {
  if (supabaseClient === null) {
    // Get environment variables using our helper function
    const supabaseUrl = getEnvVariable("NEXT_PUBLIC_SUPABASE_URL")
    const supabaseAnonKey = getEnvVariable("NEXT_PUBLIC_SUPABASE_ANON_KEY")

    // Check if the environment variables are available
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase URL or Anon Key is missing. Please check your environment variables.")
      // Return a dummy client that won't cause runtime errors but won't work either
      // This prevents the app from crashing but will show appropriate UI feedback
      return {
        auth: {
          getUser: () =>
            Promise.resolve({ data: { user: null }, error: new Error("Supabase client not properly initialized") }),
          getSession: () =>
            Promise.resolve({ data: { session: null }, error: new Error("Supabase client not properly initialized") }),
          signOut: () => Promise.resolve({ error: new Error("Supabase client not properly initialized") }),
        },
        from: () => ({
          select: () => Promise.resolve({ data: null, error: new Error("Supabase client not properly initialized") }),
        }),
      } as any
    }

    // Create the client with the available environment variables
    supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  }

  return supabaseClient
}
