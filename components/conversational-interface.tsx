"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react"
import { getElevenLabsTTS, initElevenLabsTTS } from "@/lib/elevenlabs-tts"
import { getSpeechRecognition } from "@/lib/speech-recognition"
import { useToast } from "@/hooks/use-toast"
import { analyzeSentiment } from "./emotion-analyzer/text-sentiment-analyzer"

interface ConversationalInterfaceProps {
  onUserMessage: (message: string) => void
  onAssistantSpeaking: (isSpeaking: boolean) => void
  isGenerating: boolean
  assistantMessage: string | null
  apiKey: string
  voiceId: string
}

export default function ConversationalInterface({
  onUserMessage,
  onAssistantSpeaking,
  isGenerating,
  assistantMessage,
  apiKey,
  voiceId,
}: ConversationalInterfaceProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(true)
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [ttsInitialized, setTtsInitialized] = useState(false)
  const [recognitionSupported, setRecognitionSupported] = useState(true)
  const previousAssistantMessage = useRef<string | null>(null)
  const { toast } = useToast()

  // Initialize TTS and speech recognition
  useEffect(() => {
    // Initialize TTS
    try {
      if (apiKey && voiceId) {
        initElevenLabsTTS(apiKey, voiceId)
        setTtsInitialized(true)
      }
    } catch (error) {
      console.error("Error initializing TTS:", error)
      toast({
        title: "TTS Error",
        description: "Could not initialize text-to-speech. Check your API key and voice ID.",
        variant: "destructive",
      })
    }

    // Check if speech recognition is supported
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setRecognitionSupported(false)
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser doesn't support speech recognition. Try using Chrome or Edge.",
        variant: "destructive",
      })
      return
    }

    // Initialize speech recognition
    const recognition = getSpeechRecognition()

    recognition.onResult((text, isFinal) => {
      if (isFinal) {
        setTranscript(text)
        setInterimTranscript("")
      } else {
        setInterimTranscript(text)
      }
    })

    recognition.onStart(() => {
      setIsListening(true)

      // If assistant is speaking, interrupt it
      if (ttsInitialized) {
        try {
          const tts = getElevenLabsTTS()
          if (tts.speaking) {
            tts.interrupt()
            onAssistantSpeaking(false)
          }
        } catch (error) {
          console.error("Error interrupting TTS:", error)
        }
      }
    })

    recognition.onEnd(() => {
      setIsListening(false)
    })

    recognition.onError((error) => {
      console.error("Speech recognition error:", error)
      setIsListening(false)

      toast({
        title: "Speech Recognition Error",
        description: `Error: ${error}. Please try again.`,
        variant: "destructive",
      })
    })

    // Cleanup
    return () => {
      if (recognition.listening) {
        recognition.stop()
      }

      if (ttsInitialized) {
        try {
          const tts = getElevenLabsTTS()
          tts.interrupt()
        } catch (error) {
          console.error("Error cleaning up TTS:", error)
        }
      }
    }
  }, [apiKey, voiceId, toast, onAssistantSpeaking])

  // Handle transcript changes
  useEffect(() => {
    if (transcript && !isListening) {
      // Analyze emotion before sending
      const emotionResult = analyzeSentiment(transcript)
      console.log("Voice input emotion:", emotionResult.emotion, "Confidence:", emotionResult.confidence)

      // Send message when user stops speaking
      onUserMessage(transcript)
      setTranscript("")
    }
  }, [transcript, isListening, onUserMessage])

  // Handle assistant message changes for TTS
  useEffect(() => {
    if (assistantMessage && assistantMessage !== previousAssistantMessage.current && ttsInitialized && isSpeaking) {
      try {
        const tts = getElevenLabsTTS()

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
          },
        )

        previousAssistantMessage.current = assistantMessage
      } catch (error) {
        console.error("Error with TTS:", error)
        onAssistantSpeaking(false)
      }
    }
  }, [assistantMessage, ttsInitialized, isSpeaking, onAssistantSpeaking])

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (!recognitionSupported) {
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser doesn't support speech recognition. Try using Chrome or Edge.",
        variant: "destructive",
      })
      return
    }

    const recognition = getSpeechRecognition()

    if (recognition.listening) {
      recognition.stop()
    } else {
      recognition.start(true) // Auto restart
    }
  }, [recognitionSupported, toast])

  // Toggle speaking
  const toggleSpeaking = () => {
    setIsSpeaking(!isSpeaking)

    if (ttsInitialized) {
      try {
        const tts = getElevenLabsTTS()

        if (isSpeaking) {
          // If turning off speaking, interrupt current speech
          tts.interrupt()
          onAssistantSpeaking(false)
        }
      } catch (error) {
        console.error("Error toggling TTS:", error)
      }
    }
  }

  return (
    <div className="flex flex-col space-y-4">
      {/* Interim transcript display with emotion detection */}
      {interimTranscript && (
        <div className="px-4 py-2 bg-muted rounded-lg text-sm italic">
          {interimTranscript}...
          {interimTranscript.length > 10 && (
            <span className="text-xs ml-2 opacity-70">{analyzeSentiment(interimTranscript).emotion}</span>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSpeaking}
          aria-label={isSpeaking ? "Mute therapist" : "Unmute therapist"}
          disabled={!ttsInitialized}
        >
          {isSpeaking ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>

        <Button
          variant={isListening ? "destructive" : "default"}
          size="icon"
          onClick={toggleListening}
          aria-label={isListening ? "Stop listening" : "Start voice input"}
          disabled={isGenerating || !recognitionSupported}
        >
          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
