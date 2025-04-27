import { getConversationManager } from "./conversation-manager"
import { getEnhancedElevenLabsTTS } from "./enhanced-elevenlabs-tts"
import { getNoiseFilter, type NoiseFilterOptions } from "./audio/noise-filter"
import { getSpeechEnhancer, type SpeechEnhancerOptions } from "./audio/speech-enhancer"

interface EnhancedSpeechRecognitionOptions {
  continuous?: boolean
  interimResults?: boolean
  language?: string
  pauseThreshold?: number // ms to wait before considering a pause
  minSpeechSegmentLength?: number // min characters to consider as valid speech
  voiceActivityThreshold?: number // volume threshold for voice activity detection
  autoStart?: boolean // automatically start listening when initialized
  noSpeechTimeout?: number // ms to wait before triggering no-speech error
  maxNoSpeechRetries?: number // maximum number of automatic retries on no-speech error
  noiseFilter?: NoiseFilterOptions | boolean // noise filter options or boolean to enable/disable
  speechEnhancer?: SpeechEnhancerOptions | boolean // speech enhancer options or boolean to enable/disable
}

export class EnhancedSpeechRecognition {
  private recognition: any
  private isListening = false
  private transcript = ""
  private interimTranscript = ""
  private onResultCallback: ((transcript: string, isFinal: boolean) => void) | null = null
  private onEndCallback: (() => void) | null = null
  private onStartCallback: (() => void) | null = null
  private onErrorCallback: ((error: any) => void) | null = null
  private autoRestartOnEnd = false
  private pauseThreshold: number
  private minSpeechSegmentLength: number
  private lastSpeechTime: number | null = null
  private pauseTimer: NodeJS.Timeout | null = null
  private isSpeaking = false
  private conversationManager = getConversationManager()
  private audioContext: AudioContext | null = null
  private audioAnalyser: AnalyserNode | null = null
  private audioStream: MediaStream | null = null
  private processedStream: MediaStream | null = null
  private voiceActivityDetectionTimer: NodeJS.Timeout | null = null
  private voiceActivityThreshold: number
  private isVoiceDetected = false
  private autoStart: boolean
  private noSpeechRetryCount = 0
  private maxNoSpeechRetries: number
  private noSpeechTimeout: number
  private noSpeechTimer: NodeJS.Timeout | null = null
  private processingFinalTranscript = false
  private useNoiseFilter: boolean
  private noiseFilterOptions: NoiseFilterOptions | null = null
  private useSpeechEnhancer: boolean
  private speechEnhancerOptions: SpeechEnhancerOptions | null = null

  constructor(options: EnhancedSpeechRecognitionOptions = {}) {
    // Check if browser supports speech recognition
    if (typeof window === "undefined" || (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window))) {
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

    // Set pause threshold and min speech segment length
    this.pauseThreshold = options.pauseThreshold || 500 // Reduced to 500ms for faster response
    this.minSpeechSegmentLength = options.minSpeechSegmentLength || 2 // 2 characters default
    this.voiceActivityThreshold = options.voiceActivityThreshold || 12 // Lowered threshold for better sensitivity
    this.autoStart = options.autoStart !== undefined ? options.autoStart : true
    this.maxNoSpeechRetries = options.maxNoSpeechRetries || 3 // Default max retries
    this.noSpeechTimeout = options.noSpeechTimeout || 8000 // 8 seconds default

    // Configure noise filter - DISABLED BY DEFAULT to avoid issues
    this.useNoiseFilter =
      options.noiseFilter !== undefined
        ? typeof options.noiseFilter === "boolean"
          ? options.noiseFilter
          : false
        : false

    if (typeof options.noiseFilter === "object") {
      this.noiseFilterOptions = options.noiseFilter
    }

    // Configure speech enhancer - ENABLED BY DEFAULT
    this.useSpeechEnhancer =
      options.speechEnhancer !== undefined
        ? typeof options.speechEnhancer === "boolean"
          ? options.speechEnhancer
          : true
        : true

    if (typeof options.speechEnhancer === "object") {
      this.speechEnhancerOptions = options.speechEnhancer
    }

    // Set up event handlers
    this.recognition.onresult = this.handleResult.bind(this)
    this.recognition.onend = this.handleEnd.bind(this)
    this.recognition.onstart = this.handleStart.bind(this)
    this.recognition.onerror = this.handleError.bind(this)

    // Initialize audio context for voice activity detection
    this.initAudioContext()

    // Auto-start if enabled - immediately try to start on initialization
    if (this.autoStart && typeof window !== "undefined") {
      // Try to start immediately if document is already interactive
      if (document.readyState === "interactive" || document.readyState === "complete") {
        this.tryAutoStart()
      } else {
        // Otherwise wait for DOMContentLoaded
        document.addEventListener("DOMContentLoaded", this.tryAutoStart.bind(this))
      }

      // Also try on first user interaction
      const startOnInteraction = () => {
        this.start(true) // Auto-restart
        document.removeEventListener("click", startOnInteraction)
        document.removeEventListener("touchstart", startOnInteraction)
        document.removeEventListener("keydown", startOnInteraction)
      }

      document.addEventListener("click", startOnInteraction)
      document.addEventListener("touchstart", startOnInteraction)
      document.addEventListener("keydown", startOnInteraction)
    }
  }

