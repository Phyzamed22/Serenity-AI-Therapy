import { Suspense } from "react"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getUserSessions } from "@/actions/session-actions"
import { getEmotionalTrends } from "@/actions/emotional-trends-actions"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import UserProfile from "@/components/profile/user-profile"
import TherapistSettings from "@/components/profile/therapist-settings"
import TherapyPreferences from "@/components/profile/therapy-preferences"
import EmotionTimelineChart from "@/components/visualizations/emotion-timeline-chart"
import EmotionRadarChart from "@/components/visualizations/emotion-radar-chart"
import EmotionHeatmap from "@/components/visualizations/emotion-heatmap"
import EmotionInsights from "@/components/visualizations/emotion-insights"
import RecordEmotion from "@/components/profile/record-emotion"
import EmotionRecommendations from "@/components/recommendations/emotion-recommendations"
import SavedRecommendations from "@/components/recommendations/saved-recommendations"

async function SessionsList() {
  const sessions = await getUserSessions()

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium mb-2">No therapy sessions yet</h3>
        <p className="text-muted-foreground mb-6">Start your first session to begin your therapy journey</p>
        <Button asChild>
          <Link href="/therapy">Start New Session</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sessions.map((session) => (
        <Card key={session.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle>{session.title}</CardTitle>
            <CardDescription>
              {new Date(session.started_at).toLocaleDateString()}
              {" · "}
              {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${getEmotionColor(session.overall_mood)}`}></div>
                <span className="text-sm font-medium capitalize">{session.overall_mood || "No mood data"}</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{session.summary || "No summary available"}</p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" className="flex-1">
                <Link href={`/sessions/${session.id}`}>View Details</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="flex-1">
                <Link href={`/therapy?session=${session.id}`}>Continue</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="flex flex-col items-center justify-center p-6 border-dashed">
        <p className="text-muted-foreground mb-4">Start a new therapy session</p>
        <Button asChild>
          <Link href="/therapy">New Session</Link>
        </Button>
      </Card>
    </div>
  )
}

async function EmotionalTrendsView() {
  const trends = await getEmotionalTrends(365) // Get all trends for the last year

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EmotionTimelineChart emotionalTrends={trends} />
        <EmotionRadarChart emotionalTrends={trends} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EmotionHeatmap emotionalTrends={trends} />
        <EmotionInsights emotionalTrends={trends} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RecordEmotion />
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

export default async function Dashboard() {
  const supabase = createServerSupabaseClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Your Dashboard</h1>

      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-8">
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="trends">Emotional Trends</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="therapist">Therapist</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Your Therapy Sessions</h2>
            <Suspense fallback={<div>Loading sessions...</div>}>
              <SessionsList />
            </Suspense>
          </div>
        </TabsContent>

        <TabsContent value="trends">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Your Emotional Journey</h2>
            <Suspense fallback={<div>Loading emotional trends...</div>}>
              <EmotionalTrendsView />
            </Suspense>
          </div>
        </TabsContent>

        <TabsContent value="recommendations">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Personalized Recommendations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <EmotionRecommendations timeframe={30} />
              <SavedRecommendations />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="profile">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Your Profile</h2>
            <UserProfile />
          </div>
        </TabsContent>

        <TabsContent value="therapist">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Therapist Personality</h2>
            <TherapistSettings />
          </div>
        </TabsContent>

        <TabsContent value="preferences">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Therapy Preferences</h2>
            <TherapyPreferences />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
