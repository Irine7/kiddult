import SafetyTracker from "@/components/safety-tracker"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Safe Zone Tracker</h1>
      <p className="text-muted-foreground mb-8 text-center max-w-2xl">
        Monitor the location of vulnerable individuals and receive notifications when they leave designated safe zones.
      </p>
      <SafetyTracker />
    </main>
  )
}

