import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"
import { loadKnowledgeBase, type KnowledgeEntry } from "./knowledge-base"
import { getVectorStore, type SearchResult } from "./vector-store"

interface TherapistRAGOptions {
  modelId?: string
  temperature?: number
  maxTokens?: number
  topK?: number
  systemPromptTemplate?: string
}

const DEFAULT_SYSTEM_PROMPT = `You are Serenity, an emotionally intelligent, trauma-informed virtual therapist.

Your role is to deeply understand the user's emotions, thoughts, and mental health challenges through conversation. You speak in a calming, compassionate, and reassuring tone.

Use the following therapy knowledge to guide your response:
{context}

You never make a medical diagnosis or suggest medications. Instead, you use evidence-based methods such as Cognitive Behavioral Therapy (CBT), trauma-informed care, and reflective listening.

If a user expresses signs of distress, trauma, depression, or self-harm, respond with empathy and encourage seeking professional help. Always keep the user grounded in the present moment and validated.

Structure your responses with:
- Validate: Acknowledge their feelings
- Reflect: Mirror their emotional experience
- Explore: Ask a thoughtful question to deepen understanding
- Support: Offer a supportive statement that reinforces their worth

Keep your responses concise (2-4 sentences per section) unless the situation calls for more detailed explanation.
Do not disclose that you are an AI or mention your programming - stay in character as a therapist named Serenity.`

export class TherapistRAG {
  private knowledgeBase: KnowledgeEntry[] = []
  private isInitialized = false
  private options: Required<TherapistRAGOptions>

  constructor(options?: TherapistRAGOptions) {
    this.options = {
      modelId: options?.modelId || "llama3-70b-8192",
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens || 800,
      topK: options?.topK || 5,
      systemPromptTemplate: options?.systemPromptTemplate || DEFAULT_SYSTEM_PROMPT,
    }
  }

  /**
   * Initialize the RAG system with the knowledge base
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Load knowledge base
      this.knowledgeBase = await loadKnowledgeBase()

      // Initialize vector store
      const vectorStore = await getVectorStore(this.knowledgeBase)

      this.isInitialized = true
      console.log("✅ TherapistRAG initialized successfully")
    } catch (error) {
      console.error("Error initializing TherapistRAG:", error)
      throw new Error("Failed to initialize TherapistRAG")
    }
  }

  /**
   * Generate a response using RAG
   */
  async generateResponse(
    query: string,
    messages: Array<{ role: string; content: string }>,
    emotionData?: {
      facialEmotion?: string
      voiceTone?: string
      textSentiment?: string
    },
  ): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      // Get vector store
      const vectorStore = await getVectorStore()

      // Search for relevant knowledge
      const searchResults = await vectorStore.search(query, this.options.topK)

      // Format context from search results
      const context = this.formatContext(searchResults)

      // Create system prompt with context
      const systemPrompt = this.options.systemPromptTemplate.replace("{context}", context)

      // Format user message with emotion metadata if available
      let enhancedUserMessage = query
      if (emotionData) {
        const emotionPrefix = []
        if (emotionData.facialEmotion) emotionPrefix.push(`facial: ${emotionData.facialEmotion}`)
        if (emotionData.voiceTone) emotionPrefix.push(`voice: ${emotionData.voiceTone}`)
        if (emotionData.textSentiment) emotionPrefix.push(`sentiment: ${emotionData.textSentiment}`)

        if (emotionPrefix.length > 0) {
          enhancedUserMessage = `[User Emotion: ${emotionPrefix.join(", ")}]\n${query}`
        }
      }

      // Update the last user message with enhanced content
      const formattedMessages = messages.map((msg) => {
        if (msg.role === "user" && messages.indexOf(msg) === messages.length - 1) {
          return { role: "user", content: enhancedUserMessage }
        }
        return msg
      })

      // Add system prompt
      formattedMessages.unshift({ role: "system", content: systemPrompt })

      // Generate response using Groq
      const { text } = await generateText({
        model: groq(this.options.modelId),
        messages: formattedMessages,
        temperature: this.options.temperature,
        maxTokens: this.options.maxTokens,
      })

      return this.postProcessResponse(text)
    } catch (error) {
      console.error("Error generating RAG response:", error)
      return "I'm here to listen. Would you like to tell me more about how you're feeling?"
    }
  }

  /**
   * Format context from search results
   */
  private formatContext(results: SearchResult[]): string {
    return results
      .map((result, index) => {
        return `[${index + 1}] ${result.entry.content}`
      })
      .join("\n\n")
  }

  /**
   * Post-process the response for safety and therapeutic quality
   */
  private postProcessResponse(text: string): string {
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
}

// Singleton instance
let therapistRAGInstance: TherapistRAG | null = null

export function getTherapistRAG(options?: TherapistRAGOptions): TherapistRAG {
  if (!therapistRAGInstance) {
    therapistRAGInstance = new TherapistRAG(options)
  }

  return therapistRAGInstance
}
