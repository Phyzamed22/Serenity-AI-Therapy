"use client"

import { useState, useEffect } from "react"

interface TherapistAvatarProps {
  emotion: string
}

export default function TherapistAvatar({ emotion }: TherapistAvatarProps) {
  const [message, setMessage] = useState("I'm here to listen and support you.")

  useEffect(() => {
    // Change the therapist's message based on detected user emotion
    switch (emotion) {
      case "happy":
        setMessage("I'm glad to see you're feeling positive today.")
        break
      case "sad":
        setMessage("I notice you might be feeling down. I'm here for you.")
        break
      case "anxious":
        setMessage("Let's take a deep breath together. You're safe here.")
        break
      case "angry":
        setMessage("It's okay to feel frustrated. Let's explore those feelings.")
        break
      default:
        setMessage("I'm here to listen and support you.")
    }
  }, [emotion])

  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4 therapist-avatar">
        <img src="/gradient-face-abstract.png" alt="Serenity Therapist Avatar" className="w-full h-full rounded-full" />
      </div>
      <h3 className="text-lg font-medium">Serenity</h3>
      <p className="text-sm text-muted-foreground mt-2">{message}</p>
    </div>
  )
}
