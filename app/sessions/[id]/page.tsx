import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getSessionMessages, getSessionEmotionData } from "@/actions/session-actions"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import ChatInterface from "@/components/chat-interface"
import EmotionTimeline from "@/components/emotion-timeline"

export default async function SessionDetails({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get session data
  const { data: session } = await supabase
    .from("therapy_sessions")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single()

  if (!session) {
    redirect("/dashboard")
  }

  // Get messages
  const messages = await getSessionMessages(params.id)

  // Get emotion data
  const emotionData = await getSessionEmotionData(params.id)

  // Format emotion data for timeline
  const formattedEmotionData = emotionData.map((data) => ({
    time: new Date(data.timestamp).getTime(),
    emotion: data.primary_emotion,
    confidence: Math.max(data.happy, data.sad, data.angry, data.anxious, data.neutral),
  }))

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>

        <h1 className="text-3xl font-bold">{session.title}</h1>
        <p className="text-muted-foreground">
          {new Date(session.started_at).toLocaleString()}
          {session.ended_at && ` - ${new Date(session.ended_at).toLocaleString()}`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardContent>
              <ChatInterface
                messages={messages.map((msg) => ({
                  role: msg.role,
                  content: msg.content,
                  emotion: msg.detected_emotion || undefined,
                }))}
                currentEmotion=""
              />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Emotional Journey</CardTitle>
            </CardHeader>
            <CardContent>
              <EmotionTimeline data={formattedEmotionData} />
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Session Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <h3 className="font-medium mb-1">Overall Mood</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getEmotionColor(session.overall_mood)}`}></div>
                  <span className="capitalize">{session.overall_mood || "No mood data"}</span>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-1">Summary</h3>
                <p className="text-muted-foreground">{session.summary || "No summary available"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function getEmotionColor(emotion: string | null) {
  switch (emotion) {
    case "happy":
      return "bg-green-500"
    case "sad":
      return "bg-blue-500"
    case "angry":
      return "bg-red-500"
    case "anxious":
      return "bg-yellow-500"
    default:
      return "bg-gray-500"
  }
}
