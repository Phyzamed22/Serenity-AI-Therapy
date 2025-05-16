"use client"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

interface EmotionTimelineProps {
  data: Array<{
    time: number
    emotion: string
    confidence: number
  }>
}

// Map emotions to numerical values for the chart
const emotionToValue = {
  happy: 1,
  neutral: 0,
  anxious: -0.5,
  sad: -0.8,
  angry: -1,
}

export default function EmotionTimeline({ data }: EmotionTimelineProps) {
  const chartData = data.map((item) => {
    return {
      time: new Date(item.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      value: emotionToValue[item.emotion as keyof typeof emotionToValue] * item.confidence,
      emotion: item.emotion,
    }
  })

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-center">
        <h3 className="text-lg font-medium">No emotion data yet</h3>
        <p className="text-sm text-muted-foreground mt-2">Your emotional patterns will appear here as we talk.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Emotional Journey</h3>
      <div className="emotion-timeline">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} tickLine={false} />
            <YAxis
              domain={[-1, 1]}
              ticks={[-1, -0.5, 0, 0.5, 1]}
              tickFormatter={(value) => {
                if (value === 1) return "Happy"
                if (value === 0.5) return "Positive"
                if (value === 0) return "Neutral"
                if (value === -0.5) return "Anxious"
                if (value === -1) return "Sad/Angry"
                return ""
              }}
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <Tooltip
              formatter={(value, name) => {
                const emotionValue = Number(value)
                let emotion = "Neutral"

                if (emotionValue >= 0.8) emotion = "Very Happy"
                else if (emotionValue >= 0.3) emotion = "Happy"
                else if (emotionValue >= -0.3) emotion = "Neutral"
                else if (emotionValue >= -0.7) emotion = "Anxious/Sad"
                else emotion = "Very Sad/Angry"

                return emotion
              }}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#7c3aed"
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-muted-foreground text-center">
        Tracking your emotional state throughout the session
      </div>
    </div>
  )
}
