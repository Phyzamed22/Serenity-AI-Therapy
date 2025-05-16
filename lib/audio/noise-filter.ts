export interface NoiseFilterOptions {
  noiseGateThreshold?: number // 0-100, default 15
  adaptiveThreshold?: boolean // automatically adjust threshold based on environment
  highPassFilter?: boolean // filter out low frequencies
  highPassFrequency?: number // cutoff frequency for high pass filter
  spectralSubtraction?: boolean // use spectral subtraction for noise reduction
  dynamicCompression?: boolean // use dynamic compression
}

class NoiseFilter {
  private audioContext: AudioContext | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private destinationNode: MediaStreamAudioDestinationNode | null = null
  private analyserNode: AnalyserNode | null = null
  private gainNode: GainNode | null = null
  private options: NoiseFilterOptions = {
    noiseGateThreshold: 15,
    adaptiveThreshold: true,
    highPassFilter: true,
    highPassFrequency: 85,
    spectralSubtraction: false, // Disabled by default for stability
    dynamicCompression: true,
  }
  private noiseProfile: Float32Array | null = null
  private isCalibrating = false
  private calibrationSamples: Float32Array[] = []
  private initialized = false

  constructor(options?: NoiseFilterOptions) {
    if (options) {
      this.options = { ...this.options, ...options }
    }
  }

  async initialize(stream: MediaStream): Promise<MediaStream> {
    console.log("Initializing noise filter with options:", this.options)

    try {
      // If already initialized, clean up first
      if (this.initialized) {
        this.dispose()
      }

      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Create nodes
      this.sourceNode = this.audioContext.createMediaStreamSource(stream)
      this.destinationNode = this.audioContext.createMediaStreamDestination()
      this.analyserNode = this.audioContext.createAnalyser()
      this.gainNode = this.audioContext.createGain()

      // Configure analyzer
      this.analyserNode.fftSize = 2048
      this.analyserNode.smoothingTimeConstant = 0.8

      // Simple connection for now - just pass through with gain control
      // We'll add more complex filtering later when we confirm this works
      this.sourceNode.connect(this.gainNode)
      this.gainNode.connect(this.analyserNode)
      this.analyserNode.connect(this.destinationNode)

      this.initialized = true
      console.log("Noise filter initialized successfully")

      // Return the filtered stream
      return this.destinationNode.stream
    } catch (error) {
      console.error("Error initializing noise filter:", error)
      // Return the original stream as fallback
      return stream
    }
  }

  updateOptions(options: NoiseFilterOptions): void {
    this.options = { ...this.options, ...options }
    console.log("Noise filter options updated:", this.options)

    // Apply new options if initialized
    if (this.initialized && this.gainNode) {
      // For now, just update the gain node as a simple example
      // We'll add more complex filtering later
      this.gainNode.gain.value = 1.0 // Default gain
    }
  }

  startNoiseProfileCalibration(): void {
    if (!this.initialized || !this.analyserNode) {
      console.error("Cannot calibrate: noise filter not initialized")
      return
    }

    console.log("Starting noise profile calibration...")
    this.isCalibrating = true
    this.calibrationSamples = []

    // Collect samples for 2 seconds
    const sampleInterval = setInterval(() => {
      if (this.analyserNode && this.isCalibrating) {
        const dataArray = new Float32Array(this.analyserNode.frequencyBinCount)
        this.analyserNode.getFloatFrequencyData(dataArray)
        this.calibrationSamples.push(dataArray)
      }

      // Stop after collecting enough samples (2 seconds worth)
      if (this.calibrationSamples.length >= 20) {
        clearInterval(sampleInterval)
        this.finishCalibration()
      }
    }, 100)

    // Safety timeout
    setTimeout(() => {
      if (this.isCalibrating) {
        clearInterval(sampleInterval)
        this.finishCalibration()
      }
    }, 3000)
  }

  private finishCalibration(): void {
    if (!this.analyserNode) return

    console.log("Finishing noise profile calibration...")
    this.isCalibrating = false

    // Create average noise profile
    const binCount = this.analyserNode.frequencyBinCount
    this.noiseProfile = new Float32Array(binCount)

    // Initialize with minimum values
    for (let i = 0; i < binCount; i++) {
      this.noiseProfile[i] = -100
    }

    // Find maximum value for each frequency bin
    this.calibrationSamples.forEach((sample) => {
      for (let i = 0; i < binCount; i++) {
        if (sample[i] > this.noiseProfile![i]) {
          this.noiseProfile![i] = sample[i]
        }
      }
    })

    console.log("Noise profile calibration complete")
  }

  dispose(): void {
    console.log("Disposing noise filter resources")

    // Disconnect nodes
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect()
      } catch (e) {
        console.error("Error disconnecting source node:", e)
      }
      this.sourceNode = null
    }

    if (this.gainNode) {
      try {
        this.gainNode.disconnect()
      } catch (e) {
        console.error("Error disconnecting gain node:", e)
      }
      this.gainNode = null
    }

    if (this.analyserNode) {
      try {
        this.analyserNode.disconnect()
      } catch (e) {
        console.error("Error disconnecting analyser node:", e)
      }
      this.analyserNode = null
    }

    if (this.destinationNode) {
      try {
        this.destinationNode.disconnect()
      } catch (e) {
        console.error("Error disconnecting destination node:", e)
      }
      this.destinationNode = null
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

    this.initialized = false
    this.noiseProfile = null
    this.calibrationSamples = []
  }
}

// Singleton instance
let noiseFilterInstance: NoiseFilter | null = null

export function getNoiseFilter(options?: NoiseFilterOptions): NoiseFilter {
  if (!noiseFilterInstance) {
    noiseFilterInstance = new NoiseFilter(options)
  } else if (options) {
    noiseFilterInstance.updateOptions(options)
  }

  return noiseFilterInstance
}
