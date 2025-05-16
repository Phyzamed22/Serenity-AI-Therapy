import { EnhancedSpeechRecognition } from "./enhanced-speech-recognition"
import { SpeechRecognitionFallback } from "./speech-recognition-fallback"
import { EnhancedElevenLabsTTS } from "./enhanced-elevenlabs-tts"
import { EventEmitter } from "events"
import { TherapistRAG } from "./rag/therapist-rag"
import { createClientSupabaseClient } from "@/lib/supabase/client"

export interface ConversationState {
  isListening: boolean
  isSpeaking: boolean
  transcript: string
  response: string
  error: string | null
  isProcessing: boolean
  useFallbackMode: boolean
  userState: SpeakerState
  assistantState: SpeakerState
  isProcessingInterruption: boolean
}

export type SpeakerState = "idle" | "listening" | "speaking" | "thinking" | "interrupted"

export interface ConversationManagerOptions {
  userPauseThreshold?: number
  assistantPauseThreshold?: number
  allowInterruptions?: boolean
  onStateChange?: (state: ConversationState) => void
}

// Singleton instance
let conversationManagerInstance: ConversationManager | null = null

export class ConversationManager extends EventEmitter {
  private speechRecognition: EnhancedSpeechRecognition
  private fallbackRecognition: SpeechRecognitionFallback
  private tts: EnhancedElevenLabsTTS
  private rag: TherapistRAG
  private supabase = createClientSupabaseClient()

  private state: ConversationState = {
    isListening: false,
    isSpeaking: false,
    transcript: "",
    response: "",
    error: null,
    isProcessing: false,
    useFallbackMode: false,
    userState: "idle",
    assistantState: "idle",
    isProcessingInterruption: false,
  }

  private consecutiveErrors = 0
  private maxConsecutiveErrors = 3
  private sessionId: string | null = null
  private userId: string | null = null
  private therapistId: string | null = null
  private therapistName = "Serenity"
  private therapistVoiceId: string | null = null
  private options: ConversationManagerOptions

  constructor(options: ConversationManagerOptions = {}) {
    super()
    this.options = {
      userPauseThreshold: 1500,
      assistantPauseThreshold: 300,
      allowInterruptions: true,
      ...options,
    }

    this.speechRecognition = new EnhancedSpeechRecognition()
    this.fallbackRecognition = new SpeechRecognitionFallback()
    this.tts = new EnhancedElevenLabsTTS()
    this.rag = new TherapistRAG()

    this.setupEventListeners()
    this.loadUserSettings()
  }

