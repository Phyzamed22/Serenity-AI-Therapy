"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useTheme } from "next-themes"

interface UserSettings {
  user_id: string
  theme: string
  voice_enabled: boolean
  webcam_enabled: boolean
  data_retention_days: number
}

export default function UserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [webcamEnabled, setWebcamEnabled] = useState(true)
  const [dataRetention, setDataRetention] = useState("90")
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientSupabaseClient()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    async function loadSettings() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/login")
          return
        }

        const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", user.id).single()

        if (error) throw error

        setSettings(data)
        setVoiceEnabled(data.voice_enabled)
        setWebcamEnabled(data.webcam_enabled)
        setDataRetention(data.data_retention_days.toString())
        setTheme(data.theme)
      } catch (error: any) {
        console.error("Error loading settings:", error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [router, supabase, setTheme])

  const updateSettings = async () => {
    if (!settings) return

    setUpdating(true)
    setError(null)

    try {
      const { error } = await supabase
        .from("user_settings")
        .update({
          theme: theme,
          voice_enabled: voiceEnabled,
          webcam_enabled: webcamEnabled,
          data_retention_days: Number.parseInt(dataRetention),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", settings.user_id)

      if (error) throw error

      setSettings({
        ...settings,
        theme: theme || "light",
        voice_enabled: voiceEnabled,
        webcam_enabled: webcamEnabled,
        data_retention_days: Number.parseInt(dataRetention),
      })

      router.refresh()
    } catch (error: any) {
      console.error("Error updating settings:", error)
      setError(error.message)
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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Customize your therapy experience</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="voice">Voice Feedback</Label>
            <p className="text-sm text-muted-foreground">Enable text-to-speech for therapist responses</p>
          </div>
          <Switch id="voice" checked={voiceEnabled} onCheckedChange={setVoiceEnabled} />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="webcam">Webcam Analysis</Label>
            <p className="text-sm text-muted-foreground">Enable facial expression analysis</p>
          </div>
          <Switch id="webcam" checked={webcamEnabled} onCheckedChange={setWebcamEnabled} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="retention">Data Retention</Label>
          <Select value={dataRetention} onValueChange={setDataRetention}>
            <SelectTrigger>
              <SelectValue placeholder="Select data retention period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="60">60 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="180">180 days</SelectItem>
              <SelectItem value="365">1 year</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">How long to keep your therapy session data</p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </CardContent>
      <CardFooter>
        <Button onClick={updateSettings} className="w-full" disabled={updating}>
          {updating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save Settings
        </Button>
      </CardFooter>
    </Card>
  )
}
