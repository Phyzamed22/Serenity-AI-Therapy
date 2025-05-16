"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function getTherapyPreferences() {
  const supabase = createServerSupabaseClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get therapy preferences
  const { data, error } = await supabase.from("therapy_preferences").select("*").eq("user_id", user.id).single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching therapy preferences:", error)
    throw new Error("Failed to fetch therapy preferences")
  }

  // If no preferences exist, create default preferences
  if (!data) {
    const defaultPreferences = {
      user_id: user.id,
      preferred_style: "balanced",
      communication_preference: "reflective",
      topics_to_avoid: [],
      helpful_approaches: [],
    }

    const { error: insertError } = await supabase.from("therapy_preferences").insert(defaultPreferences)

    if (insertError) {
      console.error("Error creating default therapy preferences:", insertError)
      throw new Error("Failed to create default therapy preferences")
    }

    return defaultPreferences
  }

  return data
}

export async function updateTherapyPreferences(preferences: {
  preferredStyle: string
  communicationPreference: string
  topicsToAvoid: string[]
  helpfulApproaches: string[]
}) {
  const supabase = createServerSupabaseClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Update therapy preferences
  const { error } = await supabase
    .from("therapy_preferences")
    .update({
      preferred_style: preferences.preferredStyle,
      communication_preference: preferences.communicationPreference,
      topics_to_avoid: preferences.topicsToAvoid,
      helpful_approaches: preferences.helpfulApproaches,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)

  if (error) {
    console.error("Error updating therapy preferences:", error)
    throw new Error("Failed to update therapy preferences")
  }

  revalidatePath("/dashboard")
  return { success: true }
}
