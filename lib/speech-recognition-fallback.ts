"use client"

import { EventEmitter } from "events"

// Declare SpeechRecognition, SpeechRecognitionEvent, and SpeechRecognitionErrorEvent
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList
  }
  interface SpeechRecognitionResultList {
    [index: number]: SpeechRecognitionResult
    length: number
    item(index: number): SpeechRecognitionResult
  }
  interface SpeechRecognitionResult {
    [index: number]: SpeechRecognitionAlternative
    length: number
    isFinal: boolean
    item(index: number): SpeechRecognitionAlternative
  }
  interface SpeechRecognitionAlternative {
    transcript: string
    confidence: number
  }
  interface SpeechRecognitionErrorEvent extends Event {
    error: SpeechRecognitionError
  }
  type SpeechRecognitionError =
    | "no-speech"
    | "aborted"
    | "audio-capture"
    | "network"
    | "not-allowed"
    | "service-not-available"
    | "bad-grammar"
    | "language-not-supported"
}

/**
 * A simplified fallback speech recognition system that uses the Web Speech API
 * with minimal configuration to maximize compatibility.
 */
export class SpeechRecognitionFallback extends EventEmitter {
  private recognition: SpeechRecognition | null = null
  private isListening = false
  private errorCount = 0
  private maxErrorCount = 3
  private restartDelay = 1500 // Longer delay between restarts
  private restartTimer: NodeJS.Timeout | null = null

  constructor() {
    super()
    this.initRecognition()
  }

  private initRecognition() {
    try {
      // Use the browser's SpeechRecognition API
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

      if (!SpeechRecognition) {
        console.error("Speech recognition not supported in this browser")
        this.emit("error", { error: "Speech recognition not supported in this browser" })
        return
      }

      this.recognition = new SpeechRecognition()

      // Use minimal configuration for maximum compatibility
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.lang = "en-US"

      this.recognition.onresult = this.handleResult.bind(this)
      this.recognition.onerror = this.handleError.bind(this)
      this.recognition.onend = this.handleEnd.bind(this)

      console.log("Fallback speech recognition initialized")
    } catch (error) {
      console.error("Error initializing fallback speech recognition:", error)
      this.emit("error", { error: "Failed to initialize fallback speech recognition" })
    }
  }

  private handleResult(event: SpeechRecognitionEvent) {
    const results = Array.from(event.results)
    const transcript = results.map((result) => result[0].transcript).join(" ")

    const isFinal = results.some((result) => result.isFinal)

    this.emit("result", {
      transcript,
      isFinal,
    })
  }

  private handleError(event: SpeechRecognitionErrorEvent) {
    console.warn("Fallback speech recognition error:", event.error)

    // Reset error count for non-aborted errors
    if (event.error !== "aborted") {
      this.errorCount = 0
    } else {
      this.errorCount++
    }

    // Only emit error if we've exceeded the threshold
    if (this.errorCount > this.maxErrorCount) {
      this.emit("error", {
        error: `Fallback speech recognition error: ${event.error}`,
        message: "Speech recognition is having trouble. Please try again later or use text input.",
      })

      // Stop trying after too many errors
      this.stop()
      return
    }

    // Auto-restart with delay if we were listening
    if (this.isListening) {
      this.scheduleRestart()
    }
  }

  private handleEnd() {
    // Auto-restart if we're supposed to be listening
    if (this.isListening && this.errorCount <= this.maxErrorCount) {
      this.scheduleRestart()
    }
  }

  private scheduleRestart() {
    // Clear any existing restart timer
    if (this.restartTimer) {
      clearTimeout(this.restartTimer)
    }

    // Schedule restart with increasing delay based on error count
    const delay = this.restartDelay * (1 + this.errorCount * 0.5)

    this.restartTimer = setTimeout(() => {
      if (this.isListening) {
        try {
          this.recognition?.start()
          console.log("Fallback speech recognition restarted")
        } catch (error) {
          console.error("Error restarting fallback speech recognition:", error)
        }
      }
    }, delay)
  }

  public start() {
    if (!this.recognition) {
      this.initRecognition()
    }

    if (!this.isListening && this.recognition) {
      try {
        this.isListening = true
        this.recognition.start()
        console.log("Fallback speech recognition started")
      } catch (error) {
        console.error("Error starting fallback speech recognition:", error)
        this.emit("error", { error: "Failed to start fallback speech recognition" })
      }
    }
  }

  public stop() {
    if (this.isListening && this.recognition) {
      try {
        this.isListening = false
        this.recognition.stop()
        console.log("Fallback speech recognition stopped")

        // Clear any pending restart
        if (this.restartTimer) {
          clearTimeout(this.restartTimer)
          this.restartTimer = null
        }
      } catch (error) {
        console.error("Error stopping fallback speech recognition:", error)
      }
    }
  }

  public reset() {
    this.stop()
    this.errorCount = 0

    // Re-initialize the recognition system
    if (this.recognition) {
      this.recognition = null
      this.initRecognition()
    }
  }
}
