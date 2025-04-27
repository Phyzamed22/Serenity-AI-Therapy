"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts"

interface EmotionRadarChartProps {
  emotionalTrends: Array<{
    date: string
    dominant_emotion: string
    emotion_intensity: number
  }>
}

export default function EmotionRadarChart({ emotionalTrends }: EmotionRadarChartProps) {
  const [timeframe, setTimeframe] = useState("week")

  // Process data for radar chart
  const data = processDataForRadar(emotionalTrends, timeframe)

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Emotional Balance</CardTitle>
            <CardDescription>Distribution of your emotions over time</CardDescription>
          </div>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
              <SelectItem value="year">Last 365 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {emotionalTrends.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No emotional data available for this timeframe.</p>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                <PolarGrid />
                <PolarAngleAxis dataKey="emotion" />
                <PolarRadiusAxis angle={30} domain={[0, 10]} />
                <Radar name="Current" dataKey="current" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.6} />
                <Radar name="Previous" dataKey="previous" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.4} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Process data for radar chart
function processDataForRadar(
  emotionalTrends: Array<{
    date: string
    dominant_emotion: string
    emotion_intensity: number
  }>,
  timeframe: string,
) {
  // Determine date ranges
  const now = new Date()
  let currentPeriodDays = 7

  if (timeframe === "month") {
    currentPeriodDays = 30
  } else if (timeframe === "year") {
    currentPeriodDays = 365
  }

  const currentPeriodStart = new Date()
  currentPeriodStart.setDate(now.getDate() - currentPeriodDays)

  const previousPeriodStart = new Date()
  previousPeriodStart.setDate(currentPeriodStart.getDate() - currentPeriodDays)

  // Filter trends for current and previous periods
  const currentPeriodTrends = emotionalTrends.filter((trend) => {
    const trendDate = new Date(trend.date)
    return trendDate >= currentPeriodStart && trendDate <= now
  })

  const previousPeriodTrends = emotionalTrends.filter((trend) => {
    const trendDate = new Date(trend.date)
    return trendDate >= previousPeriodStart && trendDate < currentPeriodStart
  })

  // Calculate average intensity for each emotion
  const emotions = ["happy", "sad", "angry", "anxious", "neutral", "content"]

  return emotions.map((emotion) => {
    // Current period
    const currentEmotionTrends = currentPeriodTrends.filter((trend) => trend.dominant_emotion === emotion)
    const currentAvgIntensity = currentEmotionTrends.length
      ? currentEmotionTrends.reduce((sum, trend) => sum + trend.emotion_intensity, 0) / currentEmotionTrends.length
      : 0

    // Previous period
    const previousEmotionTrends = previousPeriodTrends.filter((trend) => trend.dominant_emotion === emotion)
    const previousAvgIntensity = previousEmotionTrends.length
      ? previousEmotionTrends.reduce((sum, trend) => sum + trend.emotion_intensity, 0) / previousEmotionTrends.length
      : 0

    return {
      emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1),
      current: currentAvgIntensity,
      previous: previousAvgIntensity,
    }
  })
}
