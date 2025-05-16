"use client"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import EmotionRecommendations from "./recommendations/emotion-recommendations"

interface TherapySessionSummaryProps {
  sessionId: string
  summary: string
  dominantEmotion: string
  duration: number // in minutes
}

export default function TherapySessionSummary({
  sessionId,
  summary,
  dominantEmotion,
  duration,
}: TherapySessionSummaryProps) {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Session Complete</CardTitle>
          <CardDescription>Your therapy session has been saved</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Session Summary</h3>
            <p className="text-muted-foreground">{summary}</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted p-4 rounded-lg text-center">
              <div className="text-2xl font-bold">{duration} min</div>
              <div className="text-sm text-muted-foreground">Duration</div>
            </div>

            <div className="bg-muted p-4 rounded-lg text-center">
              <div className="flex justify-center">
                <Badge className={`capitalize ${getEmotionColor(dominantEmotion)}`}>{dominantEmotion}</Badge>
              </div>
              <div className="text-sm text-muted-foreground mt-1">Primary Emotion</div>
            </div>

            <div className="bg-muted p-4 rounded-lg text-center">
              <div className="text-2xl font-bold">{new Date().toLocaleDateString()}</div>
              <div className="text-sm text-muted-foreground">Date</div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push(`/sessions/${sessionId}`)}>
            View Details
          </Button>
          <Button onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
        </CardFooter>
      </Card>

      <EmotionRecommendations timeframe={7} />
    </div>
  )
}

function getEmotionColor(emotion: string): string {
  switch (emotion) {
    case "happy":
      return "bg-green-100 text-green-800 border-green-300"
    case "sad":
      return "bg-blue-100 text-blue-800 border-blue-300"
    case "angry":
      return "bg-red-100 text-red-800 border-red-300"
    case "anxious":
      return "bg-yellow-100 text-yellow-800 border-yellow-300"
    case "neutral":
      return "bg-gray-100 text-gray-800 border-gray-300"
    default:
      return "bg-primary-100 text-primary-800 border-primary-300"
  }
}
