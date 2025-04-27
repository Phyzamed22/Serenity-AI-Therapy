import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"

// Create a singleton instance of the Groq client
let groqClientInstance: any = null

export function getGroqClient() {
  // This is now a wrapper function that provides compatibility
  // with the rest of the codebase while using the AI SDK
  if (!groqClientInstance) {
    groqClientInstance = {
      chat: {
        completions: {
          create: async ({ messages, model, temperature, max_tokens }: any) => {
            try {
              const { text } = await generateText({
                model: groq(model || "llama3-70b-8192"),
                messages: messages.map((msg: any) => ({
                  role: msg.role,
                  content: msg.content,
                })),
                temperature: temperature || 0.7,
                maxTokens: max_tokens || 500,
              })

              return {
                choices: [
                  {
                    message: {
                      content: text,
                    },
                  },
                ],
              }
            } catch (error) {
              console.error("Error in Groq client:", error)
              throw error
            }
          },
        },
      },
    }
  }
  return groqClientInstance
}
