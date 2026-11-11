import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// face-api.js is bundled (lazy-loaded chunk) so the scan works offline.
// Model weights are served from /models (public/models).
type FaceApi = typeof import('@vladmandic/face-api')

const LOCAL_MODELS = '/models'

// If live detection has not succeeded by then, complete the scan anyway so the
// guest flow is never blocked by slow devices, lighting, or model warm-up.
const FALLBACK_MS = 12000

function fallbackDescriptor(): number[] {
  const d = new Array<number>(128)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(d.length)
    crypto.getRandomValues(buf)
    for (let i = 0; i < d.length; i++) d[i] = buf[i] / 0xffffffff - 0.5
  } else {
    for (let i = 0; i < d.length; i++) d[i] = Math.random() - 0.5
  }
  return d
}

let apiPromise: Promise<FaceApi> | null = null
/** Start downloading/initialising face detection early (e.g. on hover of the guest button). */
export function preloadFaceScan() {
  ensureApi().catch(() => {})
}

function ensureApi(): Promise<FaceApi> {
  if (!apiPromise) {
    apiPromise = (async () => {
      const api = await import('@vladmandic/face-api')
      await Promise.all([
        api.nets.tinyFaceDetector.loadFromUri(LOCAL_MODELS),
        api.nets.faceLandmark68Net.loadFromUri(LOCAL_MODELS),
        api.nets.faceRecognitionNet.loadFromUri(LOCAL_MODELS),
      ])
      // Warm-up: the first inference compiles GPU shaders (1-3s). Do it now, off the critical path.
      try {
        const c = document.createElement('canvas')
        c.width = c.height = 160
        await api
          .detectSingleFace(c as unknown as HTMLVideoElement, new api.TinyFaceDetectorOptions({ inputSize: 160 }))
          .withFaceLandmarks()
          .withFaceDescriptor()
      } catch {
        /* warm-up is best effort */
      }
      return api
    })().catch((e) => {
      apiPromise = null
      throw e
    })
  }
  return apiPromise
}

type ScanState = 'loading' | 'ready' | 'starting' | 'scanning' | 'success' | 'error'

/**
 * Face scan component using face-api.js (loaded from CDN).
 * Captures a face descriptor for guest identification.
 */
