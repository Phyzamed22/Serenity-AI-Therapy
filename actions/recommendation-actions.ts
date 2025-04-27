"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function saveRecommendation(recommendation: {
  type: string
  content: string
  emotion: string
  tags?: string[]
}) {
  const supabase = createServerSupabaseClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Save recommendation
  const { error } = await supabase.from("saved_recommendations").insert({
    user_id: user.id,
    type: recommendation.type,
    content: recommendation.content,
    emotion: recommendation.emotion,
    tags: recommendation.tags || [],
  })

  if (error) {
    console.error("Error saving recommendation:", error)
    throw new Error("Failed to save recommendation")
  }

  revalidatePath("/dashboard")
  return { success: true }
}

export async function getSavedRecommendations() {
  const supabase = createServerSupabaseClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get saved recommendations
  const { data, error } = await supabase
    .from("saved_recommendations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching saved recommendations:", error)
    throw new Error("Failed to fetch saved recommendations")
  }

  return data || []
}

export async function deleteSavedRecommendation(id: string) {
  const supabase = createServerSupabaseClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Delete recommendation
  const { error } = await supabase.from("saved_recommendations").delete().eq("id", id).eq("user_id", user.id)

  if (error) {
    console.error("Error deleting recommendation:", error)
    throw new Error("Failed to delete recommendation")
  }

  revalidatePath("/dashboard")
  return { success: true }
}
