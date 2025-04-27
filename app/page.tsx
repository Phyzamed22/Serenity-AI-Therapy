"use client"

import { Suspense } from "react"
import Header from "@/components/header"
import TherapySession from "@/components/therapy-session"
import LoadingSession from "@/components/loading-session"
import { useEffect, useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase/client"

export default function Home() {
  const [supabaseInitialized, setSupabaseInitialized] = useState(false)
  const [supabaseError, setSupabaseError] = useState<Error | null>(null)

  useEffect(() => {
    try {
      const supabase = createClientSupabaseClient()
      // Test the connection
      supabase.auth.getSession().then(({ data, error }) => {
        if (error) {
          console.error("Supabase initialization error:", error)
          setSupabaseError(error)
        } else {
          setSupabaseInitialized(true)
        }
      })
    } catch (error) {
      console.error("Failed to initialize Supabase client:", error)
      setSupabaseError(error as Error)
    }
  }, [])

  if (supabaseError) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Connection Error</h2>
          <p className="text-red-600 mb-4">
            We're having trouble connecting to our database. This could be due to missing environment variables.
          </p>
          <div className="bg-white p-4 rounded border border-red-100 text-sm font-mono overflow-auto">
            <p>Error: {supabaseError.message}</p>
          </div>
          <p className="mt-4 text-gray-700">Please make sure you have set up the following environment variables:</p>
          <ul className="list-disc list-inside mt-2 text-gray-700">
            <li>NEXT_PUBLIC_SUPABASE_URL</li>
            <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary/10">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<LoadingSession />}>
          <TherapySession />
        </Suspense>
      </div>
    </main>
  )
}
