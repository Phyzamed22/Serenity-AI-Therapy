"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface EmotionHeatmapProps {
  emotionalTrends: Array<{
    date: string
    dominant_emotion: string
    emotion_intensity: number
  }>
}

export default function EmotionHeatmap({ emotionalTrends }: EmotionHeatmapProps) {
  const [timeframe, setTimeframe] = useState("week")

  // Process data based on timeframe
  const processedData = processDataForHeatmap(emotionalTrends, timeframe)

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Emotion Heatmap</CardTitle>
            <CardDescription>Visualize your emotional patterns over time</CardDescription>
          </div>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="year">Year</SelectItem>
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
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-1">
              {timeframe === "week" && (
                <>
                  <div className="text-xs text-center text-muted-foreground">Mon</div>
                  <div className="text-xs text-center text-muted-foreground">Tue</div>
                  <div className="text-xs text-center text-muted-foreground">Wed</div>
                  <div className="text-xs text-center text-muted-foreground">Thu</div>
                  <div className="text-xs text-center text-muted-foreground">Fri</div>
                  <div className="text-xs text-center text-muted-foreground">Sat</div>
                  <div className="text-xs text-center text-muted-foreground">Sun</div>
                </>
              )}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {processedData.map((day, index) => (
                <div
                  key={index}
                  className={`aspect-square rounded-md ${getEmotionBackgroundColor(day.emotion, day.intensity)}`}
                  title={`${day.date}: ${day.emotion} (${day.intensity}/10)`}
                >
                  {timeframe !== "week" && (
                    <div className="h-full flex items-center justify-center text-xs">
                      {new Date(day.date).getDate()}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-xs">Happy</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-xs">Sad</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-xs">Angry</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-xs">Anxious</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  <span className="text-xs">Neutral</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Process data for heatmap visualization
function processDataForHeatmap(
  emotionalTrends: Array<{
    date: string
    dominant_emotion: string
    emotion_intensity: number
  }>,
  timeframe: string,
) {
  const now = new Date()
  let days = 7

  if (timeframe === "month") {
    days = 30
  } else if (timeframe === "year") {
    days = 365
  }

  // Create array of dates
  const result = []
  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(now.getDate() - i)
    const dateString = date.toISOString().split("T")[0]

    // Find matching trend data
    const trendData = emotionalTrends.find((trend) => trend.date === dateString)

    if (trendData) {
      result.unshift({
        date: dateString,
        emotion: trendData.dominant_emotion,
        intensity: trendData.emotion_intensity,
      })
    } else {
      result.unshift({
        date: dateString,
        emotion: "none",
        intensity: 0,
      })
    }
  }

  return result
}

// Get background color based on emotion and intensity
function getEmotionBackgroundColor(emotion: string, intensity: number) {
  // Calculate opacity based on intensity (0.3 to 1)
  const opacity = intensity ? 0.3 + (intensity / 10) * 0.7 : 0.1

  switch (emotion) {
    case "happy":
      return `bg-green-500/[${opacity}]`
    case "sad":
      return `bg-blue-500/[${opacity}]`
    case "angry":
      return `bg-red-500/[${opacity}]`
    case "anxious":
      return `bg-yellow-500/[${opacity}]`
    case "neutral":
      return `bg-gray-400/[${opacity}]`
    case "none":
    default:
      return "bg-gray-100"
  }
}
