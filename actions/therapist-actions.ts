"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getTherapistRAG } from "@/lib/rag/therapist-rag"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

export async function getTherapistSettings() {
  const supabase = createServerSupabaseClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get therapist settings
  const { data, error } = await supabase.from("therapist_settings").select("*").eq("user_id", user.id)

  if (error) {
    console.error("Error fetching therapist settings:", error)
    throw new Error("Failed to fetch therapist settings")
  }

  // If no settings exist, create default settings
  if (data.length === 0) {
    const defaultSettings = {
      user_id: user.id,
      humor_level: 5,
      seriousness_level: 5,
      emotional_expressiveness: 5,
      empathy_level: 8,
      directiveness: 5,
      preferred_model: "llama3-70b-8192",
    }

    const { error: insertError } = await supabase.from("therapist_settings").insert(defaultSettings)

    if (insertError) {
      console.error("Error creating default therapist settings:", insertError)
      throw new Error("Failed to create default therapist settings")
    }

    return {
      humorLevel: defaultSettings.humor_level,
      seriousnessLevel: defaultSettings.seriousness_level,
      emotionalExpressiveness: defaultSettings.emotional_expressiveness,
      empathyLevel: defaultSettings.empathy_level,
      directiveness: defaultSettings.directiveness,
      preferredModel: defaultSettings.preferred_model,
    }
  }

  // Return the first row if multiple exist (shouldn't happen due to primary key constraint)
  const settings = data[0]
  return {
    humorLevel: settings.humor_level,
    seriousnessLevel: settings.seriousness_level,
    emotionalExpressiveness: settings.emotional_expressiveness,
    empathyLevel: settings.empathy_level,
    directiveness: settings.directiveness,
    preferredModel: settings.preferred_model,
  }
}

