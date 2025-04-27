// Environment variables helper

interface EnvVariables {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  GROQ_API_KEY: string
  ELEVENLABS_API_KEY: string
  ELEVENLABS_VOICE_ID: string
}

// Default values for development (these would be replaced by actual env vars in production)
const defaultValues: Partial<EnvVariables> = {
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || "",
  ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM", // Default voice ID (Rachel)
  // Add default values for Supabase (for development only)
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
}

export function getEnvVariable(key: keyof EnvVariables): string {
  // For client-side env vars
  if (key.startsWith("NEXT_PUBLIC_") && typeof window !== "undefined") {
    // Try to get from window.__ENV__ first (set during initialization)
    const windowEnv = (window as any).__ENV__?.[key]
    if (windowEnv) return windowEnv

    // Then try process.env (for Next.js)
    const processEnv = process.env[key]
    if (processEnv) return processEnv

    // Finally fall back to default values
    return defaultValues[key] || ""
  }

  // For server-side env vars
  return process.env[key] || defaultValues[key] || ""
}

// Helper to get all required env vars for a component
export function getRequiredEnvVars(keys: Array<keyof EnvVariables>): Partial<EnvVariables> {
  const vars: Partial<EnvVariables> = {}

  keys.forEach((key) => {
    vars[key] = getEnvVariable(key)
  })

  return vars
}

// Get ElevenLabs credentials
export function getElevenLabsCredentials(): { apiKey: string; voiceId: string } {
  return {
    apiKey: getEnvVariable("ELEVENLABS_API_KEY"),
    voiceId: getEnvVariable("ELEVENLABS_VOICE_ID"),
  }
}

// Initialize environment variables for client-side
export function initClientEnv(): void {
  if (typeof window !== "undefined") {
    ;(window as any).__ENV__ = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }
  }
}
