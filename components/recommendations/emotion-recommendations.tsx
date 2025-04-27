"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getEmotionalTrends } from "@/actions/emotional-trends-actions"
import { saveRecommendation } from "@/actions/recommendation-actions"
import { Loader2, ThumbsUp, ThumbsDown, Bookmark, BookmarkCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { generateRecommendations } from "@/lib/recommendation-engine"

interface EmotionRecommendationsProps {
  userId?: string
  timeframe?: number // days
}

export default function EmotionRecommendations({ userId, timeframe = 30 }: EmotionRecommendationsProps) {
  const [loading, setLoading] = useState(true)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [savedRecommendations, setSavedRecommendations] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("all")
  const { toast } = useToast()

  useEffect(() => {
    async function loadRecommendations() {
      try {
        setLoading(true)

        // Get emotional trends data
        const trendsData = await getEmotionalTrends(timeframe)

        if (trendsData.length === 0) {
          setRecommendations([])
          setLoading(false)
          return
        }

        // Generate recommendations based on trends
        const generatedRecommendations = generateRecommendations(trendsData)
        setRecommendations(generatedRecommendations)
      } catch (error) {
        console.error("Error loading recommendations:", error)
        toast({
          title: "Error",
          description: "Failed to load recommendations. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadRecommendations()
  }, [timeframe, toast])

  const handleSaveRecommendation = async (recommendation: any) => {
    try {
      await saveRecommendation({
        type: recommendation.type,
        content: recommendation.content,
        emotion: recommendation.emotion,
        tags: recommendation.tags || [],
      })

      setSavedRecommendations([...savedRecommendations, recommendation.id])

      toast({
        title: "Recommendation Saved",
        description: "This recommendation has been saved to your profile.",
      })
    } catch (error) {
      console.error("Error saving recommendation:", error)
      toast({
        title: "Error",
        description: "Failed to save recommendation. Please try again.",
        variant: "destructive",
      })
    }
  }

  const filteredRecommendations = recommendations.filter((rec) => {
    if (activeTab === "all") return true
    return rec.type === activeTab
  })

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Personalized Recommendations</CardTitle>
          <CardDescription>Based on your emotional patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Not enough emotional data to generate personalized recommendations yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Continue recording your emotions and completing therapy sessions to receive tailored suggestions.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personalized Recommendations</CardTitle>
        <CardDescription>Based on your emotional patterns over the past {timeframe} days</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="activity">Activities</TabsTrigger>
            <TabsTrigger value="coping">Coping</TabsTrigger>
            <TabsTrigger value="resource">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <div className="space-y-4">
              {filteredRecommendations.map((recommendation) => (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  isSaved={savedRecommendations.includes(recommendation.id)}
                  onSave={() => handleSaveRecommendation(recommendation)}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

interface RecommendationCardProps {
  recommendation: any
  isSaved: boolean
  onSave: () => void
}

function RecommendationCard({ recommendation, isSaved, onSave }: RecommendationCardProps) {
  const [helpful, setHelpful] = useState<boolean | null>(null)
  const { toast } = useToast()

  const handleFeedback = (isHelpful: boolean) => {
    setHelpful(isHelpful)
    toast({
      title: isHelpful ? "Marked as helpful" : "Marked as not helpful",
      description: "Thank you for your feedback. We'll use it to improve recommendations.",
    })
  }

  return (
    <Card className="overflow-hidden">
      <div className={`h-2 ${getEmotionColor(recommendation.emotion)}`}></div>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">{recommendation.title}</CardTitle>
            <CardDescription>{getTypeLabel(recommendation.type)}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onSave} disabled={isSaved}>
            {isSaved ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{recommendation.content}</p>

        {recommendation.tags && recommendation.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {recommendation.tags.map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-3 pb-2">
        <div className="text-xs text-muted-foreground">
          For: <span className="capitalize">{recommendation.emotion}</span> emotions
        </div>
        <div className="flex gap-1">
          <Button
            variant={helpful === true ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2"
            onClick={() => handleFeedback(true)}
          >
            <ThumbsUp className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Helpful</span>
          </Button>
          <Button
            variant={helpful === false ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2"
            onClick={() => handleFeedback(false)}
          >
            <ThumbsDown className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Not helpful</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

// Helper functions
function getTypeLabel(type: string): string {
  switch (type) {
    case "activity":
      return "Suggested Activity"
    case "coping":
      return "Coping Strategy"
    case "resource":
      return "Helpful Resource"
    default:
      return "Recommendation"
  }
}

function getEmotionColor(emotion: string): string {
  switch (emotion) {
    case "happy":
      return "bg-green-500"
    case "sad":
      return "bg-blue-500"
    case "angry":
      return "bg-red-500"
    case "anxious":
      return "bg-yellow-500"
    case "neutral":
      return "bg-gray-400"
    default:
      return "bg-primary"
  }
}
