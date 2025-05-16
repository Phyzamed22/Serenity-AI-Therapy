// Speech recognition service

interface SpeechRecognitionOptions {
  continuous?: boolean
  interimResults?: boolean
  language?: string
}

class SpeechRecognitionService {
  private recognition: any
  private isListening = false
  private transcript = ""
  private interimTranscript = ""
  private onResultCallback: ((transcript: string, isFinal: boolean) => void) | null = null
  private onEndCallback: (() => void) | null = null
  private onStartCallback: (() => void) | null = null
  private onErrorCallback: ((error: any) => void) | null = null
  private autoRestartOnEnd = false

  constructor(options: SpeechRecognitionOptions = {}) {
    // Check if browser supports speech recognition
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      console.error("Speech recognition not supported in this browser")
      return
    }

    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    this.recognition = new SpeechRecognition()

    // Configure
    this.recognition.continuous = options.continuous !== undefined ? options.continuous : true
    this.recognition.interimResults = options.interimResults !== undefined ? options.interimResults : true
    this.recognition.lang = options.language || "en-US"

    // Set up event handlers
    this.recognition.onresult = this.handleResult.bind(this)
    this.recognition.onend = this.handleEnd.bind(this)
    this.recognition.onstart = this.handleStart.bind(this)
    this.recognition.onerror = this.handleError.bind(this)
  }

  private handleResult(event: any): void {
    this.interimTranscript = ""
    this.transcript = ""

    // Process results
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        this.transcript += event.results[i][0].transcript
      } else {
        this.interimTranscript += event.results[i][0].transcript
      }
    }

    // Call callback with results
    if (this.onResultCallback) {
      const isFinal = this.interimTranscript === ""
      this.onResultCallback(isFinal ? this.transcript : this.interimTranscript, isFinal)
    }
  }

  private handleEnd(): void {
    this.isListening = false

    // Auto restart if enabled
    if (this.autoRestartOnEnd) {
      this.start()
    } else if (this.onEndCallback) {
      this.onEndCallback()
    }
  }

  private handleStart(): void {
    this.isListening = true
    this.transcript = ""
    this.interimTranscript = ""

    if (this.onStartCallback) {
      this.onStartCallback()
    }
  }

  private handleError(event: any): void {
    console.error("Speech recognition error:", event.error)

    if (this.onErrorCallback) {
      this.onErrorCallback(event.error)
    }

    // Auto restart on certain errors
    if (event.error === "network" || event.error === "aborted") {
      setTimeout(() => {
        if (this.autoRestartOnEnd) {
          this.start()
        }
      }, 1000)
    }
  }

  start(autoRestart = false): void {
    if (!this.recognition) return

    this.autoRestartOnEnd = autoRestart

    try {
      this.recognition.start()
    } catch (e) {
      console.error("Error starting speech recognition:", e)

      // If already started, stop and restart
      if ((e as any).name === "InvalidStateError") {
        this.recognition.stop()
        setTimeout(() => this.start(autoRestart), 100)
      }
    }
  }

  stop(): void {
    if (!this.recognition) return

    this.autoRestartOnEnd = false
    try {
      this.recognition.stop()
    } catch (e) {
      console.error("Error stopping speech recognition:", e)
    }
  }

  onResult(callback: (transcript: string, isFinal: boolean) => void): void {
    this.onResultCallback = callback
  }

  onEnd(callback: () => void): void {
    this.onEndCallback = callback
  }

  onStart(callback: () => void): void {
    this.onStartCallback = callback
  }

  onError(callback: (error: any) => void): void {
    this.onErrorCallback = callback
  }

  get listening(): boolean {
    return this.isListening
  }

  getCurrentTranscript(): string {
    return this.transcript || this.interimTranscript
  }
}

// Singleton instance
let recognitionInstance: SpeechRecognitionService | null = null

export function getSpeechRecognition(): SpeechRecognitionService {
  if (!recognitionInstance) {
    recognitionInstance = new SpeechRecognitionService({
      continuous: true,
      interimResults: true,
    })
  }

  return recognitionInstance
}
