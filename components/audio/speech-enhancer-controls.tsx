"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  type SpeechEnhancerOptions,
  type SpeechEnhancerState,
  SPEECH_ENHANCER_PRESETS,
  getSpeechEnhancer,
} from "@/lib/audio/speech-enhancer"

interface SpeechEnhancerControlsProps {
  compact?: boolean
  showFrequencyResponse?: boolean
}

export default function SpeechEnhancerControls({
  compact = false,
  showFrequencyResponse = true,
}: SpeechEnhancerControlsProps) {
  const [options, setOptions] = useState<SpeechEnhancerOptions>(SPEECH_ENHANCER_PRESETS.default)
  const [state, setState] = useState<SpeechEnhancerState>({
    isEnabled: true,
    activePreset: "default",
    signalLevel: 0,
    enhancementLevel: 0,
    frequencyResponse: null,
  })
  const [activeTab, setActiveTab] = useState("presets")

  // Initialize and subscribe to state changes
  useEffect(() => {
    const enhancer = getSpeechEnhancer()

    // Subscribe to state changes
    enhancer.onStateChange((newState) => {
      setState(newState)
    })

    // Get initial state
    setState(enhancer.getState())
    setOptions(
      enhancer.getState().isEnabled
        ? SPEECH_ENHANCER_PRESETS[enhancer.getState().activePreset as keyof typeof SPEECH_ENHANCER_PRESETS]
        : SPEECH_ENHANCER_PRESETS.default,
    )

    return () => {
      // Cleanup
      enhancer.onStateChange(() => {})
    }
  }, [])

  // Update options
  const updateOptions = (newOptions: Partial<SpeechEnhancerOptions>) => {
    const enhancer = getSpeechEnhancer()
    enhancer.updateOptions(newOptions)

    // Update local state
    setOptions((prev) => ({
      ...prev,
      ...newOptions,
      frequencyEnhancement: {
        ...prev.frequencyEnhancement,
        ...(newOptions.frequencyEnhancement || {}),
      },
      formantEnhancement: {
        ...prev.formantEnhancement,
        ...(newOptions.formantEnhancement || {}),
      },
      sibilanceEnhancement: {
        ...prev.sibilanceEnhancement,
        ...(newOptions.sibilanceEnhancement || {}),
      },
      compression: {
        ...prev.compression,
        ...(newOptions.compression || {}),
      },
      deReverb: {
        ...prev.deReverb,
        ...(newOptions.deReverb || {}),
      },
      harmonicEnhancement: {
        ...prev.harmonicEnhancement,
        ...(newOptions.harmonicEnhancement || {}),
      },
    }))
  }

  // Apply preset
  const applyPreset = (preset: keyof typeof SPEECH_ENHANCER_PRESETS) => {
    updateOptions({ preset })
  }

  // Toggle master enable
  const toggleEnabled = () => {
    updateOptions({ enabled: !options.enabled })
  }

  // Render frequency response visualization
  const renderFrequencyResponse = () => {
    if (!state.frequencyResponse || !showFrequencyResponse) return null

    const width = 300
    const height = 150
    const padding = 20

    // Create SVG path
    let path = `M ${padding},${height - padding} `

    for (let i = 0; i < state.frequencyResponse.length; i++) {
      const x = padding + (i / state.frequencyResponse.length) * (width - 2 * padding)
      // Convert linear gain to dB, then scale to fit
      const gainDb = 20 * Math.log10(state.frequencyResponse[i])
      // Clamp to -12dB to +12dB range
      const clampedGainDb = Math.max(-12, Math.min(12, gainDb))
      // Map to y coordinate (invert because SVG y increases downward)
      const y = height - padding - ((clampedGainDb + 12) / 24) * (height - 2 * padding)
      path += `L ${x},${y} `
    }

    // Close the path to the bottom
    path += `L ${width - padding},${height - padding} Z`

    return (
      <div className="mt-4">
        <div className="text-xs text-muted-foreground mb-1">Frequency Response</div>
        <svg width={width} height={height} className="bg-muted/30 rounded-md">
          {/* Horizontal grid lines */}
          <line
            x1={padding}
            y1={height / 2}
            x2={width - padding}
            y2={height / 2}
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeDasharray="2,2"
          />
          <line
            x1={padding}
            y1={height / 4}
            x2={width - padding}
            y2={height / 4}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeDasharray="2,2"
          />
          <line
            x1={padding}
            y1={(3 * height) / 4}
            x2={width - padding}
            y2={(3 * height) / 4}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeDasharray="2,2"
          />

          {/* Vertical grid lines (frequency markers) */}
          <line
            x1={padding + (width - 2 * padding) / 4}
            y1={padding}
            x2={padding + (width - 2 * padding) / 4}
            y2={height - padding}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeDasharray="2,2"
          />
          <line
            x1={padding + (width - 2 * padding) / 2}
            y1={padding}
            x2={padding + (width - 2 * padding) / 2}
            y2={height - padding}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeDasharray="2,2"
          />
          <line
            x1={padding + (3 * (width - 2 * padding)) / 4}
            y1={padding}
            x2={padding + (3 * (width - 2 * padding)) / 4}
            y2={height - padding}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeDasharray="2,2"
          />

          {/* Frequency labels */}
          <text x={padding} y={height - 5} fontSize="10" textAnchor="middle" fill="currentColor" opacity="0.5">
            20Hz
          </text>
          <text
            x={padding + (width - 2 * padding) / 4}
            y={height - 5}
            fontSize="10"
            textAnchor="middle"
            fill="currentColor"
            opacity="0.5"
          >
            200Hz
          </text>
          <text
            x={padding + (width - 2 * padding) / 2}
            y={height - 5}
            fontSize="10"
            textAnchor="middle"
            fill="currentColor"
            opacity="0.5"
          >
            1kHz
          </text>
          <text
            x={padding + (3 * (width - 2 * padding)) / 4}
            y={height - 5}
            fontSize="10"
            textAnchor="middle"
            fill="currentColor"
            opacity="0.5"
          >
            5kHz
          </text>
          <text x={width - padding} y={height - 5} fontSize="10" textAnchor="middle" fill="currentColor" opacity="0.5">
            20kHz
          </text>

          {/* dB labels */}
          <text x={padding - 5} y={padding} fontSize="10" textAnchor="end" fill="currentColor" opacity="0.5">
            +12dB
          </text>
          <text x={padding - 5} y={height / 4} fontSize="10" textAnchor="end" fill="currentColor" opacity="0.5">
            +6dB
          </text>
          <text x={padding - 5} y={height / 2} fontSize="10" textAnchor="end" fill="currentColor" opacity="0.5">
            0dB
          </text>
          <text x={padding - 5} y={(3 * height) / 4} fontSize="10" textAnchor="end" fill="currentColor" opacity="0.5">
            -6dB
          </text>
          <text x={padding - 5} y={height - padding} fontSize="10" textAnchor="end" fill="currentColor" opacity="0.5">
            -12dB
          </text>

          {/* Response curve */}
          <path d={path} fill="rgba(var(--primary), 0.2)" stroke="hsl(var(--primary))" strokeWidth="2" />
        </svg>
      </div>
    )
  }

  // Render signal level meter
  const renderSignalMeter = () => {
    const width = compact ? 150 : 300
    const height = 24

    return (
      <div className="mt-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Input Level</span>
          <span>Enhancement</span>
        </div>
        <div className="flex gap-2">
          <div className="relative w-full h-6 bg-muted/30 rounded-md overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-green-500/70 transition-all duration-100"
              style={{ width: `${state.signalLevel * 100}%` }}
            />
          </div>
          <div className="relative w-full h-6 bg-muted/30 rounded-md overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-blue-500/70 transition-all duration-100"
              style={{ width: `${state.enhancementLevel * 100}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Switch id="speech-enhancer-enabled" checked={options.enabled} onCheckedChange={toggleEnabled} />
              <Label htmlFor="speech-enhancer-enabled">Speech Enhancement</Label>
            </div>
            <div className="flex gap-1">
              {["default", "clear", "bright", "warm"].map((preset) => (
                <Button
                  key={preset}
                  size="sm"
                  variant={state.activePreset === preset ? "default" : "outline"}
                  className="h-7 px-2 text-xs"
                  onClick={() => applyPreset(preset as keyof typeof SPEECH_ENHANCER_PRESETS)}
                  disabled={!options.enabled}
                >
                  {preset.charAt(0).toUpperCase() + preset.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          {renderSignalMeter()}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch id="speech-enhancer-enabled" checked={options.enabled} onCheckedChange={toggleEnabled} />
            <Label htmlFor="speech-enhancer-enabled">Speech Enhancement</Label>
          </div>
          <div className="text-sm font-normal text-muted-foreground">
            Improves speech clarity for better recognition
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderSignalMeter()}
        {renderFrequencyResponse()}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="presets" className="flex-1">
              Presets
            </TabsTrigger>
            <TabsTrigger value="frequency" className="flex-1">
              Frequency
            </TabsTrigger>
            <TabsTrigger value="clarity" className="flex-1">
              Clarity
            </TabsTrigger>
            <TabsTrigger value="dynamics" className="flex-1">
              Dynamics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="pt-4">
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(SPEECH_ENHANCER_PRESETS).map((preset) => (
                <Button
                  key={preset}
                  variant={state.activePreset === preset ? "default" : "outline"}
                  onClick={() => applyPreset(preset as keyof typeof SPEECH_ENHANCER_PRESETS)}
                  disabled={!options.enabled}
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <span className="text-lg">{preset.charAt(0).toUpperCase() + preset.slice(1)}</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {preset === "default" && "Balanced enhancement"}
                    {preset === "clear" && "Maximum clarity"}
                    {preset === "bright" && "Crisp consonants"}
                    {preset === "warm" && "Rich vocals"}
                    {preset === "custom" && "Custom settings"}
                  </span>
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="frequency" className="space-y-4 pt-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="freq-enhancement">Frequency Enhancement</Label>
                <Switch
                  id="freq-enhancement"
                  checked={options.frequencyEnhancement.enabled}
                  onCheckedChange={(checked) =>
                    updateOptions({
                      frequencyEnhancement: { ...options.frequencyEnhancement, enabled: checked },
                    })
                  }
                  disabled={!options.enabled}
                />
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Low Frequency Boost ({options.frequencyEnhancement.lowFrequency}Hz)</span>
                  </div>
                  <Slider
                    value={[options.frequencyEnhancement.lowFrequency]}
                    min={100}
                    max={500}
                    step={10}
                    onValueChange={([value]) =>
                      updateOptions({
                        frequencyEnhancement: { ...options.frequencyEnhancement, lowFrequency: value },
                      })
                    }
                    disabled={!options.enabled || !options.frequencyEnhancement.enabled}
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>High Frequency Boost ({options.frequencyEnhancement.highFrequency}Hz)</span>
                  </div>
                  <Slider
                    value={[options.frequencyEnhancement.highFrequency]}
                    min={2000}
                    max={8000}
                    step={100}
                    onValueChange={([value]) =>
                      updateOptions({
                        frequencyEnhancement: { ...options.frequencyEnhancement, highFrequency: value },
                      })
                    }
                    disabled={!options.enabled || !options.frequencyEnhancement.enabled}
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Enhancement Gain ({options.frequencyEnhancement.gain}dB)</span>
                  </div>
                  <Slider
                    value={[options.frequencyEnhancement.gain]}
                    min={0}
                    max={12}
                    step={0.5}
                    onValueChange={([value]) =>
                      updateOptions({
                        frequencyEnhancement: { ...options.frequencyEnhancement, gain: value },
                      })
                    }
                    disabled={!options.enabled || !options.frequencyEnhancement.enabled}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="clarity" className="space-y-4 pt-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="formant-enhancement">Vowel Clarity</Label>
                <Switch
                  id="formant-enhancement"
                  checked={options.formantEnhancement.enabled}
                  onCheckedChange={(checked) =>
                    updateOptions({
                      formantEnhancement: { ...options.formantEnhancement, enabled: checked },
                    })
                  }
                  disabled={!options.enabled}
                />
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Strength ({Math.round(options.formantEnhancement.strength * 100)}%)</span>
                </div>
                <Slider
                  value={[options.formantEnhancement.strength]}
                  min={0}
                  max={1}
                  step={0.05}
                  onValueChange={([value]) =>
                    updateOptions({
                      formantEnhancement: { ...options.formantEnhancement, strength: value },
                    })
                  }
                  disabled={!options.enabled || !options.formantEnhancement.enabled}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="sibilance-enhancement">Consonant Clarity</Label>
                <Switch
                  id="sibilance-enhancement"
                  checked={options.sibilanceEnhancement.enabled}
                  onCheckedChange={(checked) =>
                    updateOptions({
                      sibilanceEnhancement: { ...options.sibilanceEnhancement, enabled: checked },
                    })
                  }
                  disabled={!options.enabled}
                />
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Gain ({options.sibilanceEnhancement.gain}dB)</span>
                </div>
                <Slider
                  value={[options.sibilanceEnhancement.gain]}
                  min={0}
                  max={8}
                  step={0.5}
                  onValueChange={([value]) =>
                    updateOptions({
                      sibilanceEnhancement: { ...options.sibilanceEnhancement, gain: value },
                    })
                  }
                  disabled={!options.enabled || !options.sibilanceEnhancement.enabled}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="dynamics" className="space-y-4 pt-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="compression">Dynamic Range Compression</Label>
                <Switch
                  id="compression"
                  checked={options.compression.enabled}
                  onCheckedChange={(checked) =>
                    updateOptions({
                      compression: { ...options.compression, enabled: checked },
                    })
                  }
                  disabled={!options.enabled}
                />
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Threshold ({options.compression.threshold}dB)</span>
                  </div>
                  <Slider
                    value={[options.compression.threshold]}
                    min={-50}
                    max={-10}
                    step={1}
                    onValueChange={([value]) =>
                      updateOptions({
                        compression: { ...options.compression, threshold: value },
                      })
                    }
                    disabled={!options.enabled || !options.compression.enabled}
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Ratio ({options.compression.ratio}:1)</span>
                  </div>
                  <Slider
                    value={[options.compression.ratio]}
                    min={1}
                    max={10}
                    step={0.5}
                    onValueChange={([value]) =>
                      updateOptions({
                        compression: { ...options.compression, ratio: value },
                      })
                    }
                    disabled={!options.enabled || !options.compression.enabled}
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Makeup Gain ({options.compression.makeupGain}dB)</span>
                  </div>
                  <Slider
                    value={[options.compression.makeupGain]}
                    min={0}
                    max={12}
                    step={0.5}
                    onValueChange={([value]) =>
                      updateOptions({
                        compression: { ...options.compression, makeupGain: value },
                      })
                    }
                    disabled={!options.enabled || !options.compression.enabled}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
