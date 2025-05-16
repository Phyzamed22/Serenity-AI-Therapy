export interface TherapistPersonality {
  humorLevel: number // 0-10 scale
  seriousnessLevel: number // 0-10 scale
  emotionalExpressiveness: number // 0-10 scale
  empathyLevel: number // 0-10 scale
  directiveness: number // 0-10 scale
}

export interface TherapistSettings {
  userId: string
  personality: TherapistPersonality
  voiceEnabled: boolean
  preferredModel: string
  createdAt: string
  updatedAt: string
}

export interface Message {
  role: "user" | "assistant" | "system"
  content: string
  emotion?: string
  confidence?: number
  timestamp?: string
}

export interface SessionMemory {
  sessionId: string
  userId: string
  messages: Message[]
  summary?: string
  keyInsights?: string[]
  emotionalJourney?: {
    startEmotion: string
    endEmotion: string
    significantShifts: Array<{
      from: string
      to: string
      messageIndex: number
    }>
  }
}