export async function updateTherapistSettings(settings: {
  humorLevel: number
  seriousnessLevel: number
  emotionalExpressiveness: number
  empathyLevel: number
  directiveness: number
  preferredModel: string
}) {
  const supabase = createServerSupabaseClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Update therapist settings
  const { error } = await supabase
    .from("therapist_settings")
    .update({
      humor_level: settings.humorLevel,
      seriousness_level: settings.seriousnessLevel,
      emotional_expressiveness: settings.emotionalExpressiveness,
      empathy_level: settings.empathyLevel,
      directiveness: settings.directiveness,
      preferred_model: settings.preferredModel,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)

  if (error) {
    console.error("Error updating therapist settings:", error)
    throw new Error("Failed to update therapist settings")
  }

  revalidatePath("/dashboard")
  return { success: true }
}

export async function getSessionMemory(sessionId: string) {
  const supabase = createServerSupabaseClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get session memory
  const { data, error } = await supabase
    .from("session_memory")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .single()

  if (error && error.code !== "PGRST116") {
    // PGRST116 is "no rows returned" error, which is expected if no memory exists yet
    console.error("Error fetching session memory:", error)
    throw new Error("Failed to fetch session memory")
  }

  return data || null
}

export async function updateSessionMemory(
  sessionId: string,
  memory: {
    summary?: string
    keyInsights?: any[]
    emotionalJourney?: {
      startEmotion: string
      endEmotion: string
      significantShifts: Array<{
        from: string
        to: string
        messageIndex: number
      }>
    }
    therapyInsights?: any
    identifiedPatterns?: any
    copingStrategies?: any
  },
) {
  const supabase = createServerSupabaseClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Check if memory already exists
  const { data: existingMemory } = await supabase
    .from("session_memory")
    .select("session_id")
    .eq("session_id", sessionId)
    .single()

  if (existingMemory) {
    // Update existing memory
    const { error } = await supabase
      .from("session_memory")
      .update({
        summary: memory.summary,
        key_insights: memory.keyInsights,
        emotional_journey: memory.emotionalJourney,
        therapy_insights: memory.therapyInsights,
        identified_patterns: memory.identifiedPatterns,
        coping_strategies: memory.copingStrategies,
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error updating session memory:", error)
      throw new Error("Failed to update session memory")
    }
  } else {
    // Create new memory
    const { error } = await supabase.from("session_memory").insert({
      session_id: sessionId,
      user_id: user.id,
      summary: memory.summary,
      key_insights: memory.keyInsights,
      emotional_journey: memory.emotionalJourney,
      therapy_insights: memory.therapyInsights,
      identified_patterns: memory.identifiedPatterns,
      coping_strategies: memory.copingStrategies,
    })

    if (error) {
      console.error("Error creating session memory:", error)
      throw new Error("Failed to create session memory")
    }
  }

  return { success: true }
}

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

  // Record emotional trend
  const { error } = await supabase.from("emotional_trends").insert({
    user_id: user.id,
    date: new Date().toISOString().split("T")[0],
    dominant_emotion: trend.dominantEmotion,
    emotion_intensity: trend.emotionIntensity,
    triggers: trend.triggers || [],
    notes: trend.notes,
  })

  if (error) {
    console.error("Error recording emotional trend:", error)
    throw new Error("Failed to record emotional trend")
  }

  return { success: true }
}

export async function generateAIResponse(
  sessionId: string,
  messages: Array<{ role: string; content: string }>,
  currentEmotion: string,
): Promise<string> {
  try {
    console.log("Generating AI response with RAG and Groq...")

    // Initialize the RAG system
    const therapistRAG = getTherapistRAG()
    await therapistRAG.initialize()

    const supabase = createServerSupabaseClient()

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    // Get therapist settings
    const { data: settingsData } = await supabase.from("therapist_settings").select("*").eq("user_id", user.id)

    if (!settingsData || settingsData.length === 0) {
      throw new Error("Therapist settings not found")
    }

    const settings = settingsData[0]

    // Get therapy preferences
    const { data: preferencesData } = await supabase
      .from("therapy_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single()

    // Get session memory
    const { data: sessionMemory } = await supabase
      .from("session_memory")
      .select("*")
      .eq("session_id", sessionId)
      .single()

    // Format messages for the AI
    const formattedMessages = messages.map((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    }))

    // Get the last user message
    const lastUserMessage = messages.filter((msg) => msg.role === "user").pop()?.content || ""

    // Prepare emotion data and context
    const emotionData: any = {
      facialEmotion: currentEmotion,
    }

    // Add session context if available
    if (sessionMemory) {
      let contextInfo = ""

      if (sessionMemory.summary) {
        contextInfo += `Previous summary: ${sessionMemory.summary}. `
      }

      if (sessionMemory.emotional_journey) {
        const journey = sessionMemory.emotional_journey as any
        if (journey.startEmotion && journey.endEmotion) {
          contextInfo += `Emotional journey: Started ${journey.startEmotion}, ended ${journey.endEmotion}. `
        }
      }

      if (contextInfo) {
        emotionData.sessionContext = contextInfo
      }
    }

    // Add user preferences if available
    if (preferencesData) {
      emotionData.preferredStyle = preferencesData.preferred_style
    }

    // Generate response using RAG
    const response = await therapistRAG.generateResponse(lastUserMessage, formattedMessages, {
      facialEmotion: currentEmotion,
      textSentiment: emotionData.textSentiment,
      sessionContext: emotionData.sessionContext,
      preferredStyle: emotionData.preferredStyle,
    })

    // If RAG fails, fall back to direct Groq API call
    if (!response || response.trim().length === 0) {
      console.log("RAG response empty, falling back to direct Groq API call")

      // Convert personality traits to descriptive terms
      const humorDescription = getHumorDescription(settings.humor_level)
      const seriousnessDescription = getSeriousnessDescription(settings.seriousness_level)
      const emotionalDescription = getEmotionalDescription(settings.emotional_expressiveness)
      const empathyDescription = getEmpathyDescription(settings.empathy_level)
      const directivenessDescription = getDirectivenessDescription(settings.directiveness)

      // Create enhanced system prompt based on personality settings and trauma-informed approach
      const systemPrompt = `You are Serenity, an emotionally intelligent, trauma-informed virtual therapist with the following personality traits:
- Humor: ${humorDescription} (${settings.humor_level}/10)
- Seriousness: ${seriousnessDescription} (${settings.seriousness_level}/10)
- Emotional Expressiveness: ${emotionalDescription} (${settings.emotional_expressiveness}/10)
- Empathy: ${empathyDescription} (${settings.empathy_level}/10)
- Directiveness: ${directivenessDescription} (${settings.directiveness}/10)

Your role is to deeply understand the user's emotions, thoughts, and mental health challenges through conversation. You speak in a calming, compassionate, and reassuring tone.

You never make a medical diagnosis or suggest medications. Instead, you use evidence-based methods such as Cognitive Behavioral Therapy (CBT), trauma-informed care, and reflective listening.

If a user expresses signs of distress, trauma, depression, or self-harm, respond with empathy and encourage seeking professional help. Always keep the user grounded in the present moment and validated.

Structure your responses with:
- Validate: Acknowledge their feelings
- Reflect: Mirror their emotional experience
- Explore: Ask a thoughtful question to deepen understanding
- Support: Offer a supportive statement that reinforces their worth

Keep your responses concise (2-4 sentences per section) unless the situation calls for more detailed explanation.
Do not disclose that you are an AI or mention your programming - stay in character as a therapist named Serenity.`

      // Format user message with emotion metadata
      let enhancedUserMessage = lastUserMessage
      if (currentEmotion) {
        enhancedUserMessage = `[User Emotion: facial: ${currentEmotion}]\n${lastUserMessage}`
      }

      // Add session context if available
      if (emotionData.sessionContext) {
        enhancedUserMessage = `[Context: ${emotionData.sessionContext}]\n${enhancedUserMessage}`
      }

      // Add preferred style if available
      if (emotionData.preferredStyle) {
        enhancedUserMessage = `[User Prefers: ${emotionData.preferredStyle}]\n${enhancedUserMessage}`
      }

      // Update the last user message with enhanced content
      const directMessages = formattedMessages.map((msg) => {
        if (msg.role === "user" && formattedMessages.indexOf(msg) === formattedMessages.length - 1) {
          return { role: "user", content: enhancedUserMessage }
        }
        return msg
      })

      // Add system prompt
      directMessages.unshift({ role: "system", content: systemPrompt })

      // Generate response using Groq
      const { text } = await generateText({
        model: groq(settings.preferred_model || "llama3-70b-8192"),
        messages: directMessages,
        temperature: 0.7,
        maxTokens: 800,
      })

      return postProcessResponse(text)
    }

    return response
  } catch (error) {
    console.error("Error generating AI response:", error)

    // Return a fallback response that's more helpful than the generic one
    return "I'm here to listen and support you. It seems I'm having a bit of trouble processing right now. Could you share more about what's on your mind, or perhaps rephrase that? I want to make sure I understand you correctly."
  }
}

// Helper functions for personality descriptions
function getHumorDescription(level: number): string {
  if (level <= 2) return "Very serious, rarely uses humor"
  if (level <= 4) return "Occasionally uses gentle humor when appropriate"
  if (level <= 6) return "Moderate use of humor to build rapport"
  if (level <= 8) return "Frequently uses humor to lighten the mood"
  return "Very humorous, often uses wit and levity"
}

function getSeriousnessDescription(level: number): string {
  if (level <= 2) return "Very casual and conversational"
  if (level <= 4) return "Relatively informal but thoughtful"
  if (level <= 6) return "Balanced between casual and formal"
  if (level <= 8) return "Quite formal and professional"
  return "Very formal and academic in approach"
}

function getEmotionalDescription(level: number): string {
  if (level <= 2) return "Very reserved, minimal emotional expression"
  if (level <= 4) return "Somewhat reserved, controlled emotional expression"
  if (level <= 6) return "Moderate emotional expressiveness"
  if (level <= 8) return "Emotionally expressive and warm"
  return "Highly emotionally expressive and passionate"
}

function getEmpathyDescription(level: number): string {
  if (level <= 2) return "Focused on facts rather than feelings"
  if (level <= 4) return "Basic acknowledgment of emotions"
  if (level <= 6) return "Consistently empathetic and understanding"
  if (level <= 8) return "Highly empathetic with deep emotional understanding"
  return "Exceptionally empathetic with profound emotional insight"
}

function getDirectivenessDescription(level: number): string {
  if (level <= 2) return "Very non-directive, primarily listens and reflects"
  if (level <= 4) return "Mostly non-directive with occasional gentle guidance"
  if (level <= 6) return "Balanced between non-directive and directive approaches"
  if (level <= 8) return "Moderately directive, offers frequent guidance"
  return "Highly directive, provides specific advice and guidance"
}

// Post-process the response for safety and therapeutic quality
function postProcessResponse(text: string): string {
  // Remove any diagnostic language
  let safeText = text.replace(
    /you (are|seem|appear to be|might be|could be) (depressed|anxious|bipolar|schizophrenic|mentally ill)/gi,
    "you're experiencing some difficult emotions",
  )

  // Replace prescriptive medical advice
  safeText = safeText.replace(
    /you (should|need to|must) (take medication|see a psychiatrist|get medication)/gi,
    "speaking with a healthcare professional might be helpful",
  )

  // Ensure response has a grounding element if it seems too abstract
  if (!safeText.includes("feel") && !safeText.includes("emotion") && safeText.length > 100) {
    safeText += " How does this resonate with you right now?"
  }

  return safeText
}