  private async loadUserSettings() {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession()
      if (session) {
        this.userId = session.user.id

        // Load therapist settings
        const { data: therapistSettings } = await this.supabase
          .from("therapist_settings")
          .select("*")
          .eq("user_id", this.userId)
          .single()

        if (therapistSettings) {
          this.therapistId = therapistSettings.therapist_id
          this.therapistName = therapistSettings.name || "Serenity"
          this.therapistVoiceId = therapistSettings.voice_id || null

          // Configure TTS with voice ID if available
          if (this.therapistVoiceId) {
            this.tts.setVoiceId(this.therapistVoiceId)
          }
        }
      }
    } catch (error) {
      console.error("Error loading user settings:", error)
    }
  }

  private setupEventListeners() {
    // Set up main speech recognition listeners
    this.speechRecognition.on("result", (data) => {
      this.handleTranscript(data.transcript, data.isFinal)
    })

    this.speechRecognition.on("error", (data) => {
      console.warn("Speech recognition error:", data.error)

      if (data.error.includes("aborted")) {
        this.consecutiveErrors++

        // Switch to fallback mode if we have too many consecutive errors
        if (this.consecutiveErrors > this.maxConsecutiveErrors && !this.state.useFallbackMode) {
          console.log("Switching to fallback speech recognition mode")
          this.switchToFallbackMode()
        }
      } else {
        // Reset consecutive errors for non-aborted errors
        this.consecutiveErrors = 0
      }

      this.updateState({
        error: data.message || data.error,
      })
    })

    // Set up fallback speech recognition listeners
    this.fallbackRecognition.on("result", (data) => {
      this.handleTranscript(data.transcript, data.isFinal)
    })

    this.fallbackRecognition.on("error", (data) => {
      console.warn("Fallback speech recognition error:", data.error)

      this.updateState({
        error: data.message || data.error,
      })
    })

    // Set up TTS listeners
    this.tts.on("start", () => {
      this.updateState({
        isSpeaking: true,
        assistantState: "speaking",
      })
    })

    this.tts.on("end", () => {
      this.updateState({
        isSpeaking: false,
        assistantState: "idle",
      })
    })

    this.tts.on("error", (error) => {
      console.error("TTS error:", error)
      this.updateState({
        error: `Text-to-speech error: ${error.message || "Unknown error"}`,
        isSpeaking: false,
        assistantState: "idle",
      })
    })
  }

  private switchToFallbackMode() {
    // Stop the main recognition system
    if (this.state.isListening) {
      this.speechRecognition.stop()
    }

    // Update state to use fallback mode
    this.updateState({
      useFallbackMode: true,
      error: "Switched to simplified speech recognition mode due to technical issues.",
    })

    // Start the fallback system if we were listening
    if (this.state.isListening) {
      this.fallbackRecognition.start()
    }
  }

  private switchToMainMode() {
    // Stop the fallback recognition system
    if (this.state.isListening) {
      this.fallbackRecognition.stop()
    }

    // Reset error count
    this.consecutiveErrors = 0

    // Update state to use main mode
    this.updateState({
      useFallbackMode: false,
      error: null,
    })

    // Start the main system if we were listening
    if (this.state.isListening) {
      this.speechRecognition.start()
    }
  }

  private handleTranscript(transcript: string, isFinal: boolean) {
    // Update the transcript
    this.updateState({
      transcript,
      error: null,
      userState: isFinal ? "idle" : "listening",
    })

    // If this is a final result and not empty, process it
    if (isFinal && transcript.trim() && !this.state.isProcessing) {
      this.processUserInput(transcript)
    }
  }

  private async processUserInput(input: string) {
    try {
      this.updateState({
        isProcessing: true,
        assistantState: "thinking",
      })

      // Get response from RAG system
      const response = await this.rag.getResponse(input, {
        sessionId: this.sessionId,
        userId: this.userId,
        therapistId: this.therapistId,
        therapistName: this.therapistName,
      })

      // Update state with response
      this.updateState({
        response,
        isProcessing: false,
        assistantState: "idle",
      })

      // Speak the response if we're not in the middle of speaking
      if (!this.state.isSpeaking) {
        this.tts.speak(response)
      }

      // Save the conversation to the database if we have a session
      if (this.sessionId && this.userId) {
        this.saveConversation(input, response)
      }

      // Reset consecutive errors since we successfully processed input
      this.consecutiveErrors = 0

      // If we're in fallback mode and have had success, try switching back to main mode
      if (this.state.useFallbackMode && this.consecutiveErrors === 0) {
        this.switchToMainMode()
      }
    } catch (error) {
      console.error("Error processing user input:", error)
      this.updateState({
        error: `Error processing your input: ${error instanceof Error ? error.message : "Unknown error"}`,
        isProcessing: false,
        assistantState: "idle",
      })
    }
  }

  private async saveConversation(userInput: string, therapistResponse: string) {
    try {
      await this.supabase.from("conversation_messages").insert([
        {
          session_id: this.sessionId,
          user_id: this.userId,
          sender: "user",
          content: userInput,
          timestamp: new Date().toISOString(),
        },
        {
          session_id: this.sessionId,
          user_id: this.userId,
          sender: "therapist",
          content: therapistResponse,
          timestamp: new Date().toISOString(),
        },
      ])
    } catch (error) {
      console.error("Error saving conversation:", error)
    }
  }

  private updateState(partialState: Partial<ConversationState>) {
    this.state = { ...this.state, ...partialState }

    // Call the onStateChange callback if provided
    if (this.options.onStateChange) {
      this.options.onStateChange(this.state)
    }

    this.emit("stateChange", this.state)
  }

  public startListening() {
    if (!this.state.isListening) {
      if (this.state.useFallbackMode) {
        this.fallbackRecognition.start()
      } else {
        this.speechRecognition.start()
      }

      this.updateState({
        isListening: true,
        error: null,
        userState: "listening",
      })
    }
  }

  public stopListening() {
    if (this.state.isListening) {
      if (this.state.useFallbackMode) {
        this.fallbackRecognition.stop()
      } else {
        this.speechRecognition.stop()
      }

      this.updateState({
        isListening: false,
        userState: "idle",
      })
    }
  }

  public stopSpeaking() {
    if (this.state.isSpeaking) {
      this.tts.stop()
      this.updateState({
        isSpeaking: false,
        assistantState: "interrupted",
      })
    }
  }

  public reset() {
    this.stopListening()
    this.stopSpeaking()

    // Reset both recognition systems
    this.speechRecognition.reset()
    this.fallbackRecognition.reset()

    // Reset state
    this.updateState({
      isListening: false,
      isSpeaking: false,
      transcript: "",
      response: "",
      error: null,
      isProcessing: false,
      useFallbackMode: false,
      userState: "idle",
      assistantState: "idle",
      isProcessingInterruption: false,
    })

    // Reset error count
    this.consecutiveErrors = 0
  }

  public setSession(sessionId: string) {
    this.sessionId = sessionId
  }

  public getState(): ConversationState {
    return { ...this.state }
  }

  public async sendTextInput(text: string) {
    if (!text.trim() || this.state.isProcessing) return

    this.updateState({ transcript: text })
    await this.processUserInput(text)
  }

  public assistantStartsThinking() {
    this.updateState({ assistantState: "thinking" })
  }

  public assistantStopsThinking() {
    this.updateState({ assistantState: "idle" })
  }
}

// Export a function to get or create the conversation manager instance
export function getConversationManager(options: ConversationManagerOptions = {}): ConversationManager {
  if (!conversationManagerInstance) {
    conversationManagerInstance = new ConversationManager(options)
  } else if (Object.keys(options).length > 0) {
    // Update options if provided
    conversationManagerInstance.updateOptions(options)
  }

  return conversationManagerInstance
}

// Add this method to the ConversationManager class
ConversationManager.prototype.updateOptions = function (options: ConversationManagerOptions) {
  this.options = {
    ...this.options,
    ...options,
  }
}
