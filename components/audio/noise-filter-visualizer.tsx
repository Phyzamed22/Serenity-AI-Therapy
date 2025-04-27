"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { getNoiseFilter } from "@/lib/audio/noise-filter"
import { getEnhancedSpeechRecognition } from "@/lib/enhanced-speech-recognition"

export default function NoiseFilterVisualizer() {
  const [isEnabled, setIsEnabled] = useState(false)
  const [threshold, setThreshold] = useState(15)
  const [isAdaptive, setIsAdaptive] = useState(true)
  const [isHighPassEnabled, setIsHighPassEnabled] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  // Initialize noise filter
  useEffect(() => {
    // Update speech recognition with current settings
    const recognition = getEnhancedSpeechRecognition()
    recognition.setNoiseFilterEnabled(isEnabled)

    // Update noise filter options
    if (isEnabled) {
      getNoiseFilter().updateOptions({
        noiseGateThreshold: threshold,
        adaptiveThreshold: isAdaptive,
        highPassFilter: isHighPassEnabled,
        highPassFrequency: 85,
        spectralSubtraction: false,
        dynamicCompression: true,
      })
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isEnabled, threshold, isAdaptive, isHighPassEnabled])

  // Handle calibration
  const handleCalibrate = () => {
    if (isEnabled) {
      getNoiseFilter().startNoiseProfileCalibration()
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Noise Filter</span>
          <Switch checked={isEnabled} onCheckedChange={setIsEnabled} id="noise-filter-toggle" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="threshold-slider">Noise Threshold</Label>
              <span className="text-sm text-muted-foreground">{threshold}%</span>
            </div>
            <Slider
              id="threshold-slider"
              min={0}
              max={50}
              step={1}
              value={[threshold]}
              onValueChange={(values) => setThreshold(values[0])}
              disabled={!isEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="adaptive-toggle">Adaptive Threshold</Label>
            <Switch id="adaptive-toggle" checked={isAdaptive} onCheckedChange={setIsAdaptive} disabled={!isEnabled} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="highpass-toggle">High-Pass Filter</Label>
            <Switch
              id="highpass-toggle"
              checked={isHighPassEnabled}
              onCheckedChange={setIsHighPassEnabled}
              disabled={!isEnabled}
            />
          </div>

          <Button onClick={handleCalibrate} disabled={!isEnabled} className="w-full">
            Calibrate to Environment
          </Button>

          <div className="text-xs text-muted-foreground mt-2">
            {isEnabled
              ? "Noise filtering is active. Calibrate in a quiet moment to improve filtering."
              : "Enable noise filtering to improve speech recognition in noisy environments."}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
