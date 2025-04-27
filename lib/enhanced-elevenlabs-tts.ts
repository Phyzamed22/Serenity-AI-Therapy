import { getConversationManager } from "./conversation-manager"

interface EnhancedElevenLabsOptions {
  apiKey: string
  voiceId: string
  model?: string
  stability?: number
  similarityBoost?: number
  style?: number
  useSpeakerBoost?: boolean
  sentenceDelimiters?: string[] // Characters that mark sentence boundaries
  pauseBetweenSentences?: number // ms to pause between sentences
  allowInterruptions?: boolean
}

interface TextToSpeechOptions {
  text: string
  voiceId?: string
  model?: string
  stability?: number
  similarityBoost?: number
  style?: number
  useSpeakerBoost?: boolean
  onSentenceStart?: (sentence: string, index: number) => void
  onSentenceEnd?: (sentence: string, index: number) => void
}

export class EnhancedElevenLabsTTS {
  private apiKey: string
  private voiceId: string
  private model: string
  private stability: number
  private similarityBoost: number
  private style: number
  private useSpeakerBoost: boolean
  private audioContext: AudioContext | null = null
  private audioSource: AudioBufferSourceNode | null = null
  private audioQueue: Array<{
    text: string
    onStart?: () => void
    onEnd?: () => void
    onSentenceStart?: (sentence: string, index: number) => void
    onSentenceEnd?: (sentence: string, index: number) => void
  }> = []
  private isPlaying = false
  private isSpeaking = false
  private abortController: AbortController | null = null
  private sentenceDelimiters: string[]
  private pauseBetweenSentences: number
  private allowInterruptions: boolean
  private currentSentences: string[] = []
  private currentSentenceIndex = 0
  private sentencePauseTimer: NodeJS.Timeout | null = null
  private conversationManager = getConversationManager()
  private interruptionInProgress = false

  constructor(options: EnhancedElevenLabsOptions) {
    this.apiKey = options.apiKey
    this.voiceId = options.voiceId
    this.model = options.model || "eleven_turbo_v2"
    this.stability = options.stability !== undefined ? options.stability : 0.5
    this.similarityBoost = options.similarityBoost !== undefined ? options.similarityBoost : 0.75
    this.style = options.style !== undefined ? options.style : 0.0
    this.useSpeakerBoost = options.useSpeakerBoost !== undefined ? options.useSpeakerBoost : true
    this.sentenceDelimiters = options.sentenceDelimiters || [".", "!", "?", ";", ":", "\n"]
    this.pauseBetweenSentences = options.pauseBetweenSentences || 300
    this.allowInterruptions = options.allowInterruptions !== undefined ? options.allowInterruptions : true

    // Initialize audio context on user interaction
    const initAudioContext = () => {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      document.removeEventListener("click", initAudioContext)
      document.removeEventListener("touchstart", initAudioContext)
    }

    document.addEventListener("click", initAudioContext)
    document.addEventListener("touchstart", initAudioContext)
  }

  // Split text into sentences
  private splitIntoSentences(text: string): string[] {
    if (!text) return []

    // Create a regex pattern from the delimiters
    const pattern = `[${this.sentenceDelimiters.map((d) => "\\" + d).join("")}]`
    const regex = new RegExp(`${pattern}\\s*`, "g")

    // Split by delimiters and filter out empty strings
    const sentences = text
      .split(regex)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    return sentences
  }

