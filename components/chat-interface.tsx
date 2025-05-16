"use client"

import { useEffect, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Loader2, Volume2 } from "lucide-react"

interface Message {
  role: string
  content: string
  emotion?: string
}

interface ChatInterfaceProps {
  messages: Message[]
  currentEmotion: string
  isGenerating?: boolean
  isAssistantSpeaking?: boolean
}

export default function ChatInterface({
  messages,
  currentEmotion,
  isGenerating = false,
  isAssistantSpeaking = false,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex flex-col space-y-4 overflow-y-auto pr-4">
      {messages.map((message, index) => (
        <div
          key={index}
          className={cn("flex gap-3 message-appear", message.role === "user" ? "justify-end" : "justify-start")}
        >
          {message.role === "assistant" && (
            <Avatar className="h-8 w-8 relative">
              <AvatarImage src="/ethereal-flow.png" alt="Serenity" />
              <AvatarFallback className="bg-primary/50">S</AvatarFallback>
              {isAssistantSpeaking && index === messages.length - 1 && message.role === "assistant" && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-ping"></span>
              )}
            </Avatar>
          )}

          <div
            className={cn(
              "rounded-lg px-4 py-2 max-w-[80%]",
              message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
              isAssistantSpeaking &&
                index === messages.length - 1 &&
                message.role === "assistant" &&
                "border-2 border-primary/50",
            )}
          >
            {message.content === "..." ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span>Thinking...</span>
              </div>
            ) : (
              <div>
                <p>{message.content}</p>
                {isAssistantSpeaking && index === messages.length - 1 && message.role === "assistant" && (
                  <div className="flex items-center mt-1 text-xs text-primary">
                    <Volume2 className="h-3 w-3 mr-1 animate-pulse" />
                    <span>Speaking</span>
                  </div>
                )}
              </div>
            )}
            {message.emotion && <div className="text-xs opacity-70 mt-1">Detected emotion: {message.emotion}</div>}
          </div>

          {message.role === "user" && (
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-secondary/50">U</AvatarFallback>
            </Avatar>
          )}
        </div>
      ))}

      {isGenerating && messages[messages.length - 1]?.role !== "assistant" && (
        <div className="flex gap-3 message-appear justify-start">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/ethereal-flow.png" alt="Serenity" />
            <AvatarFallback className="bg-primary/50">S</AvatarFallback>
          </Avatar>
          <div className="rounded-lg px-4 py-2 max-w-[80%] bg-muted">
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              <span>Thinking...</span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}