  private tryAutoStart() {
    // Try to start recognition immediately
    try {
      this.start(true)
    } catch (e) {
      console.log("Auto-start failed, will try again on user interaction", e)
    }
  }

  private async initAudioContext() {
    try {
      // Only initialize in browser environment
      if (typeof window === "undefined") return

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      // We'll initialize the stream when the user interacts with the page
      const initStream = async () => {
        try {
          console.log("Attempting to access microphone...")

          // Request microphone access with basic constraints first
          this.audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          })

          console.log("Microphone access granted")

          // Apply audio processing chain
          let processedStream = this.audioStream

          // Apply speech enhancement if enabled
          if (this.useSpeechEnhancer) {
            try {
              console.log("Initializing speech enhancer...")
              const speechEnhancer = getSpeechEnhancer(this.speechEnhancerOptions || undefined)
              processedStream = await speechEnhancer.initialize(processedStream)
              console.log("Speech enhancer initialized successfully")
            } catch (error) {
              console.error("Error initializing speech enhancer:", error)
              // Continue with unenhanced stream
            }
          }

          // Apply noise filtering if enabled (after speech enhancement)
          if (this.useNoiseFilter) {
            try {
              console.log("Initializing noise filter...")
              const noiseFilter = getNoiseFilter(this.noiseFilterOptions || undefined)
              processedStream = await noiseFilter.initialize(processedStream)
              console.log("Noise filter initialized successfully")
            } catch (error) {
              console.error("Error initializing noise filter:", error)
              // Continue with unfiltered stream
            }
          }

          // Store the final processed stream
          this.processedStream = processedStream

          // Create analyzer only if audioContext exists
          if (this.audioContext) {
            this.audioAnalyser = this.audioContext.createAnalyser()
            this.audioAnalyser.fftSize = 256
            this.audioAnalyser.smoothingTimeConstant = 0.5

            // Connect microphone to analyzer - use original stream for analysis
            // to avoid feedback loops with the processed stream
            const source = this.audioContext.createMediaStreamSource(this.audioStream)
            source.connect(this.audioAnalyser)

            // Start voice activity detection
            this.startVoiceActivityDetection()
          }

          document.removeEventListener("click", initStream)
          document.removeEventListener("touchstart", initStream)
          document.removeEventListener("keydown", initStream)
        } catch (error) {
          console.error("Error accessing microphone:", error)
          if (this.onErrorCallback) {
            this.onErrorCallback({
              error: "microphone-access",
              message: "Could not access microphone. Please check permissions.",
              originalError: error,
            })
          }
        }
      }

      // Wait for user interaction to request microphone access
      document.addEventListener("click", initStream, { once: true })
      document.addEventListener("touchstart", initStream, { once: true })
      document.addEventListener("keydown", initStream, { once: true })

