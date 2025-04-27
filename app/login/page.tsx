import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AuthForm from "@/components/auth/auth-form"

export default async function Login() {
  const supabase = createServerSupabaseClient()

  // Check if user is already authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Welcome to Serenity</h1>
        <p className="text-muted-foreground">Your AI-powered virtual therapist</p>
      </div>

      <AuthForm />
    </div>
  )
}