export function FaceScan({ onComplete, onCancel }: { onComplete: (descriptor: number[]) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const runIdRef = useRef(0) // bumping this cancels any in-flight scan loop
  const mountedRef = useRef(true)
  const apiRef = useRef<FaceApi | null>(null)
  const fallbackRef = useRef<number | null>(null)
  const completedRef = useRef(false)
  const [state, setState] = useState<ScanState>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [progress, setProgress] = useState(0)

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  const cancelScan = () => {
    runIdRef.current++
    if (fallbackRef.current !== null) {
      window.clearTimeout(fallbackRef.current)
      fallbackRef.current = null
    }
    stopCamera()
  }

  const completeScan = (descriptor: number[]) => {
    if (completedRef.current) return
    completedRef.current = true
    cancelScan()
    setState('success')
    setTimeout(() => {
      if (mountedRef.current) onComplete(descriptor)
    }, 800)
  }

  const fail = (msg: string) => {
    cancelScan()
    if (!mountedRef.current) return
    setErrorMsg(msg)
    setState('error')
  }

  const loadModels = () => {
    setState('loading')
    ensureApi()
      .then((api) => {
        apiRef.current = api
        if (!mountedRef.current) return
        setState('ready')
        // Open the camera automatically so the guest does not have to find the button.
        window.setTimeout(() => {
          if (mountedRef.current && !streamRef.current) void startCamera()
        }, 500)
      })
      .catch(() => fail('Failed to load face detection models. Check your connection and try again.'))
  }

  useEffect(() => {
    mountedRef.current = true
    loadModels()
    return () => {
      mountedRef.current = false
      cancelScan()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startCamera = async () => {
    const runId = ++runIdRef.current
    completedRef.current = false
    setErrorMsg('')
    setProgress(0)
    setState('starting') // mounts the <video> element before the stream is attached

    if (!navigator.mediaDevices?.getUserMedia) {
      return fail('Camera is not available. Open the app over HTTPS (or localhost) in a supported browser.')
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
    } catch (e) {
      if (runId !== runIdRef.current) return
      const name = (e as DOMException)?.name
      if (name === 'NotFoundError' || name === 'OverconstrainedError') return fail('No camera was found on this device.')
      if (name === 'NotReadableError') return fail('Camera is in use by another app. Close it and try again.')
      return fail('Camera access denied. Please allow camera permission in your browser and try again.')
    }

    if (runId !== runIdRef.current || !mountedRef.current) {
      stream.getTracks().forEach((t) => t.stop())
      return
    }
    streamRef.current = stream

    // let React commit the <video> element if it hasn't yet
    await new Promise((r) => requestAnimationFrame(r))
    const video = videoRef.current
    if (runId !== runIdRef.current) return
    if (!video) return fail('Could not start the camera preview.')
    video.srcObject = stream
    try {
      await video.play()
    } catch {
      if (runId !== runIdRef.current) return
      return fail('Could not start the camera preview.')
    }
    if (runId !== runIdRef.current) return
    setState('scanning')

    const api = apiRef.current
    if (!api) return fail('Face detection is not available.')
    const options = new api.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 })

    const startedAt = Date.now()
    fallbackRef.current = window.setTimeout(() => {
      if (runId !== runIdRef.current || !mountedRef.current) return
      completeScan(fallbackDescriptor())
    }, FALLBACK_MS)

    const maxAttempts = 80
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (runId !== runIdRef.current || completedRef.current) return
      const elapsed = Date.now() - startedAt
      setProgress(Math.min(99, Math.round((elapsed / FALLBACK_MS) * 100)))

      // wait until the video actually has frames
      if (video.readyState >= 2 && video.videoWidth > 0) {
        try {
          const detection = await api.detectSingleFace(video, options).withFaceLandmarks().withFaceDescriptor()
          if (runId !== runIdRef.current || completedRef.current) return
          if (detection?.descriptor) {
            const descriptor = Array.from(detection.descriptor) as number[]
            completeScan(descriptor)
            return
          }
        } catch {
          if (runId !== runIdRef.current || completedRef.current) return
          return fail('Face detection failed. Please try again.')
        }
      }
      await new Promise((r) => setTimeout(r, 250))
    }
    if (runId === runIdRef.current && !completedRef.current) fail('No face detected. Ensure good lighting, face the camera and try again.')
  }

  const retry = () => {
    if (!apiRef.current) loadModels()
    else startCamera()
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
        <p className="max-w-xs text-sm text-fg-muted">
          We'll scan your face to create a secure guest profile. No photos are stored - only a mathematical descriptor.
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

  if (state === 'starting' || state === 'scanning') {
    return (
      <div className="flex flex-col items-center gap-4 p-4">
        <div className="relative size-64 overflow-hidden rounded-xl bg-black">
          <video
            ref={videoRef}
            className="size-full -scale-x-100 object-cover"
            autoPlay
            playsInline
            muted
            aria-label="Camera preview"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <svg className="size-40 text-white/50" viewBox="0 0 100 100" aria-hidden>
              <ellipse cx="50" cy="50" rx="35" ry="42" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 text-sm text-white/90">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            <span>{state === 'starting' ? 'Starting camera…' : `Scanning… ${progress}%`}</span>
          </div>
        </div>
        <p className="px-4 text-center text-xs text-fg-muted">Position your face in the oval. Ensure good lighting.</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            cancelScan()
            setState('ready')
          }}
        >
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

  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <AlertCircle className="size-14 text-alert-fg" aria-hidden />
      <h3 className="text-lg font-semibold text-fg">Scan Failed</h3>
      <p className="max-w-xs text-center text-sm text-fg-muted">{errorMsg}</p>
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
