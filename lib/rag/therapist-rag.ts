import { createClient } from "@supabase/supabase-js"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import { KnowledgeBase } from "./knowledge-base"
import { VectorStore } from "./vector-store"
import type { Database } from "../database.types"
import { env } from "../env"

/**
 * TherapistRAG class that provides RAG (Retrieval-Augmented Generation) capabilities
 * for the virtual therapist, enhancing responses with relevant therapeutic knowledge.
 */
export class TherapistRAG {
  private knowledgeBase: KnowledgeBase
  private vectorStore: VectorStore
  private supabase: ReturnType<typeof createClient<Database>>

  constructor() {
    // Initialize the knowledge base and vector store
    this.knowledgeBase = new KnowledgeBase()
    this.vectorStore = new VectorStore()

    // Initialize Supabase client
    this.supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
  }

  /**
   * Generate a response using RAG
   * @param userInput The user's input
   * @param sessionHistory Previous conversation history
   * @param userProfile User profile information
   * @returns The generated response
   */
  public async generateResponse(
    userInput: string,
    sessionHistory: string[] = [],
    userProfile: any = {},
  ): Promise<string> {
    try {
      // Retrieve relevant knowledge from the vector store
      const relevantKnowledge = await this.retrieveRelevantKnowledge(userInput)

      // Construct the prompt with the retrieved knowledge
      const prompt = this.constructPrompt(userInput, sessionHistory, relevantKnowledge, userProfile)

      // Generate the response using the LLM
      const response = await this.generateWithLLM(prompt)

      return response
    } catch (error) {
      console.error("Error generating RAG response:", error)
      return "I'm sorry, I'm having trouble processing your request right now. Could you try again?"
    }
  }

  /**
   * Retrieve relevant knowledge from the vector store
   * @param query The query to search for
   * @returns Relevant knowledge as a string
   */
  private async retrieveRelevantKnowledge(query: string): Promise<string> {
    try {
      // Get embeddings for the query
      const results = await this.vectorStore.search(query, 5)

      // Format the results
      return results.map((result) => result.content).join("\n\n")
    } catch (error) {
      console.error("Error retrieving knowledge:", error)
      return ""
    }
  }

  /**
   * Construct the prompt for the LLM
   * @param userInput The user's input
   * @param sessionHistory Previous conversation history
   * @param relevantKnowledge Relevant knowledge retrieved from the vector store
   * @param userProfile User profile information
   * @returns The constructed prompt
   */
  private constructPrompt(
    userInput: string,
    sessionHistory: string[],
    relevantKnowledge: string,
    userProfile: any,
  ): string {
    // Format the session history
    const formattedHistory = sessionHistory
      .map((message, i) => `${i % 2 === 0 ? "User" : "Therapist"}: ${message}`)
      .join("\n")

    // Format the user profile
    const formattedProfile = Object.entries(userProfile)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n")

    // Construct the full prompt
    return `
You are a compassionate and knowledgeable virtual therapist named Serenity.
Your goal is to provide supportive, empathetic responses that help the user process their emotions and thoughts.

User Profile:
${formattedProfile}

Previous Conversation:
${formattedHistory}

Relevant Therapeutic Knowledge:
${relevantKnowledge}

User's Current Message: ${userInput}

Respond as Serenity, the virtual therapist. Be empathetic, supportive, and insightful.
Incorporate relevant therapeutic concepts when appropriate, but maintain a conversational tone.
Focus on understanding the user's emotions and providing helpful guidance.
`
  }

  /**
   * Generate a response using the LLM
   * @param prompt The prompt to send to the LLM
   * @returns The generated response
   */
  private async generateWithLLM(prompt: string): Promise<string> {
    try {
      const { text } = await generateText({
        model: groq("llama3-70b-8192"),
        prompt,
        maxTokens: 1000,
        temperature: 0.7,
      })

      return text
    } catch (error) {
      console.error("Error generating with LLM:", error)
      throw error
    }
  }
}

// Singleton instance
let therapistRAGInstance: TherapistRAG | null = null

/**
 * Get the singleton instance of TherapistRAG
 * This ensures only one instance is created and reused throughout the application
 */
export function getTherapistRAG(): TherapistRAG {
  if (!therapistRAGInstance) {
    therapistRAGInstance = new TherapistRAG()
  }
  return therapistRAGInstance
}