      // Also try to initialize on DOMContentLoaded if possible
      if (document.readyState === "interactive" || document.readyState === "complete") {
        try {
          // Try to get user media without user interaction (might work if permission already granted)
          await navigator.mediaDevices.getUserMedia({ audio: true })
          initStream()
        } catch (e) {
          console.log("Will try again on user interaction", e)
        }
      } else {
        document.addEventListener("DOMContentLoaded", async () => {
          try {
            await navigator.mediaDevices.getUserMedia({ audio: true })
            initStream()
          } catch (e) {
            console.log("Will try again on user interaction", e)
          }
        })
      }
    } catch (error) {
      console.error("Error initializing audio context:", error)
    }
  }

  private startVoiceActivityDetection() {
    if (!this.audioAnalyser) return

    const bufferLength = this.audioAnalyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const checkVoiceActivity = () => {
      if (!this.audioAnalyser) return

      this.audioAnalyser.getByteFrequencyData(dataArray)

      // Calculate average volume
      let sum = 0
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i]
      }
      const average = sum / bufferLength

      // Detect voice activity
      const wasVoiceDetected = this.isVoiceDetected
      this.isVoiceDetected = average > this.voiceActivityThreshold

      // If voice activity state changed
      if (this.isVoiceDetected !== wasVoiceDetected) {
        if (this.isVoiceDetected) {
          // Voice started
          this.handleVoiceActivityStart()

          // Clear no-speech timer if it exists
          if (this.noSpeechTimer) {
            clearTimeout(this.noSpeechTimer)
            this.noSpeechTimer = null
          }
        } else {
          // Voice stopped
          this.handleVoiceActivityEnd()
        }
      }

      // Continue checking
      this.voiceActivityDetectionTimer = setTimeout(checkVoiceActivity, 50) // Reduced to 50ms for faster response
    }

    checkVoiceActivity()
  }

  private handleVoiceActivityStart() {
    // If the assistant is speaking, this is an interruption
    const conversationState = this.conversationManager.getState()

    if (conversationState.assistantState === "speaking") {
      // Interrupt the assistant
      try {
        // Use the imported function instead of require
        const tts = getEnhancedElevenLabsTTS()
        if (tts && tts.speaking) {
          tts.interrupt()
        }
      } catch (error) {
        console.error("Error interrupting TTS:", error)
      }
    }

    // If not already listening, start speech recognition
    if (!this.isListening) {
      this.start(true)
    }
  }

  private handleVoiceActivityEnd() {
    // Voice activity ended, but we'll let the speech recognition
    // continue running to capture any final words

    // If we're speaking and there's no pause timer yet, start one
    if (this.isSpeaking && !this.pauseTimer && this.lastSpeechTime) {
      this.pauseTimer = setTimeout(() => {
        // User has paused speaking
        this.isSpeaking = false
        this.conversationManager.userStopsSpeaking(this.transcript)
        this.pauseTimer = null

        // Process the transcript immediately
        if (this.transcript && !this.processingFinalTranscript) {
          this.processingFinalTranscript = true
          if (this.onResultCallback) {
            this.onResultCallback(this.transcript, true)
          }
          this.transcript = ""
          this.processingFinalTranscript = false
        }
      }, this.pauseThreshold)
    }
  }

  private handleResult(event: any): void {
    this.interimTranscript = ""
    let finalTranscript = ""

    // Process results
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript
      } else {
        this.interimTranscript += event.results[i][0].transcript
      }
    }

    // Update transcript
    if (finalTranscript) {
      this.transcript += finalTranscript
    }

    // Detect if user is speaking
    const currentSpeech = this.interimTranscript || finalTranscript

    if (currentSpeech && currentSpeech.trim().length >= this.minSpeechSegmentLength) {
      this.lastSpeechTime = Date.now()

      // Reset no-speech retry count since we got speech
      this.noSpeechRetryCount = 0

      // Clear no-speech timer if it exists
      if (this.noSpeechTimer) {
        clearTimeout(this.noSpeechTimer)
        this.noSpeechTimer = null
      }

      // If not already marked as speaking, signal speech start
      if (!this.isSpeaking) {
        this.isSpeaking = true
        this.conversationManager.userStartsSpeaking()
      }

      // Clear any existing pause timer
      if (this.pauseTimer) {
        clearTimeout(this.pauseTimer)
        this.pauseTimer = null
      }
    } else if (this.isSpeaking && this.lastSpeechTime) {
      // If no new speech, start pause timer if not already started
      if (!this.pauseTimer) {
        this.pauseTimer = setTimeout(() => {
          // User has paused speaking
          this.isSpeaking = false
          this.conversationManager.userStopsSpeaking(finalTranscript || this.transcript)
          this.pauseTimer = null

          // Process the transcript immediately
          if (this.transcript && !this.processingFinalTranscript) {
            this.processingFinalTranscript = true
            if (this.onResultCallback) {
              this.onResultCallback(this.transcript, true)
            }
            this.transcript = ""
            this.processingFinalTranscript = false
          }
        }, this.pauseThreshold)
      }
    }

    // Call callback with results
    if (this.onResultCallback && !this.processingFinalTranscript) {
      const isFinal = finalTranscript.length > 0
      this.onResultCallback(isFinal ? finalTranscript : this.interimTranscript, isFinal)
    }
  }

  private handleEnd(): void {
    this.isListening = false

    // If was speaking, signal stop
    if (this.isSpeaking) {
      this.isSpeaking = false
      this.conversationManager.userStopsSpeaking(this.transcript)

      // Process any remaining transcript
      if (this.transcript && !this.processingFinalTranscript) {
        this.processingFinalTranscript = true
        if (this.onResultCallback) {
          this.onResultCallback(this.transcript, true)
        }
        this.transcript = ""
        this.processingFinalTranscript = false
      }
    }

    // Clear pause timer if exists
    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer)
      this.pauseTimer = null
    }

    // Clear no-speech timer if exists
    if (this.noSpeechTimer) {
      clearTimeout(this.noSpeechTimer)
      this.noSpeechTimer = null
    }

    // Auto restart if enabled - restart immediately
    if (this.autoRestartOnEnd) {
      setTimeout(() => this.start(true), 50) // Minimal delay for restart
    } else if (this.onEndCallback) {
      this.onEndCallback()
    }
  }

  private handleStart(): void {
    this.isListening = true
    this.transcript = ""
    this.interimTranscript = ""
    this.lastSpeechTime = null
    this.isSpeaking = false
    this.processingFinalTranscript = false

    // Set up no-speech timer
    if (this.noSpeechTimer) {
      clearTimeout(this.noSpeechTimer)
    }

    this.noSpeechTimer = setTimeout(() => {
      // If we haven't detected speech within the timeout period
      if (!this.lastSpeechTime && this.isListening) {
        console.log(`No speech detected within ${this.noSpeechTimeout}ms timeout`)

        // Stop the current recognition
        this.stop()

        // Notify about the no-speech error
        if (this.onErrorCallback) {
          this.onErrorCallback({
            error: "no-speech",
            message: "No speech detected. Please try speaking again.",
          })
        }

        // Auto-retry if we haven't exceeded max retries
        if (this.noSpeechRetryCount < this.maxNoSpeechRetries && this.autoRestartOnEnd) {
          console.log(
            `Auto-retrying speech recognition (attempt ${this.noSpeechRetryCount + 1}/${this.maxNoSpeechRetries})`,
          )
          this.noSpeechRetryCount++

          // Wait a moment before restarting
          setTimeout(() => {
            this.start(this.autoRestartOnEnd)
          }, 100) // Reduced to 100ms for faster recovery
        } else {
          // Reset retry count after max retries
          this.noSpeechRetryCount = 0
        }
      }
    }, this.noSpeechTimeout)

    if (this.onStartCallback) {
      this.onStartCallback()
    }
  }

  private handleError(event: any): void {
    console.error("Speech recognition error:", event.error, event)

    // If was speaking, signal stop
    if (this.isSpeaking) {
      this.isSpeaking = false
      this.conversationManager.userStopsSpeaking()
    }

    // Create a more detailed error object
    const errorDetails = {
      error: event.error,
      message: this.getErrorMessage(event.error),
      originalEvent: event,
    }

    if (this.onErrorCallback) {
      this.onErrorCallback(errorDetails)
    }

    // Handle specific errors
    if (event.error === "aborted") {
      console.log("Recognition aborted, attempting recovery...")

      // Create a new recognition instance
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      this.recognition = new SpeechRecognition()

      // Reconfigure
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.lang = "en-US"

      // Reattach event handlers
      this.recognition.onresult = this.handleResult.bind(this)
      this.recognition.onend = this.handleEnd.bind(this)
      this.recognition.onstart = this.handleStart.bind(this)
      this.recognition.onerror = this.handleError.bind(this)

      // Restart after a delay
      if (this.autoRestartOnEnd) {
        setTimeout(() => {
          try {
            this.recognition.start()
          } catch (e) {
            console.error("Failed to restart after aborted error:", e)
          }
        }, 1000)
      }
    }
    // Auto restart on certain errors
    else if (event.error === "network" || event.error === "aborted") {
      setTimeout(() => {
        if (this.autoRestartOnEnd) {
          this.start()
        }
      }, 1000) // Increased to 1000ms for more reliable recovery
    } else if (event.error === "no-speech") {
      // Handle no-speech error with auto-retry logic
      if (this.noSpeechRetryCount < this.maxNoSpeechRetries && this.autoRestartOnEnd) {
        console.log(
          `Auto-retrying after no-speech error (attempt ${this.noSpeechRetryCount + 1}/${this.maxNoSpeechRetries})`,
        )
        this.noSpeechRetryCount++

        // Wait a moment before restarting
        setTimeout(() => {
          this.start(this.autoRestartOnEnd)
        }, 500) // Increased to 500ms for more reliable recovery
      } else {
        // Reset retry count after max retries
        this.noSpeechRetryCount = 0
      }
    }
  }

  // Helper method to get user-friendly error messages
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case "no-speech":
        return "No speech was detected. Please try speaking again or check your microphone."
      case "aborted":
        return "Speech recognition was aborted. This may be due to a system interruption."
      case "audio-capture":
        return "No microphone was found or microphone is not accessible."
      case "network":
        return "Network error occurred. Please check your internet connection."
      case "not-allowed":
        return "Microphone access was denied. Please allow microphone access in your browser settings."
      case "service-not-allowed":
        return "Speech recognition service is not allowed. This may be a browser restriction."
      case "bad-grammar":
        return "Speech grammar error occurred."
      case "language-not-supported":
        return "The selected language is not supported."
      default:
        return `Speech recognition error: ${errorCode}`
    }
  }

  start(autoRestart = false): void {
    if (!this.recognition) {
      console.error("Speech recognition not initialized")
      return
    }

    this.autoRestartOnEnd = autoRestart

    try {
      console.log("Starting speech recognition...")
      this.recognition.start()
    } catch (e) {
      console.error("Error starting speech recognition:", e)

      // If already started, stop and restart
      if ((e as any).name === "InvalidStateError") {
        console.log("Recognition already started, stopping and restarting...")
        try {
          this.recognition.stop()
        } catch (stopError) {
          console.error("Error stopping recognition:", stopError)

          // If we can't stop it, create a new instance
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
          this.recognition = new SpeechRecognition()

          // Reconfigure
          this.recognition.continuous = true
          this.recognition.interimResults = true
          this.recognition.lang = "en-US"

          // Reattach event handlers
          this.recognition.onresult = this.handleResult.bind(this)
          this.recognition.onend = this.handleEnd.bind(this)
          this.recognition.onstart = this.handleStart.bind(this)
          this.recognition.onerror = this.handleError.bind(this)
        }

        // Try again after a short delay
        setTimeout(() => {
          try {
            this.recognition.start()
          } catch (restartError) {
            console.error("Failed to restart recognition:", restartError)
          }
        }, 300)
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

    // If was speaking, signal stop
    if (this.isSpeaking) {
      this.isSpeaking = false
      this.conversationManager.userStopsSpeaking(this.transcript)

      // Process any remaining transcript
      if (this.transcript && !this.processingFinalTranscript) {
        this.processingFinalTranscript = true
        if (this.onResultCallback) {
          this.onResultCallback(this.transcript, true)
        }
        this.transcript = ""
        this.processingFinalTranscript = false
      }
    }

    // Clear pause timer if exists
    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer)
      this.pauseTimer = null
    }

    // Clear no-speech timer if exists
    if (this.noSpeechTimer) {
      clearTimeout(this.noSpeechTimer)
      this.noSpeechTimer = null
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

  get speaking(): boolean {
    return this.isSpeaking
  }

  getCurrentTranscript(): string {
    return this.transcript || this.interimTranscript
  }

  clearTranscript(): void {
    this.transcript = ""
    this.interimTranscript = ""
  }

  // Update noise filter settings
  updateNoiseFilter(options: NoiseFilterOptions): void {
    if (this.useNoiseFilter) {
      getNoiseFilter().updateOptions(options)
    }
  }

  // Toggle noise filter on/off
  setNoiseFilterEnabled(enabled: boolean): void {
    this.useNoiseFilter = enabled

    if (enabled && this.audioStream) {
      // Re-initialize with noise filtering
      getNoiseFilter()
        .initialize(this.audioStream)
        .then((filteredStream) => {
          this.processedStream = filteredStream
        })
    }
  }

  // Update speech enhancer settings
  updateSpeechEnhancer(options: SpeechEnhancerOptions): void {
    if (this.useSpeechEnhancer) {
      getSpeechEnhancer().updateOptions(options)
    }
  }

  // Toggle speech enhancer on/off
  setSpeechEnhancerEnabled(enabled: boolean): void {
    this.useSpeechEnhancer = enabled

    if (enabled && this.audioStream) {
      // Re-initialize with speech enhancement
      getSpeechEnhancer()
        .initialize(this.audioStream)
        .then((enhancedStream) => {
          this.processedStream = enhancedStream

          // Apply noise filter after speech enhancement if enabled
          if (this.useNoiseFilter) {
            getNoiseFilter()
              .initialize(enhancedStream)
              .then((filteredStream) => {
                this.processedStream = filteredStream
              })
          }
        })
    }
  }

  // Start noise calibration
  calibrateNoiseProfile(): void {
    if (this.useNoiseFilter) {
      getNoiseFilter().startNoiseProfileCalibration()
    }
  }

  cleanup(): void {
    console.log("Cleaning up speech recognition resources...")

    // Stop voice activity detection
    if (this.voiceActivityDetectionTimer) {
      clearTimeout(this.voiceActivityDetectionTimer)
      this.voiceActivityDetectionTimer = null
    }

    // Clear no-speech timer if exists
    if (this.noSpeechTimer) {
      clearTimeout(this.noSpeechTimer)
      this.noSpeechTimer = null
    }

    // Stop speech recognition
    if (this.isListening) {
      try {
        this.stop()
      } catch (e) {
        console.error("Error stopping recognition during cleanup:", e)
      }
    }

    // Clean up speech enhancer
    if (this.useSpeechEnhancer) {
      try {
        getSpeechEnhancer().dispose()
      } catch (error) {
        console.error("Error disposing speech enhancer:", error)
      }
    }

    // Clean up noise filter
    if (this.useNoiseFilter) {
      try {
        getNoiseFilter().dispose()
      } catch (error) {
        console.error("Error disposing noise filter:", error)
      }
    }

    // Stop audio stream
    if (this.audioStream) {
      try {
        this.audioStream.getTracks().forEach((track) => track.stop())
      } catch (e) {
        console.error("Error stopping audio stream:", e)
      }
      this.audioStream = null
    }

    if (this.processedStream && this.processedStream !== this.audioStream) {
      try {
        this.processedStream.getTracks().forEach((track) => track.stop())
      } catch (e) {
        console.error("Error stopping processed stream:", e)
      }
      this.processedStream = null
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== "closed") {
      try {
        this.audioContext.close()
      } catch (e) {
        console.error("Error closing audio context:", e)
      }
      this.audioContext = null
    }

    this.audioAnalyser = null

    // Reset instance to allow fresh initialization
    enhancedRecognitionInstance = null
  }
}

// Singleton instance
let enhancedRecognitionInstance: EnhancedSpeechRecognition | null = null

export function getEnhancedSpeechRecognition(options?: EnhancedSpeechRecognitionOptions): EnhancedSpeechRecognition {
  if (!enhancedRecognitionInstance) {
    console.log("Creating new EnhancedSpeechRecognition instance")
    enhancedRecognitionInstance = new EnhancedSpeechRecognition(options)
  } else if (options) {
    // If options are provided and instance exists, check if we need to recreate
    if (
      (options.noiseFilter !== undefined &&
        typeof enhancedRecognitionInstance.useNoiseFilter !== typeof options.noiseFilter) ||
      (options.speechEnhancer !== undefined &&
        typeof enhancedRecognitionInstance.useSpeechEnhancer !== typeof options.speechEnhancer)
    ) {
      console.log("Recreating EnhancedSpeechRecognition instance with new options")
      enhancedRecognitionInstance.cleanup()
      enhancedRecognitionInstance = new EnhancedSpeechRecognition(options)
    } else {
      // Just update options if possible
      console.log("Updating existing EnhancedSpeechRecognition instance")
      if (typeof options.noiseFilter === "object" && enhancedRecognitionInstance.updateNoiseFilter) {
        enhancedRecognitionInstance.updateNoiseFilter(options.noiseFilter)
      }
      if (typeof options.speechEnhancer === "object" && enhancedRecognitionInstance.updateSpeechEnhancer) {
        enhancedRecognitionInstance.updateSpeechEnhancer(options.speechEnhancer)
      }
    }
  }

  return enhancedRecognitionInstance
}
