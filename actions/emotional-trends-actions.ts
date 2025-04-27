"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function getEmotionalTrends(days = 30) {
  const supabase = createServerSupabaseClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Calculate the date range
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Get emotional trends
  const { data, error } = await supabase
    .from("emotional_trends")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", startDate.toISOString().split("T")[0])
    .lte("date", endDate.toISOString().split("T")[0])
    .order("date", { ascending: true })

  if (error) {
    console.error("Error fetching emotional trends:", error)
    throw new Error("Failed to fetch emotional trends")
  }

  return data || []
}

export async function recordEmotionalTrend(trend: {
  dominantEmotion: string
  emotionIntensity: number
  triggers?: string[]
  notes?: string
}) {
  const supabase = createServerSupabaseClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Validate emotion intensity is within the allowed range (1-10)
  const validatedIntensity = Math.min(Math.max(Math.round(trend.emotionIntensity), 1), 10)

  // Record emotional trend
  const { error } = await supabase.from("emotional_trends").insert({
    user_id: user.id,
    date: new Date().toISOString().split("T")[0],
    dominant_emotion: trend.dominantEmotion,
    emotion_intensity: validatedIntensity, // Use validated value
    triggers: trend.triggers || [],
    notes: trend.notes,
  })

  if (error) {
    console.error("Error recording emotional trend:", error)
    throw new Error("Failed to record emotional trend")
  }

  revalidatePath("/dashboard")
  return { success: true }
}
