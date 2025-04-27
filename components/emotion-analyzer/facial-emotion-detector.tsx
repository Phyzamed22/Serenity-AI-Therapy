"use client"

import { useState, useEffect, useRef } from "react"
import * as faceapi from "face-api.js"
import { Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface FacialEmotionDetectorProps {
  isActive: boolean
  onEmotionDetected: (emotion: string, confidence: number, emotionValues: Record<string, number>) => void
}

export default function FacialEmotionDetector({ isActive, onEmotionDetected }: FacialEmotionDetectorProps) {
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [emotionData, setEmotionData] = useState<Record<string, number>>({
    happy: 0,
    sad: 0,
    angry: 0,
    fearful: 0,
    disgusted: 0,
    surprised: 0,
    neutral: 0,
  })
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsInitializing(true)

        // Load models from public directory
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models")
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models")
        await faceapi.nets.faceRecognitionNet.loadFromUri("/models")
        await faceapi.nets.faceExpressionNet.loadFromUri("/models")

        setIsModelLoaded(true)
        setIsInitializing(false)
      } catch (error) {
        console.error("Error loading face-api models:", error)
        setIsInitializing(false)
      }
    }

    loadModels()

    // Cleanup
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }
    }
  }, [])

  // Handle webcam activation/deactivation
  useEffect(() => {
    if (isActive && isModelLoaded) {
      startWebcam()
    } else {
      stopWebcam()
    }

    return () => {
      stopWebcam()
    }
  }, [isActive, isModelLoaded])

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        startFaceDetection()
      }
    } catch (err) {
      console.error("Error accessing webcam:", err)
    }
  }

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
  }

  const startFaceDetection = () => {
    if (!videoRef.current || !canvasRef.current) return

    // Run detection every 200ms
    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return
      if (videoRef.current.readyState !== 4) return

      // Get video dimensions
      const videoWidth = videoRef.current.videoWidth
      const videoHeight = videoRef.current.videoHeight

      // Set canvas dimensions to match video
      canvasRef.current.width = videoWidth
      canvasRef.current.height = videoHeight

      // Detect faces and expressions
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions()

      // Draw results on canvas
      const ctx = canvasRef.current.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, videoWidth, videoHeight)

        // Draw detection results
        faceapi.draw.drawDetections(canvasRef.current, detections)
        faceapi.draw.drawFaceLandmarks(canvasRef.current, detections)

        // Process emotion data if faces detected
        if (detections.length > 0) {
          // Get expressions from the first face
          const expressions = detections[0].expressions

          // Update emotion data
          const newEmotionData = {
            happy: expressions.happy,
            sad: expressions.sad,
            angry: expressions.angry,
            fearful: expressions.fearful,
            disgusted: expressions.disgusted,
            surprised: expressions.surprised,
            neutral: expressions.neutral,
          }

          setEmotionData(newEmotionData)

          // Find the dominant emotion
          let maxEmotion = "neutral"
          let maxValue = 0

          for (const [emotion, value] of Object.entries(newEmotionData)) {
            if (value > maxValue) {
              maxValue = value
              maxEmotion = emotion
            }
          }

          // Map to our simplified emotion set
          const mappedEmotion = mapToSimplifiedEmotion(maxEmotion)

          // Notify parent component
          onEmotionDetected(mappedEmotion, maxValue, newEmotionData)
        }
      }
    }, 200)
  }

  // Map face-api emotions to our simplified set
  const mapToSimplifiedEmotion = (emotion: string): string => {
    switch (emotion) {
      case "happy":
        return "happy"
      case "sad":
        return "sad"
      case "angry":
        return "angry"
      case "fearful":
        return "anxious"
      case "disgusted":
      case "surprised":
        return "surprised"
      case "neutral":
      default:
        return "neutral"
    }
  }

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-12 w-12 text-primary mb-4 animate-spin" />
        <h3 className="text-lg font-medium">Loading emotion detection models...</h3>
        <p className="text-sm text-muted-foreground mt-2">This may take a moment depending on your connection.</p>
      </div>
    )
  }

  if (!isActive) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <span className="text-2xl">😊</span>
        </div>
        <h3 className="text-lg font-medium">Camera is turned off</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Enable the camera to analyze your emotional state in real-time.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative webcam-container rounded-lg overflow-hidden border">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-auto"
          onPlay={() => {
            // Ensure canvas is properly sized when video starts playing
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth
              canvasRef.current.height = videoRef.current.videoHeight
            }
          }}
        />
        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-medium">Emotion Analysis</h3>

        {Object.entries(emotionData).map(([emotion, value]) => (
          <div key={emotion} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="capitalize">{emotion}</span>
              <span>{Math.round(value * 100)}%</span>
            </div>
            <Progress value={value * 100} className="h-2" />
          </div>
        ))}
      </div>
    </div>
  )
}
