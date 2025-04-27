"use client"

import { useState, useEffect } from "react"
import { AlertCircle, Camera } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import FacialEmotionDetector from "./emotion-analyzer/facial-emotion-detector"

interface WebcamAnalyzerProps {
  isActive: boolean
  onEmotionDetected: (emotion: string, confidence: number) => void
}

export default function WebcamAnalyzer({ isActive, onEmotionDetected }: WebcamAnalyzerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  useEffect(() => {
    // Check camera permission
    if (isActive) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          setHasPermission(true)
          // Stop the stream immediately, we just needed to check permission
          stream.getTracks().forEach((track) => track.stop())
        })
        .catch((err) => {
          console.error("Error accessing webcam:", err)
          setHasPermission(false)
        })
    }
  }, [isActive])

  // Handle emotion detection from facial analysis
  const handleFacialEmotionDetected = (emotion: string, confidence: number, emotionValues: Record<string, number>) => {
    // Map facial emotions to our simplified set if needed
    const mappedEmotion = mapEmotionToSimplified(emotion)

    // Pass to parent component
    onEmotionDetected(mappedEmotion, confidence)
  }

  // Map emotions to our simplified set
  const mapEmotionToSimplified = (emotion: string): string => {
    switch (emotion) {
      case "happy":
        return "happy"
      case "sad":
        return "sad"
      case "angry":
        return "angry"
      case "fearful":
        return "anxious"
      case "disgusted":
      case "surprised":
        return "surprised"
      case "neutral":
      default:
        return "neutral"
    }
  }

  if (hasPermission === false) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Camera access denied</AlertTitle>
        <AlertDescription>Please enable camera access to use emotion analysis features.</AlertDescription>
      </Alert>
    )
  }

  if (!isActive) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <Camera className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Camera is turned off</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Enable the camera to analyze your emotional state in real-time.
        </p>
      </div>
    )
  }

  return <FacialEmotionDetector isActive={isActive} onEmotionDetected={handleFacialEmotionDetected} />
}
