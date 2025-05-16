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
  maxRestartAttempts?: number // maximum number of restart attempts for aborted errors
  fallbackMode?: boolean // use simpler recognition settings for better compatibility
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
  private restartAttempts = 0
  private maxRestartAttempts: number
  private restartTimer: NodeJS.Timeout | null = null
  private isRecovering = false
  private lastErrorTime = 0
  private consecutiveErrors = 0
  private recognitionInitialized = false
  private fallbackMode: boolean
  private cooldownTimer: NodeJS.Timeout | null = null
  private inCooldown = false
  private errorResetTimer: NodeJS.Timeout | null = null

  constructor(options: EnhancedSpeechRecognitionOptions = {}) {
    // Check if browser supports speech recognition
    if (typeof window === "undefined" || (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window))) {
      console.error("Speech recognition not supported in this browser")
      return
    }

    // Set maximum restart attempts
    this.maxRestartAttempts = options.maxRestartAttempts || 5

    // Set fallback mode
    this.fallbackMode = options.fallbackMode || false

    // Initialize speech recognition with a delay to ensure browser is ready
    setTimeout(() => {
      this.initRecognition()
    }, 500)

    // Configure
    this.pauseThreshold = options.pauseThreshold || (this.fallbackMode ? 1000 : 500)
    this.minSpeechSegmentLength = options.minSpeechSegmentLength || 2
    this.voiceActivityThreshold = options.voiceActivityThreshold || 12
    this.autoStart = options.autoStart !== undefined ? options.autoStart : true
    this.maxNoSpeechRetries = options.maxNoSpeechRetries || (this.fallbackMode ? 2 : 3)
    this.noSpeechTimeout = options.noSpeechTimeout || (this.fallbackMode ? 10000 : 8000)

    // Configure noise filter - disabled in fallback mode
    this.useNoiseFilter =
      options.noiseFilter !== undefined
        ? typeof options.noiseFilter === "boolean"
          ? options.noiseFilter && !this.fallbackMode
          : !this.fallbackMode
        : !this.fallbackMode

    if (typeof options.noiseFilter === "object" && !this.fallbackMode) {
      this.noiseFilterOptions = options.noiseFilter
    }

    // Configure speech enhancer - disabled in fallback mode
    this.useSpeechEnhancer =
      options.speechEnhancer !== undefined
        ? typeof options.speechEnhancer === "boolean"
          ? options.speechEnhancer && !this.fallbackMode
          : !this.fallbackMode
        : !this.fallbackMode

    if (typeof options.speechEnhancer === "object" && !this.fallbackMode) {
      this.speechEnhancerOptions = options.speechEnhancer
    }

    // Initialize audio context for voice activity detection
    this.initAudioContext()

    // Auto-start if enabled - with a delay to ensure everything is initialized
    if (this.autoStart && typeof window !== "undefined") {
      setTimeout(() => {
        if (document.readyState === "interactive" || document.readyState === "complete") {
          this.tryAutoStart()
        } else {
          document.addEventListener("DOMContentLoaded", this.tryAutoStart.bind(this))
        }

        // Also try on first user interaction
        const startOnInteraction = () => {
          this.start(true)
          document.removeEventListener("click", startOnInteraction)
          document.removeEventListener("touchstart", startOnInteraction)
          document.removeEventListener("keydown", startOnInteraction)
        }

        document.addEventListener("click", startOnInteraction)
        document.addEventListener("touchstart", startOnInteraction)
        document.addEventListener("keydown", startOnInteraction)
      }, 1000) // Longer delay for more reliable initialization
    }

    // Set up error reset timer
    this.errorResetTimer = setInterval(() => {
      // Reset error counts after 30 seconds if no new errors
      const now = Date.now()
      if (now - this.lastErrorTime > 30000) {
        this.consecutiveErrors = 0
        this.restartAttempts = 0
      }
    }, 30000)
  }

  private initRecognition() {
    try {
      // Initialize speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      this.recognition = new SpeechRecognition()

      // Configure - use simpler settings in fallback mode
      this.recognition.continuous = !this.fallbackMode
      this.recognition.interimResults = !this.fallbackMode
      this.recognition.lang = "en-US"

      // In fallback mode, use shorter recognition periods
      if (this.fallbackMode) {
        this.recognition.maxAlternatives = 1
      }

      // Set up event handlers
      this.recognition.onresult = this.handleResult.bind(this)
      this.recognition.onend = this.handleEnd.bind(this)
      this.recognition.onstart = this.handleStart.bind(this)
      this.recognition.onerror = this.handleError.bind(this)

      this.recognitionInitialized = true
      console.log(`Speech recognition initialized successfully (fallback mode: ${this.fallbackMode})`)
    } catch (error) {
      console.error("Failed to initialize speech recognition:", error)
      this.recognitionInitialized = false

      // Try again after a delay
      setTimeout(() => this.initRecognition(), 2000)
    }
  }

  private tryAutoStart() {
    // Try to start recognition immediately
    try {
      if (this.recognitionInitialized && !this.inCooldown) {
        this.start(true)
      } else {
        console.log("Recognition not initialized yet or in cooldown, delaying auto-start")
        setTimeout(() => this.tryAutoStart(), 1000)
      }
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

          // Apply speech enhancement if enabled and not in fallback mode
          if (this.useSpeechEnhancer && !this.fallbackMode) {
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

          // Apply noise filtering if enabled and not in fallback mode
          if (this.useNoiseFilter && !this.fallbackMode) {
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
      this.voiceActivityDetectionTimer = setTimeout(checkVoiceActivity, 50)
    }

    checkVoiceActivity()
  }

  private handleVoiceActivityStart() {
    // If the assistant is speaking, this is an interruption
    const conversationState = this.conversationManager.getState()

    if (conversationState.assistantState === "speaking") {
      // Interrupt the assistant
      try {
        const tts = getEnhancedElevenLabsTTS()
        if (tts && tts.speaking) {
          tts.interrupt()
        }
      } catch (error) {
        console.error("Error interrupting TTS:", error)
      }
    }

    // If not already listening and not in recovery mode or cooldown, start speech recognition
    if (!this.isListening && !this.isRecovering && !this.inCooldown) {
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

    // Reset consecutive errors since we're getting results
    this.consecutiveErrors = 0
    this.restartAttempts = 0
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

    // Auto restart if enabled and not in recovery mode or cooldown
    if (this.autoRestartOnEnd && !this.isRecovering && !this.inCooldown) {
      // Use a progressive backoff for restart attempts
      const delay = Math.min(50 * Math.pow(1.5, this.consecutiveErrors), 2000)

      setTimeout(() => {
        if (!this.isRecovering && !this.inCooldown) {
          this.start(true)
        }
      }, delay)
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
    this.isRecovering = false

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
        if (this.noSpeechRetryCount < this.maxNoSpeechRetries && this.autoRestartOnEnd && !this.inCooldown) {
          console.log(
            `Auto-retrying speech recognition (attempt ${this.noSpeechRetryCount + 1}/${this.maxNoSpeechRetries})`,
          )
          this.noSpeechRetryCount++

          // Wait a moment before restarting
          setTimeout(() => {
            if (!this.inCooldown) {
              this.start(this.autoRestartOnEnd)
            }
          }, 100)
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
    console.log("Speech recognition error:", event.error, event)

    // If was speaking, signal stop
    if (this.isSpeaking) {
      this.isSpeaking = false
      this.conversationManager.userStopsSpeaking()
    }

    // Track consecutive errors
    const now = Date.now()
    if (now - this.lastErrorTime < 5000) {
      this.consecutiveErrors++
    } else {
      this.consecutiveErrors = 1
    }
    this.lastErrorTime = now

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

      // Enter cooldown mode to prevent rapid restarts
      this.enterCooldown(2000 * Math.min(this.consecutiveErrors, 5))

      // Set recovery mode to prevent multiple restart attempts
      this.isRecovering = true

      // Clear any existing restart timer
      if (this.restartTimer) {
        clearTimeout(this.restartTimer)
      }

      // Increment restart attempts
      this.restartAttempts++

      if (this.restartAttempts <= this.maxRestartAttempts) {
        console.log(`Attempting recovery (${this.restartAttempts}/${this.maxRestartAttempts})`)

        // Use exponential backoff for restart attempts
        const backoffDelay = Math.min(1000 * Math.pow(1.5, this.restartAttempts - 1), 10000)

        this.restartTimer = setTimeout(() => {
          // Completely reinitialize the recognition instance
          this.initRecognition()

          // Wait a bit more before starting
          setTimeout(() => {
            this.isRecovering = false
            if (this.autoRestartOnEnd && !this.inCooldown) {
              this.start(true)
            }
          }, 500)
        }, backoffDelay)
      } else {
        console.log("Maximum restart attempts reached, giving up automatic recovery")
        this.isRecovering = false

        // Enter a longer cooldown period
        this.enterCooldown(30000)

        // Notify user that they need to manually restart
        if (this.onErrorCallback) {
          this.onErrorCallback({
            error: "recovery-failed",
            message: "Speech recognition recovery failed. Please try reloading the page.",
          })
        }
      }
    }
    // Auto restart on certain errors
    else if (event.error === "network") {
      // Enter cooldown mode
      this.enterCooldown(5000)

      // Use a longer delay for network errors
      setTimeout(() => {
        if (this.autoRestartOnEnd && !this.isRecovering && !this.inCooldown) {
          this.start()
        }
      }, 2000)
    } else if (event.error === "no-speech") {
      // Handle no-speech error with auto-retry logic
      if (this.noSpeechRetryCount < this.maxNoSpeechRetries && this.autoRestartOnEnd && !this.inCooldown) {
        console.log(
          `Auto-retrying after no-speech error (attempt ${this.noSpeechRetryCount + 1}/${this.maxNoSpeechRetries})`,
        )
        this.noSpeechRetryCount++

        // Wait a moment before restarting
        setTimeout(() => {
          if (!this.inCooldown) {
            this.start(this.autoRestartOnEnd)
          }
        }, 500)
      } else {
        // Reset retry count after max retries
        this.noSpeechRetryCount = 0

        // Enter a short cooldown
        this.enterCooldown(2000)
      }
    }
  }

  // Enter cooldown mode to prevent rapid restarts
  private enterCooldown(duration: number) {
    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer)
    }

    this.inCooldown = true
    console.log(`Entering cooldown mode for ${duration}ms`)

    this.cooldownTimer = setTimeout(() => {
      console.log("Exiting cooldown mode")
      this.inCooldown = false

      // Try to restart if we should be listening
      if (this.autoRestartOnEnd && !this.isRecovering) {
        setTimeout(() => this.start(true), 500)
      }
    }, duration)
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
    if (!this.recognition || !this.recognitionInitialized) {
      console.error("Speech recognition not initialized")
      this.initRecognition() // Try to reinitialize
      return
    }

    // Don't start if in cooldown
    if (this.inCooldown) {
      console.log("In cooldown period, not starting recognition")
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
          this.initRecognition()
        }

        // Try again after a short delay
        setTimeout(() => {
          try {
            if (this.recognitionInitialized && !this.inCooldown) {
              this.recognition.start()
            } else {
              console.log("Recognition not initialized yet or in cooldown, delaying start")
              setTimeout(() => this.start(autoRestart), 1000)
            }
          } catch (restartError) {
            console.error("Failed to restart recognition:", restartError)

            // Enter cooldown mode
            this.enterCooldown(3000)
          }
        }, 300)
      } else {
        // For other errors, enter cooldown
        this.enterCooldown(2000)
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

  handleError(event: any) {
    console.warn("Speech recognition error:", event.error)

    // For aborted errors, try to recover silently first
    if (event.error === "aborted") {
      // Only emit the error if we're not already trying to restart
      if (!this.restartTimer) {
        this.onErrorCallback({
          error: `Speech recognition was aborted. This may be due to a system interruption.`,
          message: "Speech recognition was interrupted. Attempting to restart...",
        })
      }

      // Always try to restart if we were listening
      if (this.isListening) {
        this.scheduleRestart()
      }
      return
    }

    // For other errors, emit the error with appropriate message
    let message = "An error occurred with speech recognition."

    switch (event.error) {
      case "network":
        message = "A network error occurred. Please check your connection."
        break
      case "not-allowed":
      case "service-not-allowed":
        message = "Microphone access is not allowed. Please check your browser permissions."
        break
      case "no-speech":
        message = "No speech was detected. Please try again."
        break
      default:
        message = `Speech recognition error: ${event.error}`
    }

    this.onErrorCallback({
      error: event.error,
      message,
    })

    // For most errors, we should still try to restart if we were listening
    if (this.isListening && event.error !== "not-allowed" && event.error !== "service-not-allowed") {
      this.scheduleRestart()
    }
  }

  private scheduleRestart() {
    // Clear any existing restart timer
    if (this.restartTimer) {
      clearTimeout(this.restartTimer)
    }

    // Use exponential backoff for restart delays
    const baseDelay = 1000 // 1 second base
    const maxDelay = 10000 // 10 seconds max
    const randomFactor = Math.random() * 0.5 + 0.75 // Random factor between 0.75 and 1.25

    // Calculate delay with jitter
    const delay = Math.min(baseDelay * Math.pow(1.5, this.restartAttempts) * randomFactor, maxDelay)

    console.log(`Scheduling speech recognition restart in ${Math.round(delay)}ms (attempt ${this.restartAttempts + 1})`)

    this.restartTimer = setTimeout(() => {
      this.restartTimer = null
      this.restartAttempts++

      if (this.isListening) {
        try {
          this.recognition?.start()
          console.log("Speech recognition restarted")
        } catch (error) {
          console.error("Error restarting speech recognition:", error)

          // If we failed to restart, try again with increased delay
          if (this.restartAttempts < 5) {
            this.scheduleRestart()
          } else {
            // After too many attempts, emit a more serious error
            this.onErrorCallback({
              error: "Failed to restart speech recognition after multiple attempts",
              message: "Speech recognition is having trouble. Please try again later or use text input.",
            })
          }
        }
      }
    }, delay)
  }

  public reset() {
    this.stop()
    this.restartAttempts = 0

    // Re-initialize the recognition system
    if (this.recognition) {
      this.recognition = null
      this.initRecognition()
    }
  }

  setNoiseFilterEnabled(enabled: boolean): void {
    this.useNoiseFilter = enabled
  }

  calibrateNoiseProfile(): void {
    // Implementation would go here
    console.log("Calibrating noise profile...")
  }

  cleanup(): void {
    // Stop recognition if running
    if (this.isListening) {
      this.stop()
    }

    // Clear all timers
    if (this.pauseTimer) clearTimeout(this.pauseTimer)
    if (this.noSpeechTimer) clearTimeout(this.noSpeechTimer)
    if (this.voiceActivityDetectionTimer) clearTimeout(this.voiceActivityDetectionTimer)
    if (this.restartTimer) clearTimeout(this.restartTimer)
    if (this.cooldownTimer) clearTimeout(this.cooldownTimer)
    if (this.errorResetTimer) clearInterval(this.errorResetTimer)

    // Close audio context
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(console.error)
    }

    // Stop all media streams
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop())
    }
    if (this.processedStream && this.processedStream !== this.audioStream) {
      this.processedStream.getTracks().forEach((track) => track.stop())
    }
  }

  reset(): void {
    this.stop()
    this.clearTranscript()
    this.restartAttempts = 0
    this.noSpeechRetryCount = 0
    this.consecutiveErrors = 0
    this.isRecovering = false
    this.inCooldown = false

    // Re-initialize recognition
    this.initRecognition()
  }
}

// Add a factory function to create and return an instance of EnhancedSpeechRecognition
let enhancedSpeechRecognitionInstance: EnhancedSpeechRecognition | null = null

export function getEnhancedSpeechRecognition(
  options: EnhancedSpeechRecognitionOptions = {},
): EnhancedSpeechRecognition {
  if (!enhancedSpeechRecognitionInstance) {
    enhancedSpeechRecognitionInstance = new EnhancedSpeechRecognition(options)
  } else {
    // If we already have an instance but new options are provided, reset it with new options
    if (Object.keys(options).length > 0) {
      enhancedSpeechRecognitionInstance.cleanup()
      enhancedSpeechRecognitionInstance = new EnhancedSpeechRecognition(options)
    }
  }
  return enhancedSpeechRecognitionInstance
}
