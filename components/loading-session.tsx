import { Loader2 } from "lucide-react"

export default function LoadingSession() {
  return (
    <div className="flex flex-col items-center justify-center h-[80vh]">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <h2 className="mt-4 text-xl font-medium">Preparing your therapy session...</h2>
      <p className="text-muted-foreground mt-2">Setting up a safe space for you</p>
    </div>
  )
}
