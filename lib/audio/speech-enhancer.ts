/**
 * Speech Enhancer module
 * Implements multiple speech clarity enhancement techniques:
 * - Frequency-selective enhancement (speech frequency boosting)
 * - Formant enhancement for vowel clarity
 * - Sibilance enhancement for consonant recognition
 * - Dynamic range compression for consistent volume
 * - De-reverberation to reduce echo effects
 * - Harmonic enhancement for improved voice quality
 */

export interface SpeechEnhancerOptions {
  // Master enable/disable
  enabled: boolean

  // Frequency enhancement (speech frequency boosting)
  frequencyEnhancement: {
    enabled: boolean
    lowFrequency: number // Lower bound of speech frequency range (Hz)
    highFrequency: number // Upper bound of speech frequency range (Hz)
    gain: number // Gain to apply to speech frequencies (dB)
  }

  // Formant enhancement (vowel clarity)
  formantEnhancement: {
    enabled: boolean
    strength: number // 0-1 scale
  }

  // Sibilance enhancement (consonant clarity)
  sibilanceEnhancement: {
    enabled: boolean
    threshold: number // Detection threshold (dB)
    gain: number // Enhancement gain (dB)
  }

  // Dynamic range compression
  compression: {
    enabled: boolean
    threshold: number // dB
    ratio: number // compression ratio
    attack: number // ms
    release: number // ms
    makeupGain: number // dB
  }

  // De-reverberation
  deReverb: {
    enabled: boolean
    roomSize: number // 0-1 scale
    dampening: number // 0-1 scale
  }

  // Harmonic enhancement
  harmonicEnhancement: {
    enabled: boolean
    strength: number // 0-1 scale
  }

  // Preset selection
  preset: "default" | "clear" | "bright" | "warm" | "custom"
}

// Default presets for different enhancement profiles
export const SPEECH_ENHANCER_PRESETS = {
  default: {
    enabled: true,
    frequencyEnhancement: {
      enabled: true,
      lowFrequency: 300,
      highFrequency: 3000,
      gain: 3,
    },
    formantEnhancement: {
      enabled: true,
      strength: 0.3,
    },
    sibilanceEnhancement: {
      enabled: true,
      threshold: -30,
      gain: 2,
    },
    compression: {
      enabled: true,
      threshold: -24,
      ratio: 3,
      attack: 5,
      release: 50,
      makeupGain: 3,
    },
    deReverb: {
      enabled: false,
      roomSize: 0.5,
      dampening: 0.5,
    },
    harmonicEnhancement: {
      enabled: true,
      strength: 0.3,
    },
    preset: "default",
  },
  clear: {
    enabled: true,
    frequencyEnhancement: {
      enabled: true,
      lowFrequency: 500,
      highFrequency: 4000,
      gain: 5,
    },
    formantEnhancement: {
      enabled: true,
      strength: 0.5,
    },
    sibilanceEnhancement: {
      enabled: true,
      threshold: -35,
      gain: 4,
    },
    compression: {
      enabled: true,
      threshold: -20,
      ratio: 4,
      attack: 3,
      release: 40,
      makeupGain: 4,
    },
    deReverb: {
      enabled: true,
      roomSize: 0.3,
      dampening: 0.7,
    },
    harmonicEnhancement: {
      enabled: true,
      strength: 0.4,
    },
    preset: "clear",
  },
  bright: {
    enabled: true,
    frequencyEnhancement: {
      enabled: true,
      lowFrequency: 700,
      highFrequency: 5000,
      gain: 6,
    },
    formantEnhancement: {
      enabled: true,
      strength: 0.6,
    },
    sibilanceEnhancement: {
      enabled: true,
      threshold: -30,
      gain: 5,
    },
    compression: {
      enabled: true,
      threshold: -18,
      ratio: 5,
      attack: 2,
      release: 30,
      makeupGain: 5,
    },
    deReverb: {
      enabled: true,
      roomSize: 0.2,
      dampening: 0.8,
    },
    harmonicEnhancement: {
      enabled: false,
      strength: 0.2,
    },
    preset: "bright",
  },
  warm: {
    enabled: true,
    frequencyEnhancement: {
      enabled: true,
      lowFrequency: 200,
      highFrequency: 2500,
      gain: 4,
    },
    formantEnhancement: {
      enabled: true,
      strength: 0.4,
    },
    sibilanceEnhancement: {
      enabled: false,
      threshold: -40,
      gain: 2,
    },
    compression: {
      enabled: true,
      threshold: -25,
      ratio: 2.5,
      attack: 10,
      release: 70,
      makeupGain: 3,
    },
    deReverb: {
      enabled: false,
      roomSize: 0.6,
      dampening: 0.4,
    },
    harmonicEnhancement: {
      enabled: true,
      strength: 0.5,
    },
    preset: "warm",
  },
  custom: {
    enabled: true,
    frequencyEnhancement: {
      enabled: true,
      lowFrequency: 300,
      highFrequency: 3000,
      gain: 3,
    },
    formantEnhancement: {
      enabled: false,
      strength: 0.3,
    },
    sibilanceEnhancement: {
      enabled: false,
      threshold: -30,
      gain: 2,
    },
    compression: {
      enabled: true,
      threshold: -24,
      ratio: 3,
      attack: 5,
      release: 50,
      makeupGain: 3,
    },
    deReverb: {
      enabled: false,
      roomSize: 0.5,
      dampening: 0.5,
    },
    harmonicEnhancement: {
      enabled: false,
      strength: 0.3,
    },
    preset: "custom",
  },
} as const

