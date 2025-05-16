import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "../database.types"
import { cache } from "react"

// Create a cached version of the Supabase client for server components
export const createClient = cache(() => {
  const cookieStore = cookies()

  return createServerClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: "", ...options })
      },
    },
  })
})

// Helper function to get the current user from the session
export async function getUser() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

// Helper function to check if the user is authenticated
export async function isAuthenticated() {
  const user = await getUser()
  return !!user
}

// Helper function to get the user's profile data
export async function getUserProfile() {
  const user = await getUser()

  if (!user) {
    return null
  }

  const supabase = createClient()
  const { data, error } = await supabase.from("user_profiles").select("*").eq("user_id", user.id).single()

  if (error) {
    console.error("Error fetching user profile:", error)
    return null
  }

  return data
}

// Helper function to get the user's therapy preferences
export async function getUserTherapyPreferences() {
  const user = await getUser()

  if (!user) {
    return null
  }

  const supabase = createClient()
  const { data, error } = await supabase.from("therapy_preferences").select("*").eq("user_id", user.id).single()

  if (error) {
    console.error("Error fetching therapy preferences:", error)
    return null
  }

  return data
}
