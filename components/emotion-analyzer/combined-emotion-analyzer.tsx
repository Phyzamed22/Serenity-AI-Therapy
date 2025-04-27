"use client"

import { useState, useEffect } from "react"
import FacialEmotionDetector from "./facial-emotion-detector"
import { analyzeSentiment, getEmotionValues } from "./text-sentiment-analyzer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface CombinedEmotionAnalyzerProps {
  isWebcamActive: boolean
  userMessage: string
  onEmotionDetected: (
    emotion: string,
    confidence: number,
    source: "facial" | "text" | "combined",
    emotionValues: Record<string, number>,
  ) => void
}

export default function CombinedEmotionAnalyzer({
  isWebcamActive,
  userMessage,
  onEmotionDetected,
}: CombinedEmotionAnalyzerProps) {
  const [facialEmotion, setFacialEmotion] = useState<{
    emotion: string
    confidence: number
    values: Record<string, number>
  }>({
    emotion: "neutral",
    confidence: 0.5,
    values: { happy: 0, sad: 0, angry: 0, anxious: 0, neutral: 1, surprised: 0 },
  })

  const [textEmotion, setTextEmotion] = useState<{
    emotion: string
    confidence: number
    values: Record<string, number>
  }>({
    emotion: "neutral",
    confidence: 0.5,
    values: { happy: 0, content: 0, neutral: 1, sad: 0, angry: 0, anxious: 0 },
  })

  const [combinedEmotion, setCombinedEmotion] = useState<{
    emotion: string
    confidence: number
    values: Record<string, number>
  }>({
    emotion: "neutral",
    confidence: 0.5,
    values: { happy: 0, sad: 0, angry: 0, anxious: 0, neutral: 1, surprised: 0 },
  })

  // Analyze text sentiment when user message changes
  useEffect(() => {
    if (userMessage.trim()) {
      const result = analyzeSentiment(userMessage)
      const values = getEmotionValues(result.score)

      setTextEmotion({
        emotion: result.emotion,
        confidence: result.confidence,
        values,
      })

      // Notify parent of text emotion
      onEmotionDetected(result.emotion, result.confidence, "text", values)
    }
  }, [userMessage, onEmotionDetected])

  // Combine emotions whenever facial or text emotions change
  useEffect(() => {
    // Only combine if webcam is active, otherwise use text emotion
    if (isWebcamActive) {
      // Weighted combination (60% facial, 40% text)
      const combinedValues: Record<string, number> = {}
      const allEmotions = new Set([...Object.keys(facialEmotion.values), ...Object.keys(textEmotion.values)])

      allEmotions.forEach((emotion) => {
        const facialValue = facialEmotion.values[emotion] || 0
        const textValue = textEmotion.values[emotion] || 0
        combinedValues[emotion] = facialValue * 0.6 + textValue * 0.4
      })

      // Find dominant emotion
      let maxEmotion = "neutral"
      let maxValue = 0

      for (const [emotion, value] of Object.entries(combinedValues)) {
        if (value > maxValue) {
          maxValue = value
          maxEmotion = emotion
        }
      }

      // Calculate confidence based on the strength of the dominant emotion
      const confidence = Math.min(maxValue * 1.5, 1)

      setCombinedEmotion({
        emotion: maxEmotion,
        confidence,
        values: combinedValues,
      })

      // Notify parent of combined emotion
      onEmotionDetected(maxEmotion, confidence, "combined", combinedValues)
    } else {
      // If webcam is not active, use text emotion only
      setCombinedEmotion(textEmotion)
    }
  }, [facialEmotion, textEmotion, isWebcamActive, onEmotionDetected])

  // Handle facial emotion detection
  const handleFacialEmotionDetected = (emotion: string, confidence: number, values: Record<string, number>) => {
    setFacialEmotion({
      emotion,
      confidence,
      values,
    })

    // Notify parent of facial emotion
    onEmotionDetected(emotion, confidence, "facial", values)
  }

  return (
    <div className="space-y-4">
      {isWebcamActive && (
        <FacialEmotionDetector isActive={isWebcamActive} onEmotionDetected={handleFacialEmotionDetected} />
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex justify-between items-center">
            <span>Detected Emotion</span>
            <Badge variant="outline" className={`capitalize ${getEmotionColor(combinedEmotion.emotion)}`}>
              {combinedEmotion.emotion}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Confidence</span>
                <span>{Math.round(combinedEmotion.confidence * 100)}%</span>
              </div>
              <Progress value={combinedEmotion.confidence * 100} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Facial Analysis: {facialEmotion.emotion}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Text Analysis: {textEmotion.emotion}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper function to get color class based on emotion
function getEmotionColor(emotion: string): string {
  switch (emotion) {
    case "happy":
    case "content":
      return "bg-green-100 text-green-800 border-green-300"
    case "sad":
      return "bg-blue-100 text-blue-800 border-blue-300"
    case "angry":
      return "bg-red-100 text-red-800 border-red-300"
    case "anxious":
    case "fearful":
      return "bg-yellow-100 text-yellow-800 border-yellow-300"
    case "surprised":
      return "bg-purple-100 text-purple-800 border-purple-300"
    case "neutral":
    default:
      return "bg-gray-100 text-gray-800 border-gray-300"
  }
}
