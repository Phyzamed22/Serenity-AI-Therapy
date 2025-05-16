"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Mic, MicOff } from "lucide-react"
import { TherapistAvatar } from "@/components/therapist-avatar"
import { CombinedEmotionAnalyzer } from "@/components/emotion-analyzer/combined-emotion-analyzer"
import RealTimeConversationInterface from "@/components/real-time-conversation-interface"
import { useToast } from "@/hooks/use-toast"
import { generateAIResponse } from "@/actions/therapist-actions"
import { getTherapistRAG } from "@/lib/rag/therapist-rag"
import { useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase/client"

interface TherapySessionProps {
  sessionId: string
  initialMessages?: Array<{ role: string; content: string }>
  elevenlabsApiKey?: string
  elevenlabsVoiceId?: string
  groqApiKey?: string
}

export default function TherapySession({
  sessionId,
  initialMessages = [],
  elevenlabsApiKey = "",
  elevenlabsVoiceId = "",
  groqApiKey = "",
}: TherapySessionProps) {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>(initialMessages)
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false)
  const [useVoiceInput, setUseVoiceInput] = useState(true)
  const [currentEmotion, setCurrentEmotion] = useState<string>("neutral")
  const [emotionConfidence, setEmotionConfidence] = useState<number>(0)
  const [emotionHistory, setEmotionHistory] = useState<Array<{ emotion: string; timestamp: number }>>([])
  const [userMessage, setUserMessage] = useState<string>("")
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClientSupabaseClient()

  // Initialize RAG system
  useEffect(() => {
    const initRAG = async () => {
      try {
        const rag = getTherapistRAG()
        await rag.initialize()
        console.log("RAG system initialized successfully")
      } catch (error) {
        console.error("Error initializing RAG system:", error)
        toast({
          title: "Error",
          description: "Failed to initialize therapy knowledge base. Some responses may be limited.",
          variant: "destructive",
        })
      }
    }

    initRAG()
  }, [toast])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Save session to database when messages change
  useEffect(() => {
    const saveSession = async () => {
      if (messages.length === 0) return

      try {
        // Get user ID
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        // Update session in database
        await supabase
          .from("therapy_sessions")
          .update({
            last_message_at: new Date().toISOString(),
            message_count: messages.length,
          })
          .eq("id", sessionId)
          .eq("user_id", user.id)

        // Save messages
        const messagesToSave = messages.map((msg, index) => ({
          session_id: sessionId,
          user_id: user.id,
          content: msg.content,
          role: msg.role,
          index: index,
          created_at: new Date().toISOString(),
        }))

        // First delete existing messages
        await supabase.from("session_messages").delete().eq("session_id", sessionId)

        // Then insert new ones
        await supabase.from("session_messages").insert(messagesToSave)
      } catch (error) {
        console.error("Error saving session:", error)
      }
    }

    saveSession()
  }, [messages, sessionId, supabase])

  // Handle user message submission
  const handleSubmit = async (userMessage: string) => {
    if (!userMessage.trim()) return

    // Update the userMessage state for emotion analysis
    setUserMessage(userMessage)

    // Add user message to state
    const updatedMessages = [...messages, { role: "user", content: userMessage }]
    setMessages(updatedMessages)
    setInput("")
    setIsGenerating(true)

    try {
      // Generate AI response
      const response = await generateAIResponse(sessionId, updatedMessages, currentEmotion)

      // Add AI response to state
      setMessages([...updatedMessages, { role: "assistant", content: response }])
    } catch (error) {
      console.error("Error generating response:", error)
      toast({
        title: "Error",
        description: "Failed to generate response. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle emotion detection
  const handleEmotionDetected = (
    emotion: string,
    confidence: number,
    source: "facial" | "text" | "combined",
    emotionValues: Record<string, number>,
  ) => {
    setCurrentEmotion(emotion)
    setEmotionConfidence(confidence)
    setEmotionHistory((prev) => [...prev, { emotion, timestamp: Date.now() }])
  }

  return (
    <div className="flex flex-col h-full">
      {/* Emotion analyzer */}
      <div className="mb-4">
        <CombinedEmotionAnalyzer
          isWebcamActive={isWebcamActive}
          userMessage={userMessage}
          onEmotionDetected={handleEmotionDetected}
        />
      </div>

      {/* Chat messages */}
      <Card className="flex-grow overflow-hidden flex flex-col">
        <CardContent className="p-4 flex-grow overflow-y-auto">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"} items-start gap-2`}
              >
                {message.role === "assistant" && <TherapistAvatar />}
                <div
                  className={`rounded-lg p-3 max-w-[80%] ${
                    message.role === "assistant" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isGenerating && (
              <div className="flex justify-start items-start gap-2">
                <TherapistAvatar />
                <div className="rounded-lg p-3 max-w-[80%] bg-muted text-foreground">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-current animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>

        {/* Input area */}
        <div className="p-4 border-t">
          {useVoiceInput ? (
            <RealTimeConversationInterface
              onUserMessage={handleSubmit}
              onAssistantSpeaking={setIsAssistantSpeaking}
              isGenerating={isGenerating}
              assistantMessage={messages.length > 0 ? messages[messages.length - 1]?.content : null}
              apiKey={elevenlabsApiKey}
              voiceId={elevenlabsVoiceId}
              sessionId={sessionId}
              currentEmotion={currentEmotion}
              messages={messages}
            />
          ) : (
            <div className="flex space-x-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-grow"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(input)
                  }
                }}
              />
              <Button onClick={() => handleSubmit(input)} disabled={!input.trim() || isGenerating} className="self-end">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="mt-2 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setUseVoiceInput(!useVoiceInput)} className="text-xs">
              {useVoiceInput ? (
                <>
                  <MicOff className="h-3 w-3 mr-1" /> Switch to Text
                </>
              ) : (
                <>
                  <Mic className="h-3 w-3 mr-1" /> Switch to Voice
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
