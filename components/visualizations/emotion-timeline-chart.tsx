"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts"

interface EmotionTimelineChartProps {
  emotionalTrends: Array<{
    date: string
    dominant_emotion: string
    emotion_intensity: number
  }>
}

export default function EmotionTimelineChart({ emotionalTrends }: EmotionTimelineChartProps) {
  const [timeframe, setTimeframe] = useState("week")

  // Process data for timeline chart
  const data = processDataForTimeline(emotionalTrends, timeframe)

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Emotional Journey</CardTitle>
            <CardDescription>Track your emotional changes over time</CardDescription>
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
              <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" />
                <YAxis
                  domain={[-10, 10]}
                  ticks={[-10, -5, 0, 5, 10]}
                  tickFormatter={(value) => {
                    if (value === 10) return "Very Positive"
                    if (value === 5) return "Positive"
                    if (value === 0) return "Neutral"
                    if (value === -5) return "Negative"
                    if (value === -10) return "Very Negative"
                    return ""
                  }}
                />
                <Tooltip
                  formatter={(value, name, props) => {
                    const item = props.payload
                    return [`${item.emotionLabel} (Intensity: ${item.intensity}/10)`]
                  }}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <ReferenceLine y={0} stroke="#000" strokeOpacity={0.3} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={{ r: 5, strokeWidth: 2 }}
                  activeDot={{ r: 8, strokeWidth: 2 }}
                  name="Emotional State"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Process data for timeline chart
function processDataForTimeline(
  emotionalTrends: Array<{
    date: string
    dominant_emotion: string
    emotion_intensity: number
  }>,
  timeframe: string,
) {
  // Determine date range
  const now = new Date()
  let days = 7

  if (timeframe === "month") {
    days = 30
  } else if (timeframe === "year") {
    days = 365
  }

  // Create array of dates
  const result = []
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(now.getDate() - i)
    const dateString = date.toISOString().split("T")[0]

    // Find matching trend data
    const trendData = emotionalTrends.find((trend) => trend.date === dateString)

    if (trendData) {
      result.push({
        date: formatDate(dateString, timeframe),
        emotion: trendData.dominant_emotion,
        emotionLabel: trendData.dominant_emotion.charAt(0).toUpperCase() + trendData.dominant_emotion.slice(1),
        intensity: trendData.emotion_intensity,
        value: getEmotionValue(trendData.dominant_emotion, trendData.emotion_intensity),
      })
    } else {
      // Add empty data point for dates with no data
      result.push({
        date: formatDate(dateString, timeframe),
        emotion: "none",
        emotionLabel: "No data",
        intensity: 0,
        value: null,
      })
    }
  }

  return result
}

// Format date based on timeframe
function formatDate(dateString: string, timeframe: string) {
  const date = new Date(dateString)

  if (timeframe === "week") {
    return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
  } else if (timeframe === "month") {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  } else {
    return date.toLocaleDateString(undefined, { month: "short", year: "numeric" })
  }
}

// Map emotion to numerical value for chart
function getEmotionValue(emotion: string, intensity: number): number {
  // Normalize intensity to a 0-10 scale
  const normalizedIntensity = intensity / 10

  switch (emotion.toLowerCase()) {
    case "happy":
    case "excited":
    case "content":
      return normalizedIntensity * 10 // Positive emotions
    case "calm":
      return normalizedIntensity * 5 // Slightly positive
    case "neutral":
      return 0 // Neutral
    case "confused":
      return normalizedIntensity * -3 // Slightly negative
    case "anxious":
    case "frustrated":
      return normalizedIntensity * -7 // Moderately negative
    case "sad":
    case "angry":
      return normalizedIntensity * -10 // Very negative
    default:
      return 0
  }
}
