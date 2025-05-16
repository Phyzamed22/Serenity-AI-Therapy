"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getTherapistSettings, updateTherapistSettings } from "@/actions/therapist-actions"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { availableModels } from "@/lib/groq-client"

export default function TherapistSettings() {
  const [humorLevel, setHumorLevel] = useState(5)
  const [seriousnessLevel, setSeriousnessLevel] = useState(5)
  const [emotionalExpressiveness, setEmotionalExpressiveness] = useState(5)
  const [empathyLevel, setEmpathyLevel] = useState(8)
  const [directiveness, setDirectiveness] = useState(5)
  const [preferredModel, setPreferredModel] = useState("llama-3.1-70b-versatile")
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getTherapistSettings()
        setHumorLevel(settings.humorLevel)
        setSeriousnessLevel(settings.seriousnessLevel)
        setEmotionalExpressiveness(settings.emotionalExpressiveness)
        setEmpathyLevel(settings.empathyLevel)
        setDirectiveness(settings.directiveness)
        setPreferredModel(settings.preferredModel)
      } catch (error: any) {
        console.error("Error loading therapist settings:", error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  const handleUpdateSettings = async () => {
    setUpdating(true)
    setError(null)

    try {
      await updateTherapistSettings({
        humorLevel,
        seriousnessLevel,
        emotionalExpressiveness,
        empathyLevel,
        directiveness,
        preferredModel,
      })

      toast({
        title: "Settings Updated",
        description: "Your therapist personality settings have been saved.",
      })

      router.refresh()
    } catch (error: any) {
      console.error("Error updating therapist settings:", error)
      setError(error.message)
      toast({
        title: "Error",
        description: "Failed to update therapist settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
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
        <CardTitle>Therapist Personality</CardTitle>
        <CardDescription>Customize your AI therapist's personality and behavior</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="humor">Humor Level: {humorLevel}/10</Label>
              <span className="text-sm text-muted-foreground">
                {humorLevel <= 3 ? "Serious" : humorLevel <= 7 ? "Balanced" : "Humorous"}
              </span>
            </div>
            <Slider
              id="humor"
              min={0}
              max={10}
              step={1}
              value={[humorLevel]}
              onValueChange={(value) => setHumorLevel(value[0])}
            />
            <p className="text-xs text-muted-foreground">How much humor the therapist uses in conversations</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="seriousness">Seriousness Level: {seriousnessLevel}/10</Label>
              <span className="text-sm text-muted-foreground">
                {seriousnessLevel <= 3 ? "Casual" : seriousnessLevel <= 7 ? "Balanced" : "Formal"}
              </span>
            </div>
            <Slider
              id="seriousness"
              min={0}
              max={10}
              step={1}
              value={[seriousnessLevel]}
              onValueChange={(value) => setSeriousnessLevel(value[0])}
            />
            <p className="text-xs text-muted-foreground">How formal or casual the therapist's communication style is</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="emotional">Emotional Expressiveness: {emotionalExpressiveness}/10</Label>
              <span className="text-sm text-muted-foreground">
                {emotionalExpressiveness <= 3 ? "Reserved" : emotionalExpressiveness <= 7 ? "Balanced" : "Expressive"}
              </span>
            </div>
            <Slider
              id="emotional"
              min={0}
              max={10}
              step={1}
              value={[emotionalExpressiveness]}
              onValueChange={(value) => setEmotionalExpressiveness(value[0])}
            />
            <p className="text-xs text-muted-foreground">How emotionally expressive the therapist is in responses</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="empathy">Empathy Level: {empathyLevel}/10</Label>
              <span className="text-sm text-muted-foreground">
                {empathyLevel <= 3 ? "Factual" : empathyLevel <= 7 ? "Balanced" : "Deeply Empathetic"}
              </span>
            </div>
            <Slider
              id="empathy"
              min={0}
              max={10}
              step={1}
              value={[empathyLevel]}
              onValueChange={(value) => setEmpathyLevel(value[0])}
            />
            <p className="text-xs text-muted-foreground">How much the therapist focuses on emotional understanding</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="directiveness">Directiveness: {directiveness}/10</Label>
              <span className="text-sm text-muted-foreground">
                {directiveness <= 3 ? "Non-directive" : directiveness <= 7 ? "Balanced" : "Highly Directive"}
              </span>
            </div>
            <Slider
              id="directiveness"
              min={0}
              max={10}
              step={1}
              value={[directiveness]}
              onValueChange={(value) => setDirectiveness(value[0])}
            />
            <p className="text-xs text-muted-foreground">How much direct advice or guidance the therapist provides</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">Preferred AI Model</Label>
          <Select value={preferredModel} onValueChange={setPreferredModel}>
            <SelectTrigger>
              <SelectValue placeholder="Select AI model" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">The AI model used for generating therapist responses</p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </CardContent>
      <CardFooter>
        <Button onClick={handleUpdateSettings} className="w-full" disabled={updating}>
          {updating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save Personality Settings
        </Button>
      </CardFooter>
    </Card>
  )
}
