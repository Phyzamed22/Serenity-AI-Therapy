"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getTherapyPreferences, updateTherapyPreferences } from "@/actions/therapy-preferences-actions"
import { useRouter } from "next/navigation"
import { Loader2, X, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

export default function TherapyPreferences() {
  const [preferredStyle, setPreferredStyle] = useState("balanced")
  const [communicationPreference, setCommunicationPreference] = useState("reflective")
  const [topicsToAvoid, setTopicsToAvoid] = useState<string[]>([])
  const [helpfulApproaches, setHelpfulApproaches] = useState<string[]>([])
  const [newTopic, setNewTopic] = useState("")
  const [newApproach, setNewApproach] = useState("")
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    async function loadPreferences() {
      try {
        const preferences = await getTherapyPreferences()
        setPreferredStyle(preferences.preferred_style)
        setCommunicationPreference(preferences.communication_preference)
        setTopicsToAvoid(preferences.topics_to_avoid || [])
        setHelpfulApproaches(preferences.helpful_approaches || [])
      } catch (error: any) {
        console.error("Error loading therapy preferences:", error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    loadPreferences()
  }, [])

  const handleUpdatePreferences = async () => {
    setUpdating(true)
    setError(null)

    try {
      await updateTherapyPreferences({
        preferredStyle,
        communicationPreference,
        topicsToAvoid,
        helpfulApproaches,
      })

      toast({
        title: "Preferences Updated",
        description: "Your therapy preferences have been saved.",
      })

      router.refresh()
    } catch (error: any) {
      console.error("Error updating therapy preferences:", error)
      setError(error.message)
      toast({
        title: "Error",
        description: "Failed to update therapy preferences. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const addTopic = () => {
    if (newTopic.trim() && !topicsToAvoid.includes(newTopic.trim())) {
      setTopicsToAvoid([...topicsToAvoid, newTopic.trim()])
      setNewTopic("")
    }
  }

  const removeTopic = (topic: string) => {
    setTopicsToAvoid(topicsToAvoid.filter((t) => t !== topic))
  }

  const addApproach = () => {
    if (newApproach.trim() && !helpfulApproaches.includes(newApproach.trim())) {
      setHelpfulApproaches([...helpfulApproaches, newApproach.trim()])
      setNewApproach("")
    }
  }

  const removeApproach = (approach: string) => {
    setHelpfulApproaches(helpfulApproaches.filter((a) => a !== approach))
  }

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
        <CardTitle>Therapy Preferences</CardTitle>
        <CardDescription>Customize how your AI therapist interacts with you</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="preferredStyle">Preferred Therapy Style</Label>
          <Select value={preferredStyle} onValueChange={setPreferredStyle}>
            <SelectTrigger>
              <SelectValue placeholder="Select preferred style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="supportive">Supportive (Emotional support focus)</SelectItem>
              <SelectItem value="cognitive">Cognitive (Thought patterns focus)</SelectItem>
              <SelectItem value="solution">Solution-Focused (Action-oriented)</SelectItem>
              <SelectItem value="balanced">Balanced (Mix of approaches)</SelectItem>
              <SelectItem value="mindfulness">Mindfulness-Based (Present moment focus)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">The overall therapeutic approach you prefer</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="communicationPreference">Communication Style</Label>
          <Select value={communicationPreference} onValueChange={setCommunicationPreference}>
            <SelectTrigger>
              <SelectValue placeholder="Select communication style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reflective">Reflective (Mirrors your feelings)</SelectItem>
              <SelectItem value="direct">Direct (Clear and straightforward)</SelectItem>
              <SelectItem value="gentle">Gentle (Soft and supportive)</SelectItem>
              <SelectItem value="analytical">Analytical (Logical and detailed)</SelectItem>
              <SelectItem value="metaphorical">Metaphorical (Uses stories and analogies)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">How you prefer the therapist to communicate with you</p>
        </div>

        <div className="space-y-2">
          <Label>Topics to Avoid</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {topicsToAvoid.map((topic) => (
              <Badge key={topic} variant="secondary" className="flex items-center gap-1">
                {topic}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeTopic(topic)}
                  aria-label={`Remove ${topic}`}
                />
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="Add a topic to avoid"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addTopic()
                }
              }}
            />
            <Button type="button" size="icon" onClick={addTopic}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Topics you'd prefer not to discuss in therapy</p>
        </div>

        <div className="space-y-2">
          <Label>Helpful Approaches</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {helpfulApproaches.map((approach) => (
              <Badge key={approach} variant="secondary" className="flex items-center gap-1">
                {approach}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeApproach(approach)}
                  aria-label={`Remove ${approach}`}
                />
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newApproach}
              onChange={(e) => setNewApproach(e.target.value)}
              placeholder="Add a helpful approach"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addApproach()
                }
              }}
            />
            <Button type="button" size="icon" onClick={addApproach}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Approaches or techniques you've found helpful in the past</p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </CardContent>
      <CardFooter>
        <Button onClick={handleUpdatePreferences} className="w-full" disabled={updating}>
          {updating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save Therapy Preferences
        </Button>
      </CardFooter>
    </Card>
  )
}
