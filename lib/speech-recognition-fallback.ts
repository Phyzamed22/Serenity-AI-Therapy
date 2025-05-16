/**
 * Speech recognition fallback service for the Serenity application
 * Provides text-based input when speech recognition is not available
 */

import type { SpeechRecognitionListener, SpeechRecognitionResult } from "./speech-recognition"

// Main fallback class that mimics the SpeechRecognition interface
export class SpeechRecognitionFallback {
  private isListening = false
  private listener: SpeechRecognitionListener = {}
  private textInput = ""

  constructor() {
    // No initialization needed for fallback
  }

  public start() {
    if (this.isListening) return

    this.isListening = true
    this.listener.onStart?.()
  }

  public stop() {
    if (!this.isListening) return

    this.isListening = false
    this.listener.onEnd?.()
  }

  public setListener(listener: SpeechRecognitionListener) {
    this.listener = listener
  }

  // Method to handle text input as a fallback for speech
  public processTextInput(text: string) {
    if (!this.isListening) return

    this.textInput = text

    const result: SpeechRecognitionResult = {
      transcript: text,
      isFinal: true,
      confidence: 1.0, // High confidence for manual input
    }

    this.listener.onResult?.(result)
  }

  // Always supported since it's a fallback
  public isSupported(): boolean {
    return true
  }
}

// Singleton instance
let instance: SpeechRecognitionFallback | null = null

// Getter function for the singleton instance
export function getSpeechRecognitionFallback(): SpeechRecognitionFallback {
  if (!instance) {
    instance = new SpeechRecognitionFallback()
  }
  return instance
}
