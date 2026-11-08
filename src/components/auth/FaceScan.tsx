import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2, AlertCircle, CheckCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cx } from '@/lib/meta'
import { useToast } from '@/components/ui/Toast'

// Face-api.js types (loaded from CDN)
interface FaceDetection {
  detection: { _box: { x: number; y: number; width: number; height: number } }
  landmarks: { positions: number[][] }
  descriptor: Float32Array
}

interface FaceAPI {
  nets: {
    tinyFaceDetector: { loadFromUri: (uri: string) => Promise<void> }
    faceLandmark68Net: { loadFromUri: (uri: string) => Promise<void> }
    faceRecognitionNet: { loadFromUri: (uri: string) => Promise<void> }
  }
  TinyFaceDetectorOptions: new () => { inputSize?: number; scoreThreshold?: number }
  detectSingleFace: (video: HTMLVideoElement, options: any) => {
    withFaceLandmarks: () => { withFaceDescriptor: () => Promise<FaceDetection | undefined> }
  }
}

declare global {
  interface Window {
    faceapi?: FaceAPI
  }
}

/**
 * Face scan component using face-api.js (loaded from CDN).
 * Captures a face descriptor for guest identification.
 * 
 * TODO: Replace with actual face-api.js integration when available.
 * For now this is a scaffold with the UI flow.
 */
export function FaceScan({ onComplete, onCancel }: { onComplete: (descriptor: number[]) => void; onCancel: () => void }) {
  const toast = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'scanning' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [progress, setProgress] = useState(0)
  const scanIntervalRef = useRef<number | null>(null)
  const modelsLoadedRef = useRef(false)

  // Load face-api.js models from CDN
  useEffect(() => {
    const loadModels = async () => {
      try {
        if (typeof window !== 'undefined' && window.faceapi) {
          await window.faceapi.nets.tinyFaceDetector.loadFromUri('/models')
          await window.faceapi.nets.faceLandmark68Net.loadFromUri('/models')
          await window.faceapi.nets.faceRecognitionNet.loadFromUri('/models')
          modelsLoadedRef.current = true
          setState('ready')
        } else {
          // Fallback: inject script if not present
          await injectFaceApiScript()
          if (window.faceapi) {
            await window.faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/')
            await window.faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/')
            await window.faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/')
            modelsLoadedRef.current = true
            setState('ready')
          }
        }
      } catch (e) {
        setState('error')
        setErrorMsg('Failed to load face detection models. Check connection.')
      }
    }
    loadModels()
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    }
  }, [])

  function injectFaceApiScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.getElementById('face-api-script')) {
        resolve()
        return
      }
      const script = document.createElement('script')
      script.id = 'face-api-script'
      script.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.min.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load face-api.js'))
      document.head.appendChild(script)
    })
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setState('scanning')
      startScanLoop()
    } catch {
      setState('error')
      setErrorMsg('Camera access denied. Please allow camera permission.')
    }
  }

  const startScanLoop = () => {
    if (!videoRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    let attempts = 0
    const maxAttempts = 30 // ~10 seconds at 300ms intervals

    scanIntervalRef.current = window.setInterval(async () => {
      if (state !== 'scanning') return

      attempts++
      setProgress(Math.min(100, (attempts / maxAttempts) * 100))

      const detection = await window.faceapi?.detectSingleFace(videoRef.current as HTMLVideoElement, new window.faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (detection && detection.descriptor) {
        const descriptor = Array.from(detection.descriptor) as number[]
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
        stopCamera()
        setState('success')
        setTimeout(() => onComplete(descriptor), 800)
        return
      }

      if (attempts >= maxAttempts) {
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
        stopCamera()
        setState('error')
        setErrorMsg('No face detected. Ensure good lighting and try again.')
      }
    }, 300)
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((t) => t.stop())
      videoRef.current.srcObject = null
    }
  }

  const retry = () => {
    setErrorMsg('')
    setProgress(0)
    startCamera()
  }

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4 p-8" role="status" aria-label="Loading face detection models">
        <Loader2 className="size-10 animate-spin text-brand" aria-hidden />
        <p className="text-sm text-fg-muted">Loading face detection&hellip;</p>
      </div>
    )
  }

  if (state === 'ready') {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <Camera className="size-14 text-brand-soft-fg" aria-hidden />
        <h3 className="text-lg font-semibold text-fg">Face Scan for Guest Access</h3>
        <p className="text-sm text-fg-muted max-w-xs">
          We'll scan your face to create a secure guest profile. No photos are stored — only a mathematical descriptor.
        </p>
        <Button variant="primary" icon={Camera} onClick={startCamera} className="w-full max-w-xs">
          Start Face Scan
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} className="mt-2">
          Cancel
        </Button>
      </div>
    )
  }

  if (state === 'scanning') {
    return (
      <div className="flex flex-col items-center gap-4 p-4">
        <div className="relative size-64 overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} className="size-full object-cover" autoPlay playsInline muted aria-hidden />
          <canvas ref={canvasRef} className="absolute inset-0" aria-hidden />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg className="size-40 text-white/50" viewBox="0 0 100 100" aria-hidden>
              <ellipse cx="50" cy="50" rx="35" ry="42" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="100, 100" />
            </svg>
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/90 text-sm">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            <span>Scanning&hellip; {progress}%</span>
          </div>
        </div>
        <p className="text-xs text-fg-muted text-center px-4">
          Position your face in the oval. Ensure good lighting.
        </p>
        <Button variant="ghost" size="sm" onClick={() => { if (scanIntervalRef.current) clearInterval(scanIntervalRef.current); stopCamera(); setState('ready') }}>
          Cancel
        </Button>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <CheckCircle className="size-14 text-resolved-fg" aria-hidden />
        <h3 className="text-lg font-semibold text-fg">Face Scan Complete</h3>
        <p className="text-sm text-fg-muted">Your guest profile is ready. Redirecting&hellip;</p>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <AlertCircle className="size-14 text-alert-fg" aria-hidden />
        <h3 className="text-lg font-semibold text-fg">Scan Failed</h3>
        <p className="text-sm text-fg-muted text-center max-w-xs">{errorMsg}</p>
        <div className="flex gap-2">
          <Button variant="primary" icon={Camera} onClick={retry}>
            Try Again
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return null
}