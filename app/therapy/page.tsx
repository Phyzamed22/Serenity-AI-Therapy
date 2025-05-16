import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import TherapySession from "@/components/therapy-session"

export default async function Therapy() {
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
      <h1 className="text-3xl font-bold mb-8">Therapy Session</h1>
      <TherapySession />
    </div>
  )
}
