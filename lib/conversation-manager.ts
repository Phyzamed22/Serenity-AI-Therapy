// Conversation manager for handling real-time conversation dynamics

export type SpeakerState = "idle" | "thinking" | "speaking" | "listening" | "interrupted"

export interface ConversationState {
  userState: SpeakerState
  assistantState: SpeakerState
  currentSpeaker: "user" | "assistant" | "none"
  lastSpeaker: "user" | "assistant" | "none"
  userSpeakingStartTime: number | null
  assistantSpeakingStartTime: number | null
  userPauseDuration: number
  assistantPauseDuration: number
  interruptionCount: number
  conversationTurns: number
  isProcessingInterruption: boolean
}

export interface ConversationManagerOptions {
  // Time in ms to wait after user stops speaking before assistant responds
  userPauseThreshold?: number
  // Time in ms to wait between assistant sentences
  assistantPauseThreshold?: number
  // Whether to allow user to interrupt assistant
  allowInterruptions?: boolean
  // Callback when conversation state changes
  onStateChange?: (state: ConversationState) => void
}

export class ConversationManager {
  private state: ConversationState
  private options: Required<ConversationManagerOptions>
  private userPauseTimer: NodeJS.Timeout | null = null
  private assistantPauseTimer: NodeJS.Timeout | null = null
  private userSpeechBuffer: string[] = []
  private assistantSpeechBuffer: string[] = []
  private interruptedAssistantSpeech: string | null = null
  private interruptionCooldown: NodeJS.Timeout | null = null

  constructor(options?: ConversationManagerOptions) {
    this.options = {
      userPauseThreshold: options?.userPauseThreshold ?? 500, // Reduced from 1500ms to 500ms
      assistantPauseThreshold: options?.assistantPauseThreshold ?? 100, // Reduced from 300ms to 100ms
      allowInterruptions: options?.allowInterruptions ?? true,
      onStateChange: options?.onStateChange ?? (() => {}),
    }

    this.state = {
      userState: "idle",
      assistantState: "idle",
      currentSpeaker: "none",
      lastSpeaker: "none",
      userSpeakingStartTime: null,
      assistantSpeakingStartTime: null,
      userPauseDuration: 0,
      assistantPauseDuration: 0,
      interruptionCount: 0,
      conversationTurns: 0,
      isProcessingInterruption: false,
    }
  }

  // User starts speaking
  public userStartsSpeaking(): void {
    const wasInterruption = this.state.assistantState === "speaking"

    // Handle interruption if assistant was speaking
    if (wasInterruption && this.options.allowInterruptions) {
      this.handleInterruption("user")
    }

    // Update state
    this.setState({
      userState: "speaking",
      currentSpeaker: "user",
      userSpeakingStartTime: Date.now(),
      userPauseDuration: 0,
    })

    // Clear any existing user pause timer
    if (this.userPauseTimer) {
      clearTimeout(this.userPauseTimer)
      this.userPauseTimer = null
    }
  }

  // User stops speaking
  public userStopsSpeaking(finalTranscript?: string): void {
    if (this.state.userState !== "speaking") return

    // Add to speech buffer if provided
    if (finalTranscript) {
      this.userSpeechBuffer.push(finalTranscript)
    }

    // Update state
    this.setState({
      userState: "idle",
      lastSpeaker: "user",
    })

    // Start pause timer - reduced delay for more responsive turn-taking
    this.userPauseTimer = setTimeout(() => {
      this.handleUserPauseComplete()
    }, this.options.userPauseThreshold)
  }

  // Assistant starts speaking
  public assistantStartsSpeaking(): void {
    const wasInterruption = this.state.userState === "speaking"

    // Handle interruption if user was speaking
    if (wasInterruption && this.options.allowInterruptions) {
      this.handleInterruption("assistant")
    }

    // Update state
    this.setState({
      assistantState: "speaking",
      currentSpeaker: "assistant",
      assistantSpeakingStartTime: Date.now(),
      assistantPauseDuration: 0,
    })

    // Clear any existing assistant pause timer
    if (this.assistantPauseTimer) {
      clearTimeout(this.assistantPauseTimer)
      this.assistantPauseTimer = null
    }
  }

  // Assistant stops speaking
  public assistantStopsSpeaking(finalSpeech?: string): void {
    if (this.state.assistantState !== "speaking") return

    // Add to speech buffer if provided
    if (finalSpeech) {
      this.assistantSpeechBuffer.push(finalSpeech)
    }

    // Update state
    this.setState({
      assistantState: "idle",
      lastSpeaker: "assistant",
    })

    // Start pause timer - reduced delay for more responsive turn-taking
    this.assistantPauseTimer = setTimeout(() => {
      this.handleAssistantPauseComplete()
    }, this.options.assistantPauseThreshold)
  }

  // Assistant is thinking (generating response)
  public assistantStartsThinking(): void {
    this.setState({
      assistantState: "thinking",
      currentSpeaker: "assistant",
    })
  }

