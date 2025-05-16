"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react"

interface EmotionInsightsProps {
  emotionalTrends: Array<{
    date: string
    dominant_emotion: string
    emotion_intensity: number
    triggers?: string[]
  }>
}

export default function EmotionInsights({ emotionalTrends }: EmotionInsightsProps) {
  // Skip if no data
  if (emotionalTrends.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Emotional Insights</CardTitle>
          <CardDescription>Patterns and trends in your emotional data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground">No emotional data available for analysis.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Generate insights
  const insights = generateInsights(emotionalTrends)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Emotional Insights</CardTitle>
        <CardDescription>Patterns and trends in your emotional data</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Dominant Emotions</h3>
            <div className="flex flex-wrap gap-2">
              {insights.dominantEmotions.map((item, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                  <span className="capitalize">{item.emotion}</span>
                  <span className="text-xs text-muted-foreground">({item.count})</span>
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Emotional Trends</h3>
            <div className="space-y-2">
              {insights.trends.map((trend, index) => (
                <div key={index} className="flex items-center gap-2">
                  {trend.direction === "up" ? (
                    <TrendingUpIcon className="h-5 w-5 text-green-500" />
                  ) : (
                    <TrendingDownIcon className="h-5 w-5 text-blue-500" />
                  )}
                  <span>{trend.description}</span>
                </div>
              ))}
            </div>
          </div>

          {insights.commonTriggers.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-2">Common Triggers</h3>
              <div className="flex flex-wrap gap-2">
                {insights.commonTriggers.map((trigger, index) => (
                  <Badge key={index} variant="outline" className="flex items-center gap-1">
                    {trigger.trigger}
                    <span className="text-xs text-muted-foreground">({trigger.count})</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-medium mb-2">Emotional Balance</h3>
            <div className="flex items-center">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-primary h-2.5 rounded-full"
                  style={{ width: `${insights.positivePercentage}%` }}
                ></div>
              </div>
              <div className="ml-2 text-sm">{insights.positivePercentage}% positive</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Generate insights from emotional trends
function generateInsights(
  emotionalTrends: Array<{
    date: string
    dominant_emotion: string
    emotion_intensity: number
    triggers?: string[]
  }>,
) {
  // Count emotions
  const emotionCounts: Record<string, number> = {}
  emotionalTrends.forEach((trend) => {
    emotionCounts[trend.dominant_emotion] = (emotionCounts[trend.dominant_emotion] || 0) + 1
  })

  // Sort emotions by frequency
  const dominantEmotions = Object.entries(emotionCounts)
    .map(([emotion, count]) => ({ emotion, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  // Calculate positive percentage
  const positiveEmotions = ["happy", "content", "calm", "excited"]
  const positiveCount = emotionalTrends.filter((trend) => positiveEmotions.includes(trend.dominant_emotion)).length
  const positivePercentage = Math.round((positiveCount / emotionalTrends.length) * 100)

  // Analyze trends
  const trends = []

  // Check for increasing/decreasing trends in specific emotions
  const recentTrends = emotionalTrends.slice(-7) // Last 7 entries

  // Check if positive emotions are increasing
  const positiveStart = recentTrends
    .slice(0, 3)
    .filter((trend) => positiveEmotions.includes(trend.dominant_emotion)).length

  const positiveEnd = recentTrends.slice(-3).filter((trend) => positiveEmotions.includes(trend.dominant_emotion)).length

  if (positiveEnd > positiveStart) {
    trends.push({
      direction: "up",
      description: "Positive emotions have been increasing recently",
    })
  } else if (positiveEnd < positiveStart) {
    trends.push({
      direction: "down",
      description: "Positive emotions have been decreasing recently",
    })
  }

  // Check for intensity changes
  const intensityStart = recentTrends.slice(0, 3).reduce((sum, trend) => sum + trend.emotion_intensity, 0) / 3

  const intensityEnd = recentTrends.slice(-3).reduce((sum, trend) => sum + trend.emotion_intensity, 0) / 3

  if (intensityEnd > intensityStart + 1) {
    trends.push({
      direction: "up",
      description: "Emotional intensity has been increasing",
    })
  } else if (intensityEnd < intensityStart - 1) {
    trends.push({
      direction: "down",
      description: "Emotional intensity has been decreasing",
    })
  }

  // Analyze common triggers
  const triggerCounts: Record<string, number> = {}

  emotionalTrends.forEach((trend) => {
    if (trend.triggers && trend.triggers.length > 0) {
      trend.triggers.forEach((trigger) => {
        triggerCounts[trigger] = (triggerCounts[trigger] || 0) + 1
      })
    }
  })

  const commonTriggers = Object.entries(triggerCounts)
    .map(([trigger, count]) => ({ trigger, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    dominantEmotions,
    positivePercentage,
    trends,
    commonTriggers,
  }
}
