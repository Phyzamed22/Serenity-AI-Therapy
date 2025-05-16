/**
 * Speech recognition service for the Serenity application
 * Provides browser-based speech recognition capabilities
 */

// Define the result interface for speech recognition
export interface SpeechRecognitionResult {
  transcript: string
  isFinal: boolean
  confidence: number
}

// Define the listener interface for speech recognition events
export interface SpeechRecognitionListener {
  onResult?: (result: SpeechRecognitionResult) => void
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: Error) => void
}

// Main speech recognition class
export class SpeechRecognition {
  private recognition: any
  private isListening = false
  private listener: SpeechRecognitionListener = {}

  constructor() {
    // Check if browser supports speech recognition
    const SpeechRecognitionAPI = window.SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      console.warn("Speech recognition not supported in this browser")
      return
    }

    this.recognition = new SpeechRecognitionAPI()
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = "en-US"

    this.setupEventListeners()
  }

  private setupEventListeners() {
    if (!this.recognition) return

    this.recognition.onresult = (event: any) => {
      if (!event.results) return

      const result = event.results[event.results.length - 1]
      if (!result) return

      const transcript = result[0]?.transcript || ""
      const confidence = result[0]?.confidence || 0
      const isFinal = result.isFinal || false

      this.listener.onResult?.({
        transcript,
        isFinal,
        confidence,
      })
    }

    this.recognition.onstart = () => {
      this.isListening = true
      this.listener.onStart?.()
    }

    this.recognition.onend = () => {
      this.isListening = false
      this.listener.onEnd?.()
    }

    this.recognition.onerror = (event: any) => {
      this.listener.onError?.(new Error(event.error || "Speech recognition error"))
    }
  }

  public start() {
    if (!this.recognition) {
      this.listener.onError?.(new Error("Speech recognition not supported"))
      return
    }

    if (this.isListening) return

    try {
      this.recognition.start()
    } catch (error) {
      this.listener.onError?.(error as Error)
    }
  }

  public stop() {
    if (!this.recognition || !this.isListening) return

    try {
      this.recognition.stop()
    } catch (error) {
      this.listener.onError?.(error as Error)
    }
  }

  public setListener(listener: SpeechRecognitionListener) {
    this.listener = listener
  }

  public isSupported(): boolean {
    return !!this.recognition
  }
}

// Singleton instance
let instance: SpeechRecognition | null = null

// Getter function for the singleton instance
export function getSpeechRecognition(): SpeechRecognition {
  if (!instance && typeof window !== "undefined") {
    instance = new SpeechRecognition()
  }
  return instance as SpeechRecognition
}
