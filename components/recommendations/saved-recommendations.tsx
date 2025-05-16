"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getSavedRecommendations, deleteSavedRecommendation } from "@/actions/recommendation-actions"
import { Loader2, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function SavedRecommendations() {
  const [loading, setLoading] = useState(true)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const { toast } = useToast()

  useEffect(() => {
    async function loadSavedRecommendations() {
      try {
        setLoading(true)
        const data = await getSavedRecommendations()
        setRecommendations(data)
      } catch (error) {
        console.error("Error loading saved recommendations:", error)
        toast({
          title: "Error",
          description: "Failed to load saved recommendations. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadSavedRecommendations()
  }, [toast])

  const handleDelete = async (id: string) => {
    try {
      await deleteSavedRecommendation(id)
      setRecommendations(recommendations.filter((rec) => rec.id !== id))

      toast({
        title: "Recommendation Deleted",
        description: "The recommendation has been removed from your saved items.",
      })
    } catch (error) {
      console.error("Error deleting recommendation:", error)
      toast({
        title: "Error",
        description: "Failed to delete recommendation. Please try again.",
        variant: "destructive",
      })
    }
  }

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
          <CardTitle>Saved Recommendations</CardTitle>
          <CardDescription>Your collection of helpful suggestions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">You haven't saved any recommendations yet.</p>
            <p className="text-sm text-muted-foreground">
              When you find helpful recommendations, save them here for easy reference.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved Recommendations</CardTitle>
        <CardDescription>Your collection of helpful suggestions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.map((recommendation) => (
            <Card key={recommendation.id} className="overflow-hidden">
              <div className={`h-2 ${getEmotionColor(recommendation.emotion)}`}></div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{getTypeLabel(recommendation.type)}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(recommendation.id)}>
                    <Trash2 className="h-4 w-4" />
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

                <div className="text-xs text-muted-foreground mt-3">
                  Saved on: {new Date(recommendation.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
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
