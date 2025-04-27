"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Send } from "lucide-react"
import ChatInterface from "@/components/chat-interface"
import EmotionTimeline from "@/components/emotion-timeline"
import TherapistAvatar from "@/components/therapist-avatar"
import TextEmotionAnalyzer from "@/components/emotion-analyzer/text-emotion-analyzer"
import RealTimeConversationInterface from "@/components/real-time-conversation-interface"
import { useMobile } from "@/hooks/use-mobile"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { startSession, endSession, saveMessage, saveEmotionData, getSessionMessages } from "@/actions/session-actions"
import { getTherapistSettings, generateAIResponse, updateSessionMemory } from "@/actions/therapist-actions"
import { getTherapyPreferences } from "@/actions/therapy-preferences-actions"
import { recordEmotionalTrend } from "@/actions/emotional-trends-actions"
import { getElevenLabsCredentials } from "@/lib/env"
import { useToast } from "@/hooks/use-toast"
import { getConversationManager } from "@/lib/conversation-manager"

export default function TherapySession() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false)
  const [currentEmotion, setCurrentEmotion] = useState("neutral")
  const [currentMessage, setCurrentMessage] = useState("")
  const [emotionHistory, setEmotionHistory] = useState<Array<{ time: number; emotion: string; confidence: number }>>([])
  const [messages, setMessages] = useState<Array<{ role: string; content: string; emotion?: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [therapistSettings, setTherapistSettings] = useState<any>(null)
  const [therapyPreferences, setTherapyPreferences] = useState<any>(null)
  const [useRealTimeConversation, setUseRealTimeConversation] = useState(true)
  const { apiKey: elevenlabsApiKey, voiceId: elevenlabsVoiceId } = getElevenLabsCredentials()
  const isMobile = useMobile()
  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()
  const lastAssistantMessage = useRef<string | null>(null)
  const lastEmotionRef = useRef<{ emotion: string; confidence: number }>({ emotion: "neutral", confidence: 0.5 })
  const conversationManager = useRef(getConversationManager())

  // Add this at the beginning of the component function
  const handleSupabaseError = (error: any) => {
    console.error("Supabase error:", error)
    // Show a user-friendly error message
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Connection Error</h2>
        <p className="mb-4">We're having trouble connecting to our database. This could be due to:</p>
        <ul className="list-disc text-left mb-6">
          <li>Missing environment variables</li>
          <li>Network connectivity issues</li>
          <li>Server maintenance</li>
        </ul>
        <p>Please try again later or contact support if the problem persists.</p>
      </div>
    )
  }

  useEffect(() => {
    const initSession = async () => {
      try {
        const supabase = createClientSupabaseClient()
        // Check if user is authenticated
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          window.location.href = "/login"
          return
        }

        // Get therapist settings
        const settings = await getTherapistSettings()
        setTherapistSettings(settings)

        // Get therapy preferences
        const preferences = await getTherapyPreferences()
        setTherapyPreferences(preferences)

        // Start or resume session
        const sessionIdFromUrl = new URLSearchParams(window.location.search).get("session")

        if (sessionIdFromUrl) {
          // Resume existing session
          setSessionId(sessionIdFromUrl)

          // Load previous messages
          const previousMessages = await getSessionMessages(sessionIdFromUrl)

          if (previousMessages && previousMessages.length > 0) {
            setMessages(
              previousMessages.map((msg) => ({
                role: msg.role,
                content: msg.content,
                emotion: msg.detected_emotion || undefined,
              })),
            )

            // Set last assistant message for TTS
            const lastAssistant = previousMessages.filter((msg) => msg.role === "assistant").pop()

            if (lastAssistant) {
              lastAssistantMessage.current = lastAssistant.content
            }
          } else {
            // Add initial greeting message if no previous messages
            const initialMessage = {
              role: "assistant",
              content: "Hello again! I'm Serenity, your virtual therapist. How are you feeling today?",
            }
            setMessages([initialMessage])
            lastAssistantMessage.current = initialMessage.content

            // Save initial message to database
            await saveMessage(sessionIdFromUrl, "assistant", initialMessage.content)
          }
        } else {
          // Start new session
          const session = await startSession()
          setSessionId(session.id)

          // Add initial greeting message
          const initialMessage = {
            role: "assistant",
            content: "Hello, I'm Serenity, your virtual therapist. How are you feeling today?",
          }
          setMessages([initialMessage])
          lastAssistantMessage.current = initialMessage.content

          // Save initial message to database
          await saveMessage(session.id, "assistant", initialMessage.content)
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Error initializing session:", error)
        toast({
          title: "Error",
          description: "Failed to start therapy session. Please try again.",
          variant: "destructive",
        })
      }
    }

    initSession()
  }, [toast])

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !sessionId || isGenerating) return

    try {
      // Update current message for sentiment analysis
      setCurrentMessage(content)

      // Add user message to UI with emotion data
      const userMessage = {
        role: "user",
        content,
        emotion: currentEmotion,
      }
      setMessages((prev) => [...prev, userMessage])

      // Save user message to database
      const supabase = createClientSupabaseClient()
      await saveMessage(
        sessionId,
        "user",
        content,
        currentEmotion,
        emotionHistory.length > 0 ? emotionHistory[emotionHistory.length - 1].confidence : 0.5,
      )

      // Save current emotion data
      const emotionValues = {
        happy: 0,
        sad: 0,
        angry: 0,
        anxious: 0,
        neutral: 0,
      }

      // Set the value for the current emotion
      emotionValues[currentEmotion as keyof typeof emotionValues] =
        emotionHistory.length > 0 ? emotionHistory[emotionHistory.length - 1].confidence : 0.5

      await saveEmotionData(sessionId, currentEmotion, emotionValues, "text")

      // Clear input
      if (messageInputRef.current) {
        messageInputRef.current.value = ""
      }

      // Generate AI response
      setIsGenerating(true)

      // Signal that assistant is thinking
      conversationManager.current.assistantStartsThinking()

      // Add a temporary "thinking" message
      const thinkingIndex = messages.length + 1
      setMessages((prev) => [...prev, { role: "assistant", content: "..." }])

      // Get AI response - pass messages with emotion data
      const therapistResponse = await generateAIResponse(
        sessionId,
        [...messages, userMessage].map((msg) => ({
          role: msg.role,
          content: msg.content,
          emotion: msg.emotion,
        })),
        currentEmotion,
      )

      // Signal that assistant has stopped thinking
      conversationManager.current.assistantStopsThinking()

      // Replace the "thinking" message with the actual response
      setMessages((prev) => {
        const updated = [...prev]
        updated[thinkingIndex] = {
          role: "assistant",
          content: therapistResponse,
        }
        return updated
      })

      // Update last assistant message for TTS
      lastAssistantMessage.current = therapistResponse

      // Save assistant message to database
      await saveMessage(sessionId, "assistant", therapistResponse)

      setIsGenerating(false)

      // Clear current message after processing
      setCurrentMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
      setIsGenerating(false)

      // Signal that assistant has stopped thinking in case of error
      conversationManager.current.assistantStopsThinking()
    }
  }

  // Use useCallback to prevent unnecessary re-renders
  const handleEmotionUpdate = useCallback(
    async (emotion: string, confidence: number, emotionValues: Record<string, number>) => {
      // Check if the emotion has actually changed to avoid unnecessary updates
      if (
        lastEmotionRef.current.emotion !== emotion ||
        Math.abs(lastEmotionRef.current.confidence - confidence) > 0.2
      ) {
        // Update the ref to track the last emotion
        lastEmotionRef.current = { emotion, confidence }

        // Update state
        setCurrentEmotion(emotion)
        setEmotionHistory((prev) => [
          ...prev,
          {
            time: Date.now(),
            emotion,
            confidence,
          },
        ])

        // Save emotion data to database if in a session
        if (sessionId) {
          try {
            // Convert emotion values to our database format
            const dbEmotionValues = {
              happy: emotionValues.happy || 0,
              sad: emotionValues.sad || 0,
              angry: emotionValues.angry || 0,
              anxious: emotionValues.anxious || 0,
              neutral: emotionValues.neutral || 0,
            }

            const supabase = createClientSupabaseClient()
            await saveEmotionData(sessionId, emotion, dbEmotionValues, "text")

            // Also record as emotional trend once per session
            if (emotionHistory.length === 0) {
              // Ensure emotion_intensity is between 1 and 10
              const intensity = Math.min(Math.max(Math.round(confidence * 10), 1), 10)
              await recordEmotionalTrend({
                dominantEmotion: emotion,
                emotionIntensity: intensity,
              })
            }
          } catch (error) {
            console.error("Error saving emotion data:", error)
          }
        }
      }
    },
    [sessionId, emotionHistory.length],
  )

  const handleEndSession = async () => {
    if (!sessionId) return

    try {
      // Calculate overall mood from emotion history
      let dominantEmotion = "neutral"
      const emotionCounts: Record<string, number> = {}

      emotionHistory.forEach((item) => {
        emotionCounts[item.emotion] = (emotionCounts[item.emotion] || 0) + 1
      })

      let maxCount = 0
      for (const [emotion, count] of Object.entries(emotionCounts)) {
        if (count > maxCount) {
          maxCount = count
          dominantEmotion = emotion
        }
      }

      // Generate simple summary
      const summary = `Session included ${messages.length} messages. The dominant emotion was ${dominantEmotion}.`

      // Extract key insights and emotional journey
      const keyInsights = extractKeyInsights(messages)
      const emotionalJourney = {
        startEmotion: emotionHistory.length > 0 ? emotionHistory[0].emotion : "neutral",
        endEmotion: dominantEmotion,
        significantShifts: detectEmotionalShifts(emotionHistory),
      }

      // Update session memory
      const supabase = createClientSupabaseClient()
      await updateSessionMemory(sessionId, {
        summary,
        keyInsights,
        emotionalJourney,
      })

      // End session
      await endSession(sessionId, summary, dominantEmotion)

      // Record final emotional trend
      await recordEmotionalTrend({
        dominantEmotion,
        emotionIntensity: 7, // Medium-high intensity for end of session (within 1-10 range)
        notes: "End of therapy session",
      })

      toast({
        title: "Session Ended",
        description: "Your therapy session has been saved.",
      })

      // Redirect to dashboard
      window.location.href = "/dashboard"
    } catch (error) {
      console.error("Error ending session:", error)
      toast({
        title: "Error",
        description: "Failed to end therapy session. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Helper function to extract key insights from messages
  const extractKeyInsights = (messages: Array<{ role: string; content: string; emotion?: string }>) => {
    // Simple extraction of potential insights based on message content
    const userMessages = messages.filter((msg) => msg.role === "user").map((msg) => msg.content)

    const potentialInsights = []

    // Look for statements that might indicate insights
    for (const message of userMessages) {
      if (
        message.includes("I realized") ||
        message.includes("I understand") ||
        message.includes("I learned") ||
        message.includes("I feel like")
      ) {
        potentialInsights.push(message)
      }
    }

    return potentialInsights.slice(-3) // Return the last 3 insights
  }

  // Helper function to detect significant emotional shifts
  const detectEmotionalShifts = (emotionHistory: Array<{ time: number; emotion: string; confidence: number }>) => {
    const shifts = []

    for (let i = 1; i < emotionHistory.length; i++) {
      const prevEmotion = emotionHistory[i - 1].emotion
      const currentEmotion = emotionHistory[i].emotion

      // If emotion changed and confidence is high enough
      if (prevEmotion !== currentEmotion && emotionHistory[i].confidence > 0.6) {
        shifts.push({
          from: prevEmotion,
          to: currentEmotion,
          messageIndex: i,
        })
      }
    }

    return shifts
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        <h2 className="mt-4 text-xl font-medium">Preparing your therapy session...</h2>
        <p className="text-muted-foreground mt-2">Setting up a safe space for you</p>
      </div>
    )
  }

  try {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="shadow-md">
            <CardContent className="p-6">
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">
                    Therapy Session {sessionId ? `#${sessionId.substring(0, 8)}` : ""}
                  </h2>
                  <div className="flex items-center gap-2">
                    {isAssistantSpeaking && (
                      <span className="text-xs bg-primary/20 px-2 py-1 rounded-full animate-pulse">Speaking...</span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUseRealTimeConversation(!useRealTimeConversation)}
                    >
                      {useRealTimeConversation ? "Use Text Chat" : "Use Voice Chat"}
                    </Button>
                  </div>
                </div>

                {therapyPreferences &&
                  therapyPreferences.topics_to_avoid &&
                  therapyPreferences.topics_to_avoid.length > 0 && (
                    <div className="mb-4 p-3 bg-muted rounded-md text-sm">
                      <p className="font-medium">Topics to avoid in this session:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {therapyPreferences.topics_to_avoid.map((topic: string) => (
                          <span key={topic} className="px-2 py-0.5 bg-background rounded-full text-xs">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                <div className="flex-1 chat-container">
                  <ChatInterface
                    messages={messages}
                    currentEmotion={currentEmotion}
                    isGenerating={isGenerating}
                    isAssistantSpeaking={isAssistantSpeaking}
                  />
                </div>

                <div className="flex flex-col gap-4 mt-4">
                  {!useRealTimeConversation ? (
                    <div className="flex gap-2">
                      <textarea
                        ref={messageInputRef}
                        className="flex-1 min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Type your message here..."
                        disabled={isGenerating}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage(messageInputRef.current?.value || "")
                          }
                        }}
                      />
                      <Button
                        variant="default"
                        onClick={() => {
                          handleSendMessage(messageInputRef.current?.value || "")
                        }}
                        aria-label="Send message"
                        disabled={isGenerating}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </Button>
                    </div>
                  ) : (
                    <RealTimeConversationInterface
                      onUserMessage={handleSendMessage}
                      onAssistantSpeaking={setIsAssistantSpeaking}
                      isGenerating={isGenerating}
                      assistantMessage={lastAssistantMessage.current}
                      apiKey={elevenlabsApiKey}
                      voiceId={elevenlabsVoiceId}
                    />
                  )}
                </div>

                <div className="mt-4">
                  <Button variant="outline" onClick={handleEndSession} className="w-full" disabled={isGenerating}>
                    End Session
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1">
          <div className="flex flex-col gap-6">
            <Card className="shadow-md">
              <CardContent className="p-6">
                <TherapistAvatar emotion={currentEmotion} />

                {therapyPreferences && (
                  <div className="mt-4 text-sm">
                    <p className="text-muted-foreground">
                      <span className="font-medium">Therapy style:</span>{" "}
                      <span className="capitalize">{therapyPreferences.preferred_style}</span>
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium">Communication:</span>{" "}
                      <span className="capitalize">{therapyPreferences.communication_preference}</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Tabs defaultValue="analysis" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="analysis">Emotion Analysis</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>
              <TabsContent value="analysis">
                <Card>
                  <CardContent className="p-6">
                    <TextEmotionAnalyzer userMessage={currentMessage} onEmotionDetected={handleEmotionUpdate} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="timeline">
                <Card>
                  <CardContent className="p-6">
                    <EmotionTimeline data={emotionHistory} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    return handleSupabaseError(error)
  }
}
