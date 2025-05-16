"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export default function UserProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/login")
          return
        }

        const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

        if (error) throw error

        setProfile(data)
        setFullName(data.full_name || "")
      } catch (error: any) {
        console.error("Error loading profile:", error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router, supabase])

  const updateProfile = async () => {
    if (!profile) return

    setUpdating(true)
    setError(null)

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)

      if (error) throw error

      setProfile({
        ...profile,
        full_name: fullName,
      })

      router.refresh()
    } catch (error: any) {
      console.error("Error updating profile:", error)
      setError(error.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
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
        <CardTitle>Your Profile</CardTitle>
        <CardDescription>Manage your personal information and account settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || "User"} />
            <AvatarFallback className="text-2xl">{profile?.full_name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleSignOut}>
          Sign Out
        </Button>
        <Button onClick={updateProfile} disabled={updating}>
          {updating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  )
}