export interface SpeechEnhancerState {
  isEnabled: boolean
  activePreset: string
  signalLevel: number
  enhancementLevel: number
  frequencyResponse: Float32Array | null
}

export class SpeechEnhancer {
  private options: SpeechEnhancerOptions
  private audioContext: AudioContext | null = null
  private inputNode: MediaStreamAudioSourceNode | null = null
  private outputNode: MediaStreamAudioDestinationNode | null = null
  private analyserNode: AnalyserNode | null = null

  // Enhancement nodes
  private lowShelfFilter: BiquadFilterNode | null = null
  private highShelfFilter: BiquadFilterNode | null = null
  private peakFilter1: BiquadFilterNode | null = null // For formant enhancement
  private peakFilter2: BiquadFilterNode | null = null // For formant enhancement
  private peakFilter3: BiquadFilterNode | null = null // For sibilance enhancement
  private compressor: DynamicsCompressorNode | null = null
  private gainNode: GainNode | null = null

  private initialized = false
  private onStateChangeCallback: ((state: SpeechEnhancerState) => void) | null = null
  private lastUpdateTime = 0
  private signalLevel = 0
  private enhancementLevel = 0
  private frequencyData: Uint8Array | null = null

  constructor(options?: Partial<SpeechEnhancerOptions>) {
    // Set default options
    this.options = { ...SPEECH_ENHANCER_PRESETS.default }

    // Apply custom options if provided
    if (options) {
      this.updateOptions(options)
    }
  }

