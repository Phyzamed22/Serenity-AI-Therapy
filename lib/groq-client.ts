import { groq } from "@ai-sdk/groq"
import { generateText, streamText } from "ai"

export const availableModels = [
  {
    id: "llama3-8b-8192",
    name: "Llama 3 8B",
    description: "Fast and efficient language model for text generation",
  },
  {
    id: "llama3-70b-8192",
    name: "Llama 3 70B",
    description: "Powerful language model with strong reasoning capabilities",
  },
  {
    id: "mixtral-8x7b-32768",
    name: "Mixtral 8x7B",
    description: "Efficient mixture-of-experts model with strong performance",
  },
  {
    id: "gemma-7b-it",
    name: "Gemma 7B",
    description: "Lightweight and efficient language model",
  },
]

export async function generateTherapistResponse(
  messages: Array<{ role: string; content: string }>,
  personality: {
    humorLevel: number
    seriousnessLevel: number
    emotionalExpressiveness: number
    empathyLevel: number
    directiveness: number
  },
  modelId = "llama3-70b-8192",
  emotionData?: {
    facialEmotion?: string
    voiceTone?: string
    textSentiment?: string
    sessionContext?: string
    preferredStyle?: string
  },
) {
  try {
    // Convert personality traits to descriptive terms
    const humorDescription = getHumorDescription(personality.humorLevel)
    const seriousnessDescription = getSeriousnessDescription(personality.seriousnessLevel)
    const emotionalDescription = getEmotionalDescription(personality.emotionalExpressiveness)
    const empathyDescription = getEmpathyDescription(personality.empathyLevel)
    const directivenessDescription = getDirectivenessDescription(personality.directiveness)

    // Create enhanced system prompt based on personality settings and trauma-informed approach
    const systemPrompt = `You are Serenity, an emotionally intelligent, trauma-informed virtual therapist with the following personality traits:
- Humor: ${humorDescription} (${personality.humorLevel}/10)
- Seriousness: ${seriousnessDescription} (${personality.seriousnessLevel}/10)
- Emotional Expressiveness: ${emotionalDescription} (${personality.emotionalExpressiveness}/10)
- Empathy: ${empathyDescription} (${personality.empathyLevel}/10)
- Directiveness: ${directivenessDescription} (${personality.directiveness}/10)

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

    // Get the last user message
    const lastUserMessage = messages.filter((msg) => msg.role === "user").pop()

    // Format user message with emotion metadata if available
    let enhancedUserMessage = lastUserMessage?.content || ""
    if (emotionData && lastUserMessage) {
      const emotionPrefix = []
      if (emotionData.facialEmotion) emotionPrefix.push(`facial: ${emotionData.facialEmotion}`)
      if (emotionData.voiceTone) emotionPrefix.push(`voice: ${emotionData.voiceTone}`)
      if (emotionData.textSentiment) emotionPrefix.push(`sentiment: ${emotionData.textSentiment}`)

      if (emotionPrefix.length > 0) {
        enhancedUserMessage = `[User Emotion: ${emotionPrefix.join(", ")}]\n${lastUserMessage.content}`
      }

      // Add session context if available
      if (emotionData.sessionContext) {
        enhancedUserMessage = `[Context: ${emotionData.sessionContext}]\n${enhancedUserMessage}`
      }

      // Add preferred style if available
      if (emotionData.preferredStyle) {
        enhancedUserMessage = `[User Prefers: ${emotionData.preferredStyle}]\n${enhancedUserMessage}`
      }
    }

    // Update the last user message with enhanced content
    const formattedMessages = messages.map((msg) => {
      if (msg === lastUserMessage) {
        return { role: "user", content: enhancedUserMessage }
      }
      return {
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      }
    })

    // Add system prompt
    formattedMessages.unshift({ role: "system", content: systemPrompt })

    // Generate response using Groq
    const { text } = await generateText({
      model: groq(modelId),
      messages: formattedMessages,
      temperature: 0.7,
      maxTokens: 500,
    })

    // Post-process the response for safety
    const safeResponse = postProcessResponse(text)

    return safeResponse
  } catch (error) {
    console.error("Error generating therapist response:", error)
    return "I'm here to listen. Would you like to tell me more about how you're feeling?"
  }
}

// Post-process the response to ensure safety and therapeutic quality
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

export async function streamTherapistResponse(
  messages: Array<{ role: string; content: string }>,
  personality: {
    humorLevel: number
    seriousnessLevel: number
    emotionalExpressiveness: number
    empathyLevel: number
    directiveness: number
  },
  onChunk: (chunk: string) => void,
  modelId = "llama3-70b-8192",
  emotionData?: {
    facialEmotion?: string
    voiceTone?: string
    textSentiment?: string
    sessionContext?: string
    preferredStyle?: string
  },
) {
  try {
    // Convert personality traits to descriptive terms
    const humorDescription = getHumorDescription(personality.humorLevel)
    const seriousnessDescription = getSeriousnessDescription(personality.seriousnessLevel)
    const emotionalDescription = getEmotionalDescription(personality.emotionalExpressiveness)
    const empathyDescription = getEmpathyDescription(personality.empathyLevel)
    const directivenessDescription = getDirectivenessDescription(personality.directiveness)

    // Create enhanced system prompt based on personality settings and trauma-informed approach
    const systemPrompt = `You are Serenity, an emotionally intelligent, trauma-informed virtual therapist with the following personality traits:
- Humor: ${humorDescription} (${personality.humorLevel}/10)
- Seriousness: ${seriousnessDescription} (${personality.seriousnessLevel}/10)
- Emotional Expressiveness: ${emotionalDescription} (${personality.emotionalExpressiveness}/10)
- Empathy: ${empathyDescription} (${personality.empathyLevel}/10)
- Directiveness: ${directivenessDescription} (${personality.directiveness}/10)

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

    // Get the last user message
    const lastUserMessage = messages.filter((msg) => msg.role === "user").pop()

    // Format user message with emotion metadata if available
    let enhancedUserMessage = lastUserMessage?.content || ""
    if (emotionData && lastUserMessage) {
      const emotionPrefix = []
      if (emotionData.facialEmotion) emotionPrefix.push(`facial: ${emotionData.facialEmotion}`)
      if (emotionData.voiceTone) emotionPrefix.push(`voice: ${emotionData.voiceTone}`)
      if (emotionData.textSentiment) emotionPrefix.push(`sentiment: ${emotionData.textSentiment}`)

      if (emotionPrefix.length > 0) {
        enhancedUserMessage = `[User Emotion: ${emotionPrefix.join(", ")}]\n${lastUserMessage.content}`
      }

      // Add session context if available
      if (emotionData.sessionContext) {
        enhancedUserMessage = `[Context: ${emotionData.sessionContext}]\n${enhancedUserMessage}`
      }

      // Add preferred style if available
      if (emotionData.preferredStyle) {
        enhancedUserMessage = `[User Prefers: ${emotionData.preferredStyle}]\n${enhancedUserMessage}`
      }
    }

    // Update the last user message with enhanced content
    const formattedMessages = messages.map((msg) => {
      if (msg === lastUserMessage) {
        return { role: "user", content: enhancedUserMessage }
      }
      return {
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      }
    })

    // Add system prompt
    formattedMessages.unshift({ role: "system", content: systemPrompt })

    // Collect chunks for post-processing
    let fullResponse = ""

    // Stream response using Groq
    const response = await streamText({
      model: groq(modelId),
      messages: formattedMessages,
      temperature: 0.7,
      maxTokens: 500,
      onChunk: ({ chunk }) => {
        if (chunk.type === "text-delta") {
          fullResponse += chunk.text
          onChunk(chunk.text)
        }
      },
    })

    // We don't post-process streamed responses in real-time
    // But we could implement a post-stream safety check if needed

    return response.text
  } catch (error) {
    console.error("Error streaming therapist response:", error)
    return "I'm here to listen. Would you like to tell me more about how you're feeling?"
  }
}

// Helper functions to convert numeric values to descriptive terms
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