  async textToSpeech(options: TextToSpeechOptions): Promise<ArrayBuffer> {
    const voiceId = options.voiceId || this.voiceId
    const model = options.model || this.model

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`

    const requestBody = {
      text: options.text,
      model_id: model,
      voice_settings: {
        stability: options.stability !== undefined ? options.stability : this.stability,
        similarity_boost: options.similarityBoost !== undefined ? options.similarityBoost : this.similarityBoost,
        style: options.style !== undefined ? options.style : this.style,
        use_speaker_boost: options.useSpeakerBoost !== undefined ? options.useSpeakerBoost : this.useSpeakerBoost,
      },
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": this.apiKey,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`)
    }

    return await response.arrayBuffer()
  }

  async speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onSentenceStart?: (sentence: string, index: number) => void,
    onSentenceEnd?: (sentence: string, index: number) => void,
  ): Promise<void> {
    // Add to queue
    this.audioQueue.push({
      text,
      onStart,
      onEnd,
      onSentenceStart,
      onSentenceEnd,
    })

    // If not already playing, start the queue
    if (!this.isPlaying) {
      this.processQueue()
    }
  }

  private async processQueue(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false
      return
    }

    this.isPlaying = true
    const { text, onStart, onEnd, onSentenceStart, onSentenceEnd } = this.audioQueue.shift()!

    try {
      this.isSpeaking = true
      this.interruptionInProgress = false
      this.conversationManager.assistantStartsSpeaking()

      // Create a new abort controller for this request
      this.abortController = new AbortController()

      // Call onStart callback
      if (onStart) onStart()

      // Split text into sentences
      this.currentSentences = this.splitIntoSentences(text)
      this.currentSentenceIndex = 0

      // If we have sentences, process them one by one
      if (this.currentSentences.length > 0) {
        await this.processSentences(this.currentSentences, onSentenceStart, onSentenceEnd)
      } else {
        // If no sentences, just get audio for the whole text
        const audioData = await this.textToSpeech({ text })

        // If we've been interrupted, don't play
        if (this.abortController.signal.aborted) {
          throw new Error("Speech interrupted")
        }

        // Play audio
        await this.playAudio(audioData)
      }

      // Call onEnd callback
      if (onEnd) onEnd()

      // Signal that assistant has stopped speaking
      this.conversationManager.assistantStopsSpeaking(text)
    } catch (error) {
      console.error("Error in TTS:", error)

      // If it was an interruption, signal that
      if ((error as Error).message === "Speech interrupted") {
        this.conversationManager.assistantStopsSpeaking()
      }
    } finally {
      this.isSpeaking = false
      this.currentSentences = []
      this.currentSentenceIndex = 0

      // Process next item in queue
      this.processQueue()
    }
  }

  private async processSentences(
    sentences: string[],
    onSentenceStart?: (sentence: string, index: number) => void,
    onSentenceEnd?: (sentence: string, index: number) => void,
  ): Promise<void> {
    for (let i = 0; i < sentences.length; i++) {
      // Check if we've been interrupted
      if (this.abortController?.signal.aborted || this.interruptionInProgress) {
        throw new Error("Speech interrupted")
      }

      const sentence = sentences[i]
      this.currentSentenceIndex = i

      // Call sentence start callback
      if (onSentenceStart) {
        onSentenceStart(sentence, i)
      }

      // Get audio for this sentence
      const audioData = await this.textToSpeech({ text: sentence })

      // Check if we've been interrupted again
      if (this.abortController?.signal.aborted || this.interruptionInProgress) {
        throw new Error("Speech interrupted")
      }

      // Play audio for this sentence
      await this.playAudio(audioData)

      // Call sentence end callback
      if (onSentenceEnd) {
        onSentenceEnd(sentence, i)
      }

      // Pause between sentences if not the last one
      if (i < sentences.length - 1 && this.pauseBetweenSentences > 0) {
        await new Promise<void>((resolve, reject) => {
          this.sentencePauseTimer = setTimeout(() => {
            // Check for interruption during pause
            if (this.abortController?.signal.aborted || this.interruptionInProgress) {
              reject(new Error("Speech interrupted during pause"))
            } else {
              this.sentencePauseTimer = null
              resolve()
            }
          }, this.pauseBetweenSentences)
        })
      }
    }
  }

  private async playAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    // Stop any currently playing audio
    if (this.audioSource) {
      this.audioSource.stop()
      this.audioSource = null
    }

    return new Promise((resolve, reject) => {
      this.audioContext!.decodeAudioData(
        audioData,
        (buffer) => {
          // Create a new source
          const source = this.audioContext!.createBufferSource()
          source.buffer = buffer
          source.connect(this.audioContext!.destination)

          // Set up callbacks
          source.onended = () => {
            this.audioSource = null
            resolve()
          }

          // Store the source
          this.audioSource = source

          // Start playback
          source.start(0)

          // Check for interruption
          const checkInterruption = () => {
            if (this.abortController?.signal.aborted || this.interruptionInProgress) {
              source.stop()
              this.audioSource = null
              reject(new Error("Playback interrupted"))
            } else if (this.audioSource === source) {
              requestAnimationFrame(checkInterruption)
            }
          }

          requestAnimationFrame(checkInterruption)
        },
        reject,
      )
    })
  }

  interrupt(): void {
    // Mark interruption in progress
    this.interruptionInProgress = true

    // Stop current speech
    if (this.isSpeaking && this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }

    // Stop audio playback
    if (this.audioSource) {
      this.audioSource.stop()
      this.audioSource = null
    }

    // Clear sentence pause timer if exists
    if (this.sentencePauseTimer) {
      clearTimeout(this.sentencePauseTimer)
      this.sentencePauseTimer = null
    }

    // Clear the queue
    this.audioQueue = []
    this.isPlaying = false
    this.isSpeaking = false

    // Signal that assistant has stopped speaking due to interruption
    this.conversationManager.assistantStopsSpeaking()
  }

  pause(): void {
    if (this.audioContext && this.audioContext.state === "running") {
      this.audioContext.suspend()
    }
  }

  resume(): void {
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume()
    }
  }

  get speaking(): boolean {
    return this.isSpeaking
  }

  getCurrentSentence(): string | null {
    if (this.currentSentences.length > 0 && this.currentSentenceIndex < this.currentSentences.length) {
      return this.currentSentences[this.currentSentenceIndex]
    }
    return null
  }

  setAllowInterruptions(allow: boolean): void {
    this.allowInterruptions = allow
  }
}

// Singleton instance
let enhancedTtsInstance: EnhancedElevenLabsTTS | null = null

export function getEnhancedElevenLabsTTS(
  apiKey?: string,
  voiceId?: string,
  options?: Partial<EnhancedElevenLabsOptions>,
): EnhancedElevenLabsTTS {
  if (!enhancedTtsInstance && apiKey && voiceId) {
    enhancedTtsInstance = new EnhancedElevenLabsTTS({
      apiKey,
      voiceId,
      ...options,
    })
  } else if (enhancedTtsInstance && apiKey && voiceId && options) {
    // If options are provided and instance exists, create a new instance
    enhancedTtsInstance = new EnhancedElevenLabsTTS({
      apiKey,
      voiceId,
      ...options,
    })
  }

  if (!enhancedTtsInstance) {
    throw new Error("ElevenLabs TTS not initialized. Provide apiKey and voiceId.")
  }

  return enhancedTtsInstance
}

export function initEnhancedElevenLabsTTS(
  apiKey: string,
  voiceId: string,
  options?: Partial<EnhancedElevenLabsOptions>,
): EnhancedElevenLabsTTS {
  enhancedTtsInstance = new EnhancedElevenLabsTTS({
    apiKey,
    voiceId,
    ...options,
  })

  return enhancedTtsInstance
}
