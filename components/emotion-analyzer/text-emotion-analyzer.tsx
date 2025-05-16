"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { analyzeSentiment, getEmotionValues } from "./text-sentiment-analyzer"

interface TextEmotionAnalyzerProps {
  userMessage: string
  onEmotionDetected: (emotion: string, confidence: number, emotionValues: Record<string, number>) => void
}

export default function TextEmotionAnalyzer({ userMessage, onEmotionDetected }: TextEmotionAnalyzerProps) {
  const [textEmotion, setTextEmotion] = useState<{
    emotion: string
    secondaryEmotion?: string
    confidence: number
    intensity: number
    values: Record<string, number>
  }>({
    emotion: "neutral",
    confidence: 0.5,
    intensity: 3,
    values: { happy: 0, content: 0, sad: 0, angry: 0, anxious: 0, neutral: 1, confused: 0 },
  })

  // Use refs to track previous values and prevent infinite loops
  const prevMessageRef = useRef<string>("")
  const emotionReportedRef = useRef<boolean>(false)

  // Analyze text sentiment when user message changes
  useEffect(() => {
    // Only analyze if the message has changed and is not empty
    if (userMessage.trim() && userMessage !== prevMessageRef.current) {
      prevMessageRef.current = userMessage
      emotionReportedRef.current = false

      const result = analyzeSentiment(userMessage)
      const values = getEmotionValues(result)

      setTextEmotion({
        emotion: result.emotion,
        secondaryEmotion: result.secondaryEmotion,
        confidence: result.confidence,
        intensity: result.emotionIntensity,
        values,
      })
    }
  }, [userMessage])

  // Separate useEffect for reporting emotion to parent
  // This prevents the infinite loop by separating state updates from callback
  useEffect(() => {
    // Only report if not already reported for this emotion
    if (!emotionReportedRef.current && textEmotion.emotion) {
      emotionReportedRef.current = true
      onEmotionDetected(textEmotion.emotion, textEmotion.confidence, textEmotion.values)
    }
  }, [textEmotion, onEmotionDetected])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex justify-between items-center">
            <span>Detected Emotion</span>
            <div className="flex gap-2">
              <Badge variant="outline" className={`capitalize ${getEmotionColor(textEmotion.emotion)}`}>
                {textEmotion.emotion}
              </Badge>
              {textEmotion.secondaryEmotion && (
                <Badge variant="outline" className={`capitalize ${getEmotionColor(textEmotion.secondaryEmotion, 0.7)}`}>
                  {textEmotion.secondaryEmotion}
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Confidence</span>
                <span>{Math.round(textEmotion.confidence * 100)}%</span>
              </div>
              <Progress value={textEmotion.confidence * 100} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Intensity</span>
                <span>{textEmotion.intensity}/10</span>
              </div>
              <Progress value={textEmotion.intensity * 10} className="h-2" />
            </div>

            <div className="space-y-2">
              {Object.entries(textEmotion.values)
                .filter(([, value]) => value > 0.05)
                .sort(([, a], [, b]) => b - a)
                .map(([emotion, value]) => (
                  <div key={emotion} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{emotion}</span>
                      <span>{Math.round(value * 100)}%</span>
                    </div>
                    <Progress value={value * 100} className={`h-1.5 ${getProgressColor(emotion)}`} />
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper function to get color class based on emotion
function getEmotionColor(emotion: string, opacity = 1): string {
  switch (emotion) {
    case "happy":
      return `bg-green-100 text-green-800 border-green-300`
    case "content":
      return `bg-teal-100 text-teal-800 border-teal-300`
    case "sad":
      return `bg-blue-100 text-blue-800 border-blue-300`
    case "angry":
      return `bg-red-100 text-red-800 border-red-300`
    case "anxious":
      return `bg-yellow-100 text-yellow-800 border-yellow-300`
    case "confused":
      return `bg-purple-100 text-purple-800 border-purple-300`
    case "neutral":
    default:
      return `bg-gray-100 text-gray-800 border-gray-300`
  }
}

// Helper function to get progress bar color based on emotion
function getProgressColor(emotion: string): string {
  switch (emotion) {
    case "happy":
      return "bg-green-500"
    case "content":
      return "bg-teal-500"
    case "sad":
      return "bg-blue-500"
    case "angry":
      return "bg-red-500"
    case "anxious":
      return "bg-yellow-500"
    case "confused":
      return "bg-purple-500"
    case "neutral":
    default:
      return "bg-gray-500"
  }
}
