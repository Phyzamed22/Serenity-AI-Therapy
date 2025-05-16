import { SpeechRecognition } from "./speech-recognition"
import { SpeechRecognitionFallback } from "./speech-recognition-fallback"

/**
 * Enhanced Speech Recognition class that provides improved speech recognition capabilities
 * with noise filtering, fallback mechanisms, and better accuracy.
 */
export class EnhancedSpeechRecognition {
  private speechRecognition: SpeechRecognition
  private fallbackRecognition: SpeechRecognitionFallback
  private isListening = false
  private onResultCallback: ((text: string) => void) | null = null
  private onErrorCallback: ((error: Error) => void) | null = null

  constructor() {
    this.speechRecognition = new SpeechRecognition()
    this.fallbackRecognition = new SpeechRecognitionFallback()

    // Configure the speech recognition
    this.configure()
  }

  private configure() {
    // Set up event listeners for the speech recognition
    this.speechRecognition.onResult((text) => {
      if (this.onResultCallback) {
        this.onResultCallback(this.processText(text))
      }
    })

    this.speechRecognition.onError((error) => {
      console.warn("Primary speech recognition error, switching to fallback:", error)
      this.useFallback()
    })

    this.fallbackRecognition.onResult((text) => {
      if (this.onResultCallback) {
        this.onResultCallback(this.processText(text))
      }
    })

    this.fallbackRecognition.onError((error) => {
      if (this.onErrorCallback) {
        this.onErrorCallback(error)
      }
    })
  }

  /**
   * Process the recognized text to improve accuracy
   */
  private processText(text: string): string {
    // Remove filler words
    const fillerWords = ["um", "uh", "like", "you know", "actually"]
    let processedText = text

    fillerWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi")
      processedText = processedText.replace(regex, "")
    })

    // Clean up multiple spaces
    processedText = processedText.replace(/\s+/g, " ").trim()

    return processedText
  }

  /**
   * Switch to the fallback recognition system
   */
  private useFallback() {
    if (this.isListening) {
      this.speechRecognition.stop()
      this.fallbackRecognition.start()
    }
  }

  /**
   * Start listening for speech
   */
  public start() {
    this.isListening = true
    try {
      this.speechRecognition.start()
    } catch (error) {
      console.warn("Error starting primary speech recognition:", error)
      // Moved useFallback call to the top level to fix lint error
      this.useFallback()
    }
  }

  /**
   * Stop listening for speech
   */
  public stop() {
    this.isListening = false
    this.speechRecognition.stop()
    this.fallbackRecognition.stop()
  }

  /**
   * Set the callback for when speech is recognized
   */
  public onResult(callback: (text: string) => void) {
    this.onResultCallback = callback
  }

  /**
   * Set the callback for when an error occurs
   */
  public onError(callback: (error: Error) => void) {
    this.onErrorCallback = callback
  }
}

// Singleton instance
let enhancedSpeechRecognitionInstance: EnhancedSpeechRecognition | null = null

/**
 * Get the singleton instance of EnhancedSpeechRecognition
 * This ensures only one instance is created and reused throughout the application
 */
export function getEnhancedSpeechRecognition(): EnhancedSpeechRecognition {
  if (!enhancedSpeechRecognitionInstance) {
    enhancedSpeechRecognitionInstance = new EnhancedSpeechRecognition()
  }
  return enhancedSpeechRecognitionInstance
}
