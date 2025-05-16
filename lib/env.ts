/**
 * Environment variables for the Serenity application
 * Provides type-safe access to environment variables
 */

// Environment variables interface
export interface Env {
  // Supabase
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string

  // Groq
  GROQ_API_KEY: string

  // ElevenLabs
  ELEVENLABS_API_KEY: string
  ELEVENLABS_VOICE_ID: string

  // Redis/KV
  KV_URL: string
  KV_REST_API_TOKEN: string
  KV_REST_API_READ_ONLY_TOKEN: string

  // Database
  POSTGRES_URL: string
  POSTGRES_PRISMA_URL: string
  POSTGRES_URL_NON_POOLING: string
  POSTGRES_USER: string
  POSTGRES_HOST: string
  POSTGRES_PASSWORD: string
  POSTGRES_DATABASE: string
}

// Helper function to get environment variables with type safety
function getEnvVariable(key: keyof Env): string {
  const value = process.env[key]

  if (!value) {
    // In development, warn about missing variables
    if (process.env.NODE_ENV === "development") {
      console.warn(`Missing environment variable: ${key}`)
    }
    return ""
  }

  return value
}

// Export environment variables
export const env: Env = {
  // Supabase
  SUPABASE_URL: getEnvVariable("SUPABASE_URL"),
  SUPABASE_ANON_KEY: getEnvVariable("SUPABASE_ANON_KEY"),
  NEXT_PUBLIC_SUPABASE_URL: getEnvVariable("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVariable("NEXT_PUBLIC_SUPABASE_ANON_KEY"),

  // Groq
  GROQ_API_KEY: getEnvVariable("GROQ_API_KEY"),

  // ElevenLabs
  ELEVENLABS_API_KEY: getEnvVariable("ELEVENLABS_API_KEY"),
  ELEVENLABS_VOICE_ID: getEnvVariable("ELEVENLABS_VOICE_ID"),

  // Redis/KV
  KV_URL: getEnvVariable("KV_URL"),
  KV_REST_API_TOKEN: getEnvVariable("KV_REST_API_TOKEN"),
  KV_REST_API_READ_ONLY_TOKEN: getEnvVariable("KV_REST_API_READ_ONLY_TOKEN"),

  // Database
  POSTGRES_URL: getEnvVariable("POSTGRES_URL"),
  POSTGRES_PRISMA_URL: getEnvVariable("POSTGRES_PRISMA_URL"),
  POSTGRES_URL_NON_POOLING: getEnvVariable("POSTGRES_URL_NON_POOLING"),
  POSTGRES_USER: getEnvVariable("POSTGRES_USER"),
  POSTGRES_HOST: getEnvVariable("POSTGRES_HOST"),
  POSTGRES_PASSWORD: getEnvVariable("POSTGRES_PASSWORD"),
  POSTGRES_DATABASE: getEnvVariable("POSTGRES_DATABASE"),
}
