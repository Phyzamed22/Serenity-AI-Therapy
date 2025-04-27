"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getEmotionalTrends } from "@/actions/emotional-trends-actions"
import { Loader2 } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface EmotionalTrend {
  id: string
  user_id: string
  date: string
  dominant_emotion: string
  emotion_intensity: number
  triggers: string[]
  notes: string | null
  created_at: string
}

const emotionColors = {
  happy: "#4ade80",
  sad: "#60a5fa",
  angry: "#f87171",
  anxious: "#fbbf24",
  neutral: "#94a3b8",
  calm: "#67e8f9",
  excited: "#c084fc",
  frustrated: "#fb923c",
  confused: "#a78bfa",
  content: "#34d399",
}

export default function EmotionalTrendsChart() {
  const [timeRange, setTimeRange] = useState("30")
  const [trends, setTrends] = useState<EmotionalTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTrends() {
      try {
        setLoading(true)
        const data = await getEmotionalTrends(Number.parseInt(timeRange))
        setTrends(data)
      } catch (error: any) {
        console.error("Error loading emotional trends:", error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    loadTrends()
  }, [timeRange])

  // Process data for the chart
  const chartData = trends.map((trend) => ({
    date: new Date(trend.date).toLocaleDateString(),
    emotion: trend.dominant_emotion,
    intensity: trend.emotion_intensity,
    // Map emotions to a numerical value for the chart
    value: getEmotionValue(trend.dominant_emotion, trend.emotion_intensity),
  }))

  // Group trends by emotion
  const emotionCounts: Record<string, number> = {}
  trends.forEach((trend) => {
    emotionCounts[trend.dominant_emotion] = (emotionCounts[trend.dominant_emotion] || 0) + 1
  })

  // Sort emotions by frequency
  const sortedEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([emotion]) => emotion)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Emotional Trends</CardTitle>
            <CardDescription>Track your emotional patterns over time</CardDescription>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {trends.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No emotional trend data available for this time period.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
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
                      return [`${item.emotion} (Intensity: ${item.intensity}/10)`]
                    }}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
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

            <div>
              <h3 className="text-lg font-medium mb-2">Most Common Emotions</h3>
              <div className="flex flex-wrap gap-2">
                {sortedEmotions.map((emotion) => (
                  <div
                    key={emotion}
                    className="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                    style={{
                      backgroundColor: getEmotionColor(emotion, 0.2),
                      color: getEmotionColor(emotion, 1),
                    }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getEmotionColor(emotion, 1) }}
                    ></div>
                    <span className="capitalize">{emotion}</span>
                    <span className="font-medium">({emotionCounts[emotion]})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Helper function to map emotions to numerical values for the chart
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

// Helper function to get color for an emotion
function getEmotionColor(emotion: string, opacity = 1): string {
  const color = (emotionColors as any)[emotion.toLowerCase()] || "#94a3b8"

  if (opacity === 1) {
    return color
  }

  // Convert hex to rgba for opacity
  const r = Number.parseInt(color.slice(1, 3), 16)
  const g = Number.parseInt(color.slice(3, 5), 16)
  const b = Number.parseInt(color.slice(5, 7), 16)

  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}