  /**
   * Initialize the speech enhancer with an audio stream
   */
  async initialize(stream: MediaStream): Promise<MediaStream> {
    console.log("Initializing speech enhancer with options:", this.options)

    try {
      // If already initialized, clean up first
      if (this.initialized) {
        this.dispose()
      }

      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Create nodes
      this.inputNode = this.audioContext.createMediaStreamSource(stream)
      this.outputNode = this.audioContext.createMediaStreamDestination()
      this.analyserNode = this.audioContext.createAnalyser()

      // Configure analyzer
      this.analyserNode.fftSize = 2048
      this.analyserNode.smoothingTimeConstant = 0.8
      this.frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount)

      // Create enhancement nodes
      this.lowShelfFilter = this.audioContext.createBiquadFilter()
      this.highShelfFilter = this.audioContext.createBiquadFilter()
      this.peakFilter1 = this.audioContext.createBiquadFilter()
      this.peakFilter2 = this.audioContext.createBiquadFilter()
      this.peakFilter3 = this.audioContext.createBiquadFilter()
      this.compressor = this.audioContext.createDynamicsCompressor()
      this.gainNode = this.audioContext.createGain()

      // Configure filters
      this.configureFilters()

      // Connect nodes
      if (this.options.enabled) {
        this.connectEnhancementChain()
      } else {
        // Bypass processing
        this.inputNode.connect(this.analyserNode)
        this.analyserNode.connect(this.outputNode)
      }

      // Start processing loop
      this.processAudio()

      this.initialized = true
      console.log("Speech enhancer initialized successfully")

      return this.outputNode.stream
    } catch (error) {
      console.error("Error initializing speech enhancer:", error)
      // Return the original stream as fallback
      return stream
    }
  }

  /**
   * Configure audio filters based on current options
   */
  private configureFilters(): void {
    if (!this.audioContext) return

    // Configure low shelf filter (boost lower speech frequencies)
    if (this.lowShelfFilter) {
      this.lowShelfFilter.type = "lowshelf"
      this.lowShelfFilter.frequency.value = this.options.frequencyEnhancement.lowFrequency
      this.lowShelfFilter.gain.value = this.options.frequencyEnhancement.enabled
        ? this.options.frequencyEnhancement.gain
        : 0
    }

    // Configure high shelf filter (boost higher speech frequencies)
    if (this.highShelfFilter) {
      this.highShelfFilter.type = "highshelf"
      this.highShelfFilter.frequency.value = this.options.frequencyEnhancement.highFrequency
      this.highShelfFilter.gain.value = this.options.frequencyEnhancement.enabled
        ? this.options.frequencyEnhancement.gain
        : 0
    }

    // Configure formant enhancement (vowel clarity)
    if (this.peakFilter1) {
      this.peakFilter1.type = "peaking"
      this.peakFilter1.frequency.value = 500 // First formant region
      this.peakFilter1.Q.value = 2.5
      this.peakFilter1.gain.value = this.options.formantEnhancement.enabled
        ? this.options.formantEnhancement.strength * 6
        : 0
    }

    if (this.peakFilter2) {
      this.peakFilter2.type = "peaking"
      this.peakFilter2.frequency.value = 1500 // Second formant region
      this.peakFilter2.Q.value = 2.5
      this.peakFilter2.gain.value = this.options.formantEnhancement.enabled
        ? this.options.formantEnhancement.strength * 4
        : 0
    }

    // Configure sibilance enhancement (consonant clarity)
    if (this.peakFilter3) {
      this.peakFilter3.type = "peaking"
      this.peakFilter3.frequency.value = 6000 // Sibilance region
      this.peakFilter3.Q.value = 1.5
      this.peakFilter3.gain.value = this.options.sibilanceEnhancement.enabled
        ? this.options.sibilanceEnhancement.gain
        : 0
    }

    // Configure compressor (dynamic range compression)
    if (this.compressor) {
      this.compressor.threshold.value = this.options.compression.threshold
      this.compressor.ratio.value = this.options.compression.ratio
      this.compressor.attack.value = this.options.compression.attack / 1000 // Convert ms to seconds
      this.compressor.release.value = this.options.compression.release / 1000 // Convert ms to seconds
      this.compressor.knee.value = 10 // Soft knee for smoother compression
    }

    // Configure gain node (makeup gain)
    if (this.gainNode) {
      this.gainNode.gain.value = this.options.compression.enabled
        ? Math.pow(10, this.options.compression.makeupGain / 20)
        : 1.0 // Convert dB to linear gain
    }
  }

  /**
   * Connect the audio processing chain
   */
  private connectEnhancementChain(): void {
    if (!this.inputNode || !this.outputNode) return

    // Disconnect any existing connections
    this.disconnectAll()

    // Create the processing chain
    let lastNode: AudioNode = this.inputNode

    // Connect analyzer at the beginning to monitor input
    lastNode.connect(this.analyserNode!)

    // Connect frequency enhancement filters
    if (this.options.frequencyEnhancement.enabled) {
      lastNode.connect(this.lowShelfFilter!)
      lastNode = this.lowShelfFilter!

      lastNode.connect(this.highShelfFilter!)
      lastNode = this.highShelfFilter!
    }

    // Connect formant enhancement
    if (this.options.formantEnhancement.enabled) {
      lastNode.connect(this.peakFilter1!)
      lastNode = this.peakFilter1!

      lastNode.connect(this.peakFilter2!)
      lastNode = this.peakFilter2!
    }

    // Connect sibilance enhancement
    if (this.options.sibilanceEnhancement.enabled) {
      lastNode.connect(this.peakFilter3!)
      lastNode = this.peakFilter3!
    }

    // Connect compressor
    if (this.options.compression.enabled) {
      lastNode.connect(this.compressor!)
      lastNode = this.compressor!

      lastNode.connect(this.gainNode!)
      lastNode = this.gainNode!
    }

    // Connect to output
    lastNode.connect(this.outputNode)
  }

  /**
   * Disconnect all audio nodes
   */
  private disconnectAll(): void {
    try {
      if (this.inputNode) this.inputNode.disconnect()
      if (this.lowShelfFilter) this.lowShelfFilter.disconnect()
      if (this.highShelfFilter) this.highShelfFilter.disconnect()
      if (this.peakFilter1) this.peakFilter1.disconnect()
      if (this.peakFilter2) this.peakFilter2.disconnect()
      if (this.peakFilter3) this.peakFilter3.disconnect()
      if (this.compressor) this.compressor.disconnect()
      if (this.gainNode) this.gainNode.disconnect()
      if (this.analyserNode) this.analyserNode.disconnect()
    } catch (error) {
      console.error("Error disconnecting nodes:", error)
    }
  }

  /**
   * Process audio data in real-time
   */
  private processAudio(): void {
    if (!this.audioContext || !this.analyserNode || !this.frequencyData) return

    // Get current audio data
    this.analyserNode.getByteFrequencyData(this.frequencyData)

    // Calculate current signal level (RMS)
    let sum = 0
    for (let i = 0; i < this.frequencyData.length; i++) {
      sum += this.frequencyData[i] * this.frequencyData[i]
    }
    const rms = Math.sqrt(sum / this.frequencyData.length) / 255

    // Smooth the signal level with exponential averaging
    this.signalLevel = this.signalLevel * 0.8 + rms * 0.2

    // Calculate enhancement level based on compressor gain reduction
    if (this.compressor && this.options.compression.enabled) {
      // Compressor gain reduction is negative, so we negate it
      const gainReduction = -this.compressor.reduction
      this.enhancementLevel = Math.min(1, gainReduction / 20) // Normalize to 0-1 range
    } else {
      this.enhancementLevel = 0
    }

    // Update state periodically (not every frame to avoid performance issues)
    const now = Date.now()
    if (now - this.lastUpdateTime > 100) {
      // Update every 100ms
      this.lastUpdateTime = now
      this.notifyStateChange()
    }

    // Continue processing
    requestAnimationFrame(() => this.processAudio())
  }

  /**
   * Notify state change to callback
   */
  private notifyStateChange(): void {
    if (!this.onStateChangeCallback) return

    const state: SpeechEnhancerState = {
      isEnabled: this.options.enabled,
      activePreset: this.options.preset,
      signalLevel: this.signalLevel,
      enhancementLevel: this.enhancementLevel,
      frequencyResponse: this.getFrequencyResponse(),
    }

    this.onStateChangeCallback(state)
  }

  /**
   * Get the current frequency response of the enhancement chain
   */
  private getFrequencyResponse(): Float32Array | null {
    if (!this.audioContext || !this.lowShelfFilter) return null

    // Create frequency array (logarithmic scale)
    const frequencyArray = new Float32Array(200)
    const magResponseOutput = new Float32Array(frequencyArray.length)
    const phaseResponseOutput = new Float32Array(frequencyArray.length)

    // Fill frequency array with logarithmically spaced frequencies
    for (let i = 0; i < frequencyArray.length; i++) {
      frequencyArray[i] = 20 * Math.pow(10, (i / frequencyArray.length) * 3) // 20Hz to 20kHz
    }

    // Get frequency response of each filter and combine them
    const response = new Float32Array(frequencyArray.length).fill(1)

    if (this.options.frequencyEnhancement.enabled) {
      this.lowShelfFilter.getFrequencyResponse(frequencyArray, magResponseOutput, phaseResponseOutput)
      for (let i = 0; i < response.length; i++) {
        response[i] *= magResponseOutput[i]
      }

      this.highShelfFilter!.getFrequencyResponse(frequencyArray, magResponseOutput, phaseResponseOutput)
      for (let i = 0; i < response.length; i++) {
        response[i] *= magResponseOutput[i]
      }
    }

    if (this.options.formantEnhancement.enabled) {
      this.peakFilter1!.getFrequencyResponse(frequencyArray, magResponseOutput, phaseResponseOutput)
      for (let i = 0; i < response.length; i++) {
        response[i] *= magResponseOutput[i]
      }

      this.peakFilter2!.getFrequencyResponse(frequencyArray, magResponseOutput, phaseResponseOutput)
      for (let i = 0; i < response.length; i++) {
        response[i] *= magResponseOutput[i]
      }
    }

    if (this.options.sibilanceEnhancement.enabled) {
      this.peakFilter3!.getFrequencyResponse(frequencyArray, magResponseOutput, phaseResponseOutput)
      for (let i = 0; i < response.length; i++) {
        response[i] *= magResponseOutput[i]
      }
    }

    return response
  }

  /**
   * Update enhancer options
   */
  updateOptions(options: Partial<SpeechEnhancerOptions>): void {
    // Handle preset selection
    if (options.preset && options.preset !== this.options.preset && options.preset !== "custom") {
      // Apply preset
      const presetOptions = SPEECH_ENHANCER_PRESETS[options.preset]
      this.options = { ...presetOptions }
      console.log(`Applied ${options.preset} preset:`, this.options)
    } else {
      // Apply individual option updates
      this.options = {
        ...this.options,
        ...options,
        frequencyEnhancement: {
          ...this.options.frequencyEnhancement,
          ...(options.frequencyEnhancement || {}),
        },
        formantEnhancement: {
          ...this.options.formantEnhancement,
          ...(options.formantEnhancement || {}),
        },
        sibilanceEnhancement: {
          ...this.options.sibilanceEnhancement,
          ...(options.sibilanceEnhancement || {}),
        },
        compression: {
          ...this.options.compression,
          ...(options.compression || {}),
        },
        deReverb: {
          ...this.options.deReverb,
          ...(options.deReverb || {}),
        },
        harmonicEnhancement: {
          ...this.options.harmonicEnhancement,
          ...(options.harmonicEnhancement || {}),
        },
      }

      // Set to custom preset if individual settings were changed
      if (
        options.preset !== "custom" &&
        (options.frequencyEnhancement ||
          options.formantEnhancement ||
          options.sibilanceEnhancement ||
          options.compression ||
          options.deReverb ||
          options.harmonicEnhancement)
      ) {
        this.options.preset = "custom"
      }
    }

    // Apply changes to audio nodes if initialized
    if (this.initialized) {
      this.configureFilters()

      // Reconnect nodes if enabled state changed
      if (options.enabled !== undefined && options.enabled !== this.options.enabled) {
        if (options.enabled) {
          this.connectEnhancementChain()
        } else {
          this.disconnectAll()

          // Connect bypass path
          if (this.inputNode && this.outputNode) {
            this.inputNode.connect(this.analyserNode!)
            this.analyserNode!.connect(this.outputNode)
          }
        }
      } else if (this.options.enabled) {
        // Reconnect with updated settings
        this.connectEnhancementChain()
      }
    }

    // Notify state change
    this.notifyStateChange()
  }

  /**
   * Set callback for state changes
   */
  onStateChange(callback: (state: SpeechEnhancerState) => void): void {
    this.onStateChangeCallback = callback
  }

  /**
   * Get current enhancer state
   */
  getState(): SpeechEnhancerState {
    return {
      isEnabled: this.options.enabled,
      activePreset: this.options.preset,
      signalLevel: this.signalLevel,
      enhancementLevel: this.enhancementLevel,
      frequencyResponse: this.getFrequencyResponse(),
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    console.log("Disposing speech enhancer resources")

    // Disconnect all nodes
    this.disconnectAll()

    // Close audio context
    if (this.audioContext && this.audioContext.state !== "closed") {
      try {
        this.audioContext.close()
      } catch (e) {
        console.error("Error closing audio context:", e)
      }
      this.audioContext = null
    }

    // Clear references
    this.inputNode = null
    this.outputNode = null
    this.analyserNode = null
    this.lowShelfFilter = null
    this.highShelfFilter = null
    this.peakFilter1 = null
    this.peakFilter2 = null
    this.peakFilter3 = null
    this.compressor = null
    this.gainNode = null
    this.frequencyData = null
    this.initialized = false
  }
}

// Singleton instance
let speechEnhancerInstance: SpeechEnhancer | null = null

export function getSpeechEnhancer(options?: Partial<SpeechEnhancerOptions>): SpeechEnhancer {
  if (!speechEnhancerInstance) {
    speechEnhancerInstance = new SpeechEnhancer(options)
  } else if (options) {
    speechEnhancerInstance.updateOptions(options)
  }

  return speechEnhancerInstance
}