  // Assistant stops thinking
  public assistantStopsThinking(): void {
    if (this.state.assistantState !== "thinking") return

    this.setState({
      assistantState: "idle",
    })
  }

  // Handle user pause complete (user has stopped speaking for threshold duration)
  private handleUserPauseComplete(): void {
    // If user has started speaking again, ignore
    if (this.state.userState === "speaking") return

    // If we have speech in the buffer, increment conversation turns
    if (this.userSpeechBuffer.length > 0) {
      this.setState({
        conversationTurns: this.state.conversationTurns + 1,
      })
    }

    // Signal that assistant can now respond
    this.setState({
      assistantState: "listening",
      currentSpeaker: "none",
    })
  }

  // Handle assistant pause complete
  private handleAssistantPauseComplete(): void {
    // If assistant has started speaking again, ignore
    if (this.state.assistantState === "speaking") return

    // If we have speech in the buffer, increment conversation turns
    if (this.assistantSpeechBuffer.length > 0) {
      this.setState({
        conversationTurns: this.state.conversationTurns + 1,
      })
    }

    // Signal that user can now speak
    this.setState({
      userState: "listening",
      currentSpeaker: "none",
    })
  }

  // Handle interruption
  private handleInterruption(interrupter: "user" | "assistant"): void {
    // Increment interruption count
    this.setState({
      interruptionCount: this.state.interruptionCount + 1,
      isProcessingInterruption: true,
    })

    if (interrupter === "user") {
      // User interrupted assistant
      this.setState({
        assistantState: "interrupted",
      })

      // Store the interrupted speech if needed for later
      // This could be used to resume where left off or acknowledge the interruption
      if (this.assistantSpeechBuffer.length > 0) {
        this.interruptedAssistantSpeech = this.assistantSpeechBuffer[this.assistantSpeechBuffer.length - 1]
      }
    } else {
      // Assistant interrupted user
      this.setState({
        userState: "interrupted",
      })
    }

    // After a short delay, clear the interruption state
    // Reduced from 500ms to 200ms for faster recovery
    if (this.interruptionCooldown) {
      clearTimeout(this.interruptionCooldown)
    }

    this.interruptionCooldown = setTimeout(() => {
      this.setState({
        isProcessingInterruption: false,
        userState: this.state.userState === "interrupted" ? "idle" : this.state.userState,
        assistantState: this.state.assistantState === "interrupted" ? "idle" : this.state.assistantState,
      })
      this.interruptionCooldown = null
    }, 200)
  }

  // Get the current conversation state
  public getState(): ConversationState {
    return { ...this.state }
  }

  // Update state and trigger callback
  private setState(partialState: Partial<ConversationState>): void {
    this.state = { ...this.state, ...partialState }
    this.options.onStateChange(this.state)
  }

  // Get user speech buffer and clear it
  public getUserSpeech(): string[] {
    const speech = [...this.userSpeechBuffer]
    this.userSpeechBuffer = []
    return speech
  }

  // Get assistant speech buffer and clear it
  public getAssistantSpeech(): string[] {
    const speech = [...this.assistantSpeechBuffer]
    this.assistantSpeechBuffer = []
    return speech
  }

  // Get interrupted assistant speech
  public getInterruptedSpeech(): string | null {
    return this.interruptedAssistantSpeech
  }

  // Clear interrupted speech
  public clearInterruptedSpeech(): void {
    this.interruptedAssistantSpeech = null
  }

  // Reset conversation state
  public reset(): void {
    if (this.userPauseTimer) {
      clearTimeout(this.userPauseTimer)
      this.userPauseTimer = null
    }

    if (this.assistantPauseTimer) {
      clearTimeout(this.assistantPauseTimer)
      this.assistantPauseTimer = null
    }

    if (this.interruptionCooldown) {
      clearTimeout(this.interruptionCooldown)
      this.interruptionCooldown = null
    }

    this.userSpeechBuffer = []
    this.assistantSpeechBuffer = []
    this.interruptedAssistantSpeech = null

    this.setState({
      userState: "idle",
      assistantState: "idle",
      currentSpeaker: "none",
      lastSpeaker: "none",
      userSpeakingStartTime: null,
      assistantSpeakingStartTime: null,
      userPauseDuration: 0,
      assistantPauseDuration: 0,
      interruptionCount: 0,
      conversationTurns: 0,
      isProcessingInterruption: false,
    })
  }
}

// Create a singleton instance
let conversationManagerInstance: ConversationManager | null = null

export function getConversationManager(options?: ConversationManagerOptions): ConversationManager {
  if (!conversationManagerInstance) {
    conversationManagerInstance = new ConversationManager(options)
  } else if (options) {
    // If options are provided and instance exists, create a new instance
    conversationManagerInstance = new ConversationManager(options)
  }

  return conversationManagerInstance
}
