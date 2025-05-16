// ElevenLabs TTS API client

interface ElevenLabsOptions {
  apiKey: string
  voiceId: string
  model?: string
  stability?: number
  similarityBoost?: number
  style?: number
  useSpeakerBoost?: boolean
}

interface TextToSpeechOptions {
  text: string
  voiceId?: string
  model?: string
  stability?: number
  similarityBoost?: number
  style?: number
  useSpeakerBoost?: boolean
}

class ElevenLabsTTS {
  private apiKey: string
  private voiceId: string
  private model: string
  private stability: number
  private similarityBoost: number
  private style: number
  private useSpeakerBoost: boolean
  private audioContext: AudioContext | null = null
  private audioSource: AudioBufferSourceNode | null = null
  private audioQueue: Array<{ text: string; onStart?: () => void; onEnd?: () => void }> = []
  private isPlaying = false
  private isSpeaking = false
  private abortController: AbortController | null = null

  constructor(options: ElevenLabsOptions) {
    this.apiKey = options.apiKey
    this.voiceId = options.voiceId
    this.model = options.model || "eleven_turbo_v2"
    this.stability = options.stability !== undefined ? options.stability : 0.5
    this.similarityBoost = options.similarityBoost !== undefined ? options.similarityBoost : 0.75
    this.style = options.style !== undefined ? options.style : 0.0
    this.useSpeakerBoost = options.useSpeakerBoost !== undefined ? options.useSpeakerBoost : true

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

  async speak(text: string, onStart?: () => void, onEnd?: () => void): Promise<void> {
    // Add to queue
    this.audioQueue.push({ text, onStart, onEnd })

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
    const { text, onStart, onEnd } = this.audioQueue.shift()!

    try {
      this.isSpeaking = true

      // Create a new abort controller for this request
      this.abortController = new AbortController()

      // Call onStart callback
      if (onStart) onStart()

      // Get audio data
      const audioData = await this.textToSpeech({ text })

      // If we've been interrupted, don't play
      if (this.abortController.signal.aborted) {
        throw new Error("Speech interrupted")
      }

      // Play audio
      await this.playAudio(audioData)

      // Call onEnd callback
      if (onEnd) onEnd()
    } catch (error) {
      console.error("Error in TTS:", error)
    } finally {
      this.isSpeaking = false

      // Process next item in queue
      this.processQueue()
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
            if (this.abortController?.signal.aborted) {
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

    // Clear the queue
    this.audioQueue = []
    this.isPlaying = false
    this.isSpeaking = false
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
}

// Singleton instance
let ttsInstance: ElevenLabsTTS | null = null

export function getElevenLabsTTS(apiKey?: string, voiceId?: string): ElevenLabsTTS {
  if (!ttsInstance && apiKey && voiceId) {
    ttsInstance = new ElevenLabsTTS({
      apiKey,
      voiceId,
      stability: 0.5,
      similarityBoost: 0.75,
    })
  }

  if (!ttsInstance) {
    throw new Error("ElevenLabs TTS not initialized. Provide apiKey and voiceId.")
  }

  return ttsInstance
}

export function initElevenLabsTTS(apiKey: string, voiceId: string): ElevenLabsTTS {
  ttsInstance = new ElevenLabsTTS({
    apiKey,
    voiceId,
    stability: 0.5,
    similarityBoost: 0.75,
  })

  return ttsInstance
}
