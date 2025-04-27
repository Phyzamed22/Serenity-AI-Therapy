"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Mic, Volume2, VolumeX, Pause, AlertCircle, RefreshCw, Settings } from "lucide-react"
import { initEnhancedElevenLabsTTS, getEnhancedElevenLabsTTS } from "@/lib/enhanced-elevenlabs-tts"
import { getEnhancedSpeechRecognition } from "@/lib/enhanced-speech-recognition"
import { getConversationManager, type SpeakerState, type ConversationState } from "@/lib/conversation-manager"
import { useToast } from "@/hooks/use-toast"
import { analyzeSentiment } from "./emotion-analyzer/text-sentiment-analyzer"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import NoiseFilterVisualizer from "./audio/noise-filter-visualizer"

interface RealTimeConversationInterfaceProps {
  onUserMessage: (message: string) => void
  onAssistantSpeaking: (isSpeaking: boolean) => void
  isGenerating: boolean
  assistantMessage: string | null
  apiKey: string
  voiceId: string
}

export default function RealTimeConversationInterface({
  onUserMessage,
  onAssistantSpeaking,
  isGenerating,
  assistantMessage,
  apiKey,
  voiceId,
}: RealTimeConversationInterfaceProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(true)
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [ttsInitialized, setTtsInitialized] = useState(false)
  const [recognitionSupported, setRecognitionSupported] = useState(true)
  const [conversationState, setConversationState] = useState<ConversationState | null>(null)
  const [currentSentence, setCurrentSentence] = useState<string | null>(null)
  const [autoInterrupt, setAutoInterrupt] = useState(true)
  const [microphoneError, setMicrophoneError] = useState<string | null>(null)
  const [ttsError, setTtsError] = useState<string | null>(null)
  const [noSpeechDetected, setNoSpeechDetected] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [showNoiseVisualizer, setShowNoiseVisualizer] = useState(false)
  const [noiseFilterEnabled, setNoiseFilterEnabled] = useState(true)
  const previousAssistantMessage = useRef<string | null>(null)
  const recognitionInstance = useRef<any>(null)
  const { toast } = useToast()

  // Initialize conversation manager, TTS, and speech recognition
  useEffect(() => {
    // Initialize conversation manager with faster response times
    const conversationManager = getConversationManager({
      userPauseThreshold: 500, // Reduced from 1500ms to 500ms
      assistantPauseThreshold: 100, // Reduced from 300ms to 100ms
      allowInterruptions: true,
      onStateChange: (state) => {
        setConversationState(state)
      },
    })

    // Initialize TTS
    try {
      if (apiKey && voiceId) {
        initEnhancedElevenLabsTTS(apiKey, voiceId, {
          pauseBetweenSentences: 100, // Reduced from 300ms to 100ms
          allowInterruptions: true,
        })
        setTtsInitialized(true)
        setTtsError(null)
      }
    } catch (error) {
      console.error("Error initializing TTS:", error)
      setTtsError("Could not initialize text-to-speech. Check your API key and voice ID.")
      toast({
        title: "TTS Error",
        description: "Could not initialize text-to-speech. Check your API key and voice ID.",
        variant: "destructive",
      })
    }

    // Check if speech recognition is supported
    if (typeof window === "undefined" || (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window))) {
      setRecognitionSupported(false)
      setMicrophoneError("Your browser doesn't support speech recognition. Try using Chrome or Edge.")
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser doesn't support speech recognition. Try using Chrome or Edge.",
        variant: "destructive",
      })
      return
    }

    // Initialize enhanced speech recognition with auto-start and faster response times
    try {
      const recognition = getEnhancedSpeechRecognition({
        continuous: true,
        interimResults: true,
        pauseThreshold: 500, // Reduced from 1000ms to 500ms
        autoStart: true, // Always auto-start
        voiceActivityThreshold: 12, // Lowered for better sensitivity
        noSpeechTimeout: 8000,
        maxNoSpeechRetries: 3,
        noiseFilter: {
          filteringEnabled: noiseFilterEnabled,
          noiseGateThreshold: 0.015,
          adaptiveThresholdEnabled: true,
          spectralSubtractionEnabled: true,
          environmentalProfilingEnabled: true,
        },
      })

      recognitionInstance.current = recognition

      recognition.onResult((text, isFinal) => {
        // Reset no-speech state if we get any results
        if (noSpeechDetected) {
          setNoSpeechDetected(false)
        }

        if (isFinal) {
          setTranscript(text)
          setInterimTranscript("")

          // Process final transcript immediately
          if (text && text.trim().length > 0) {
            // Analyze emotion before sending
            const emotionResult = analyzeSentiment(text)
            console.log("Voice input emotion:", emotionResult.emotion, "Confidence:", emotionResult.confidence)

            // Send message immediately when we get final transcript
            onUserMessage(text)
          }
        } else {
          setInterimTranscript(text)
        }
      })

      recognition.onStart(() => {
        setIsListening(true)
        setMicrophoneError(null)
      })

      recognition.onEnd(() => {
        setIsListening(false)
      })

      recognition.onError((error) => {
        console.error("Speech recognition error:", error)

        // Don't set isListening to false for no-speech errors to avoid UI flicker
        if (error.error !== "no-speech") {
          setIsListening(false)
        }

        if (error.error === "no-speech") {
          setNoSpeechDetected(true)
          setRetryCount((prev) => prev + 1)

          // After a few retries, show a more helpful message
          if (retryCount >= 2) {
            setMicrophoneError("No speech detected. Please check your microphone and try speaking again.")
            toast({
              title: "No Speech Detected",
              description: "We couldn't hear anything. Please check your microphone and try speaking again.",
              variant: "destructive",
            })
          }
        } else if (error.error === "not-allowed") {
          setMicrophoneError("Microphone access denied. Please allow microphone access in your browser settings.")
        } else if (error.error === "audio-capture") {
          setMicrophoneError("No microphone detected or microphone is in use by another application.")
        } else {
          setMicrophoneError(`Speech recognition error: ${error.message || error.error}`)
        }

        // Only show toast for non-no-speech errors or after multiple no-speech errors
        if (error.error !== "no-speech" || retryCount >= 2) {
          toast({
            title: "Speech Recognition Error",
            description: error.message || `Error: ${error.error}. Please try again.`,
            variant: "destructive",
          })
        }
      })
    } catch (error) {
      console.error("Error setting up speech recognition:", error)
      setMicrophoneError("Failed to initialize speech recognition. Please reload the page.")
    }

    // Cleanup
    return () => {
      if (recognitionInstance.current?.listening) {
        recognitionInstance.current.stop()
      }

      // Clean up resources
      recognitionInstance.current?.cleanup?.()

      if (ttsInitialized) {
        try {
          const tts = getEnhancedElevenLabsTTS()
          tts.interrupt()
        } catch (error) {
          console.error("Error cleaning up TTS:", error)
        }
      }
    }
  }, [apiKey, voiceId, toast, onAssistantSpeaking, ttsInitialized, onUserMessage, retryCount, noiseFilterEnabled])

  // Handle assistant message changes for TTS
  useEffect(() => {
    if (assistantMessage && assistantMessage !== previousAssistantMessage.current && ttsInitialized && isSpeaking) {
      try {
        const tts = getEnhancedElevenLabsTTS()

        // Interrupt if already speaking
        if (tts.speaking) {
          tts.interrupt()
        }

        // Speak new message
        onAssistantSpeaking(true)
        tts.speak(
          assistantMessage,
          () => {
            // onStart
            onAssistantSpeaking(true)
          },
          () => {
            // onEnd
            onAssistantSpeaking(false)
            setCurrentSentence(null)
          },
          (sentence) => {
            // onSentenceStart
            setCurrentSentence(sentence)
          },
          () => {
            // onSentenceEnd
            // We'll keep the current sentence until the next one starts
          },
        )

        previousAssistantMessage.current = assistantMessage
      } catch (error) {
        console.error("Error with TTS:", error)
        setTtsError("Failed to process text-to-speech. Please check your connection and try again.")
        onAssistantSpeaking(false)
      }
    }
  }, [assistantMessage, ttsInitialized, isSpeaking, onAssistantSpeaking])

  // Toggle auto-interrupt mode
  const toggleAutoInterrupt = () => {
    setAutoInterrupt(!autoInterrupt)

    // Update the conversation manager's allowInterruptions setting
    const conversationManager = getConversationManager({
      allowInterruptions: !autoInterrupt,
    })

    // Also update TTS settings if initialized
    if (ttsInitialized) {
      try {
        initEnhancedElevenLabsTTS(apiKey, voiceId, {
          allowInterruptions: !autoInterrupt,
        })
      } catch (error) {
        console.error("Error updating TTS settings:", error)
      }
    }
  }

  // Toggle noise filter
  const toggleNoiseFilter = () => {
    setNoiseFilterEnabled(!noiseFilterEnabled)

    if (recognitionInstance.current) {
      recognitionInstance.current.setNoiseFilterEnabled(!noiseFilterEnabled)
    }
  }

  // Recalibrate noise profile
  const recalibrateNoiseProfile = () => {
    if (recognitionInstance.current) {
      recognitionInstance.current.calibrateNoiseProfile()
      toast({
        title: "Noise Calibration Started",
        description: "Please remain quiet for a moment while we calibrate the noise profile.",
      })
    }
  }

  // Toggle speaking
  const toggleSpeaking = () => {
    setIsSpeaking(!isSpeaking)

    if (ttsInitialized) {
      try {
        const tts = getEnhancedElevenLabsTTS()

        if (isSpeaking) {
          // If turning off speaking, interrupt current speech
          tts.interrupt()
          onAssistantSpeaking(false)
        }
      } catch (error) {
        console.error("Error toggling TTS:", error)
        setTtsError("Failed to toggle speech. Please try again.")
      }
    }
  }

  // Interrupt assistant
  const interruptAssistant = () => {
    if (ttsInitialized) {
      try {
        const tts = getEnhancedElevenLabsTTS()
        tts.interrupt()
        onAssistantSpeaking(false)
      } catch (error) {
        console.error("Error interrupting TTS:", error)
        setTtsError("Failed to interrupt speech. Please try again.")
      }
    }
  }

  // Request microphone access manually
  const requestMicrophoneAccess = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      setMicrophoneError(null)
      setNoSpeechDetected(false)
      setRetryCount(0)

      // Reinitialize speech recognition
      if (recognitionInstance.current) {
        recognitionInstance.current.cleanup()
      }

      const recognition = getEnhancedSpeechRecognition({
        continuous: true,
        interimResults: true,
        pauseThreshold: 500,
        autoStart: true,
        voiceActivityThreshold: 12,
        noiseFilter: {
          filteringEnabled: noiseFilterEnabled,
          adaptiveThresholdEnabled: true,
          spectralSubtractionEnabled: true,
        },
      })

      recognitionInstance.current = recognition

      toast({
        title: "Microphone Access Granted",
        description: "You can now use voice input.",
      })
    } catch (error) {
      console.error("Failed to get microphone access:", error)
      setMicrophoneError("Microphone access denied. Please check your browser settings.")

      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access in your browser settings.",
        variant: "destructive",
      })
    }
  }

  // Reset speech recognition after no-speech error
  const resetSpeechRecognition = () => {
    setNoSpeechDetected(false)
    setRetryCount(0)
    setMicrophoneError(null)

    if (recognitionInstance.current) {
      // Stop current instance if running
      if (recognitionInstance.current.listening) {
        recognitionInstance.current.stop()
      }

      // Start fresh
      setTimeout(() => {
        recognitionInstance.current.start(true)
      }, 100)
    }

    toast({
      title: "Speech Recognition Reset",
      description: "Listening has been reset. Please try speaking again.",
    })
  }

  return (
    <div className="flex flex-col space-y-4">
      {/* Error messages */}
      {(microphoneError || ttsError) && (
        <Alert variant={noSpeechDetected ? "default" : "destructive"}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{microphoneError ? "Microphone Error" : "Speech Error"}</AlertTitle>
          <AlertDescription>
            {microphoneError || ttsError}
            <div className="mt-2 flex gap-2">
              {microphoneError && (
                <Button variant="outline" size="sm" onClick={requestMicrophoneAccess}>
                  Request Microphone Access
                </Button>
              )}
              {noSpeechDetected && (
                <Button variant="outline" size="sm" onClick={resetSpeechRecognition}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Reset Listening
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Settings */}
      <Card className="bg-background">
        <CardContent className="p-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-interrupt"
                  checked={autoInterrupt}
                  onCheckedChange={toggleAutoInterrupt}
                  disabled={!!microphoneError || !!ttsError}
                />
                <Label htmlFor="auto-interrupt">Auto-interrupt</Label>
              </div>
              <div className="text-xs text-muted-foreground">
                {autoInterrupt ? "Just start speaking" : "Use interrupt button"}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="noise-filter"
                  checked={noiseFilterEnabled}
                  onCheckedChange={toggleNoiseFilter}
                  disabled={!!microphoneError}
                />
                <Label htmlFor="noise-filter">Noise Filtering</Label>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={recalibrateNoiseProfile}
                  disabled={!noiseFilterEnabled || !!microphoneError}
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Calibrate
                </Button>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={!noiseFilterEnabled || !!microphoneError}
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Noise Filter Settings</SheetTitle>
                      <SheetDescription>
                        Configure advanced noise filtering settings to improve speech recognition in noisy environments.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="py-4">
                      <NoiseFilterVisualizer showControls={true} />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Noise filter visualizer (compact) */}
      {noiseFilterEnabled && showNoiseVisualizer && <NoiseFilterVisualizer compact={true} showControls={false} />}

      {/* Conversation state indicator */}
      {conversationState && (
        <Card className="bg-muted/50">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <span>You:</span>
                <Badge variant="outline" className={getSpeakerStateBadgeClass(conversationState.userState)}>
                  {getSpeakerStateLabel(conversationState.userState)}
                </Badge>
              </div>

              <div className="flex items-center gap-1">
                <span>Serenity:</span>
                <Badge variant="outline" className={getSpeakerStateBadgeClass(conversationState.assistantState)}>
                  {getSpeakerStateLabel(conversationState.assistantState)}
                </Badge>
              </div>

              {conversationState.isProcessingInterruption && (
                <Badge variant="destructive" className="ml-auto">
                  Interruption
                </Badge>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 ml-auto"
                onClick={() => setShowNoiseVisualizer(!showNoiseVisualizer)}
                disabled={!noiseFilterEnabled}
              >
                {showNoiseVisualizer ? "Hide Audio" : "Show Audio"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No speech detected indicator */}
      {noSpeechDetected && !microphoneError && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <span>No speech detected. Please speak louder or check your microphone.</span>
          <Button variant="outline" size="sm" className="ml-auto" onClick={resetSpeechRecognition}>
            <RefreshCw className="h-3 w-3 mr-1" /> Reset
          </Button>
        </div>
      )}

      {/* Interim transcript display with emotion detection */}
      {interimTranscript && (
        <div className="px-4 py-2 bg-muted rounded-lg text-sm italic">
          {interimTranscript}...
          {interimTranscript.length > 10 && (
            <span className="text-xs ml-2 opacity-70">{analyzeSentiment(interimTranscript).emotion}</span>
          )}
        </div>
      )}

      {/* Current sentence being spoken */}
      {currentSentence && conversationState?.assistantState === "speaking" && (
        <div className="px-4 py-2 bg-primary/10 rounded-lg text-sm border border-primary/20 animate-pulse">
          "{currentSentence}"
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSpeaking}
          aria-label={isSpeaking ? "Mute therapist" : "Unmute therapist"}
          disabled={!ttsInitialized || !!ttsError}
        >
          {isSpeaking ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>

        {conversationState?.assistantState === "speaking" && !autoInterrupt && (
          <Button
            variant="outline"
            size="icon"
            onClick={interruptAssistant}
            aria-label="Interrupt assistant"
            disabled={!!ttsError}
          >
            <Pause className="h-4 w-4" />
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          className={isListening ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""}
          disabled={!!microphoneError}
        >
          {isListening ? (
            <>
              <Mic className="h-3 w-3 mr-1 animate-pulse" /> Listening...
            </>
          ) : (
            <>
              <Mic className="h-3 w-3 mr-1" /> Ready
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// Helper functions
function getSpeakerStateLabel(state: SpeakerState): string {
  switch (state) {
    case "idle":
      return "Idle"
    case "thinking":
      return "Thinking"
    case "speaking":
      return "Speaking"
    case "listening":
      return "Listening"
    case "interrupted":
      return "Interrupted"
    default:
      return state
  }
}

function getSpeakerStateBadgeClass(state: SpeakerState): string {
  switch (state) {
    case "idle":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    case "thinking":
      return "bg-blue-100 text-blue-800 animate-pulse dark:bg-blue-900 dark:text-blue-200"
    case "speaking":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    case "listening":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
    case "interrupted":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    default:
      return ""
  }
}
