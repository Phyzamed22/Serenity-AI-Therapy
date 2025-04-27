import { GroqChat } from "@groq/groq-sdk"

// Create a singleton instance of the Groq client
let groqClient: GroqChat | null = null

export function getGroqClient() {
  if (!groqClient) {
    groqClient = new GroqChat({
      apiKey: process.env.GROQ_API_KEY,
    })
  }
  return groqClient
}
