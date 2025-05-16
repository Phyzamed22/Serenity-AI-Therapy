"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { recordEmotionalTrend } from "@/actions/emotional-trends-actions"
import { useRouter } from "next/navigation"
import { Loader2, X, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"

export default function RecordEmotion() {
  const [dominantEmotion, setDominantEmotion] = useState("neutral")
  const [emotionIntensity, setEmotionIntensity] = useState(5)
  const [triggers, setTriggers] = useState<string[]>([])
  const [newTrigger, setNewTrigger] = useState("")
  const [notes, setNotes] = useState("")
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const handleRecordEmotion = async () => {
    setRecording(true)
    setError(null)

    try {
      // Ensure emotion intensity is within valid range (1-10)
      const validatedIntensity = Math.min(Math.max(emotionIntensity, 1), 10)

      await recordEmotionalTrend({
        dominantEmotion,
        emotionIntensity: validatedIntensity,
        triggers,
        notes,
      })

      toast({
        title: "Emotion Recorded",
        description: "Your emotional state has been recorded.",
      })

      // Reset form
      setDominantEmotion("neutral")
      setEmotionIntensity(5)
      setTriggers([])
      setNotes("")

      router.refresh()
    } catch (error: any) {
      console.error("Error recording emotion:", error)
      setError(error.message)
      toast({
        title: "Error",
        description: "Failed to record emotional state. Please try again.",
        variant: "destructive",
      })
    } finally {
      setRecording(false)
    }
  }

  const addTrigger = () => {
    if (newTrigger.trim() && !triggers.includes(newTrigger.trim())) {
      setTriggers([...triggers, newTrigger.trim()])
      setNewTrigger("")
    }
  }

  const removeTrigger = (trigger: string) => {
    setTriggers(triggers.filter((t) => t !== trigger))
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Record Your Emotional State</CardTitle>
        <CardDescription>Track how you're feeling today</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="dominantEmotion">How are you feeling?</Label>
          <Select value={dominantEmotion} onValueChange={setDominantEmotion}>
            <SelectTrigger>
              <SelectValue placeholder="Select emotion" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="happy">Happy</SelectItem>
              <SelectItem value="sad">Sad</SelectItem>
              <SelectItem value="angry">Angry</SelectItem>
              <SelectItem value="anxious">Anxious</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="calm">Calm</SelectItem>
              <SelectItem value="excited">Excited</SelectItem>
              <SelectItem value="frustrated">Frustrated</SelectItem>
              <SelectItem value="confused">Confused</SelectItem>
              <SelectItem value="content">Content</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="emotionIntensity">Intensity: {emotionIntensity}/10</Label>
            <span className="text-sm text-muted-foreground">
              {emotionIntensity <= 3 ? "Mild" : emotionIntensity <= 7 ? "Moderate" : "Strong"}
            </span>
          </div>
          <Slider
            id="emotionIntensity"
            min={1}
            max={10}
            step={1}
            value={[emotionIntensity]}
            onValueChange={(value) => setEmotionIntensity(value[0])}
          />
          <p className="text-xs text-muted-foreground">How strongly you're experiencing this emotion</p>
        </div>

        <div className="space-y-2">
          <Label>What triggered this emotion?</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {triggers.map((trigger) => (
              <Badge key={trigger} variant="secondary" className="flex items-center gap-1">
                {trigger}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeTrigger(trigger)}
                  aria-label={`Remove ${trigger}`}
                />
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newTrigger}
              onChange={(e) => setNewTrigger(e.target.value)}
              placeholder="Add a trigger"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addTrigger()
                }
              }}
            />
            <Button type="button" size="icon" onClick={addTrigger}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Events, thoughts, or situations that caused this emotion</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional thoughts or context..."
            rows={3}
          />
          <p className="text-xs text-muted-foreground">Optional details about your emotional state</p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </CardContent>
      <CardFooter>
        <Button onClick={handleRecordEmotion} className="w-full" disabled={recording}>
          {recording ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Record Emotion
        </Button>
      </CardFooter>
    </Card>
  )
}
