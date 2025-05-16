"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function startSession() {
  const supabase = createServerSupabaseClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Create a new therapy session
  const { data: session, error } = await supabase
    .from("therapy_sessions")
    .insert({
      user_id: user.id,
      title: `Session on ${new Date().toLocaleDateString()}`,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating session:", error)
    throw new Error("Failed to create therapy session")
  }

  return {
    id: session.id,
    startTime: session.started_at,
  }
}

export async function endSession(sessionId: string, summary: string, overallMood: string) {
  const supabase = createServerSupabaseClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Update the session with end time and summary
  const { error } = await supabase
    .from("therapy_sessions")
    .update({
      ended_at: new Date().toISOString(),
      summary,
      overall_mood: overallMood,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", user.id)

  if (error) {
    console.error("Error ending session:", error)
    throw new Error("Failed to end therapy session")
  }

  revalidatePath("/dashboard")
  return { success: true }
}

export async function saveMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  emotion?: string,
  confidence?: number,
) {
  const supabase = createServerSupabaseClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("User not authenticated")
  }

  // Verify the session belongs to the user
  const { data: session } = await supabase
    .from("therapy_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single()

  if (!session) {
    throw new Error("Session not found or not owned by user")
  }

  // Save the message
  const { data, error } = await supabase
    .from("messages")
    .insert({
      session_id: sessionId,
      role,
      content,
      detected_emotion: emotion,
      emotion_confidence: confidence,
    })
    .select()
    .single()

  if (error) {
    console.error("Error saving message:", error)
    throw new Error("Failed to save message")
  }

  return data
}

export async function saveEmotionData(
  sessionId: string,
  primaryEmotion: string,
  emotionValues: { happy: number; sad: number; angry: number; anxious: number; neutral: number },
  source: "facial" | "voice" | "text" | "combined",
) {
  const supabase = createServerSupabaseClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("User not authenticated")
  }

  // Verify the session belongs to the user
  const { data: session } = await supabase
    .from("therapy_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single()

  if (!session) {
    throw new Error("Session not found or not owned by user")
  }

  // Save the emotion data
  const { data, error } = await supabase
    .from("emotion_data")
    .insert({
      session_id: sessionId,
      primary_emotion: primaryEmotion,
      happy: emotionValues.happy,
      sad: emotionValues.sad,
      angry: emotionValues.angry,
      anxious: emotionValues.anxious,
      neutral: emotionValues.neutral,
      source,
    })
    .select()
    .single()

  if (error) {
    console.error("Error saving emotion data:", error)
    throw new Error("Failed to save emotion data")
  }

  return data
}

export async function getUserSessions() {
  const supabase = createServerSupabaseClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get all sessions for the user
  const { data, error } = await supabase
    .from("therapy_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })

  if (error) {
    console.error("Error fetching sessions:", error)
    throw new Error("Failed to fetch therapy sessions")
  }

  return data
}

export async function getSessionMessages(sessionId: string) {
  const supabase = createServerSupabaseClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Verify the session belongs to the user
  const { data: session } = await supabase
    .from("therapy_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single()

  if (!session) {
    throw new Error("Session not found or not owned by user")
  }

  // Get all messages for the session
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching messages:", error)
    throw new Error("Failed to fetch session messages")
  }

  return data
}

export async function getSessionEmotionData(sessionId: string) {
  const supabase = createServerSupabaseClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Verify the session belongs to the user
  const { data: session } = await supabase
    .from("therapy_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single()

  if (!session) {
    throw new Error("Session not found or not owned by user")
  }

  // Get all emotion data for the session
  const { data, error } = await supabase
    .from("emotion_data")
    .select("*")
    .eq("session_id", sessionId)
    .order("timestamp", { ascending: true })

  if (error) {
    console.error("Error fetching emotion data:", error)
    throw new Error("Failed to fetch session emotion data")
  }

  return data
}
