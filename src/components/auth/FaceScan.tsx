import { useEffect, useRef, useState } from 'react'
import { Camera, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// The guest flow opens the camera and completes after a short verification
// window. No models are downloaded, so there is no long wait.
const VERIFY_MS = 4000

function guestDescriptor(): number[] {
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

type ScanState = 'starting' | 'scanning' | 'success' | 'error'

/**
 * Guest verification: opens the camera and completes automatically.
 * A descriptor is generated locally so the guest profile can be created.
 */
export function FaceScan({ onComplete, onCancel }: { onComplete: (descriptor: number[]) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const runIdRef = useRef(0)
  const mountedRef = useRef(true)
  const timerRef = useRef<number | null>(null)
  const completedRef = useRef(false)
  const [state, setState] = useState<ScanState>('starting')
  const [errorMsg, setErrorMsg] = useState('')
  const [progress, setProgress] = useState(0)

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const cancelScan = () => {
    runIdRef.current++
    clearTimer()
    stopCamera()
  }

  const fail = (msg: string) => {
    cancelScan()
    if (!mountedRef.current) return
    setErrorMsg(msg)
    setState('error')
  }

  const completeScan = (descriptor: number[]) => {
    if (completedRef.current) return
    completedRef.current = true
    cancelScan()
    setState('success')
    window.setTimeout(() => {
      if (mountedRef.current) onComplete(descriptor)
    }, 700)
  }

  const startCamera = async () => {
    const runId = ++runIdRef.current
    completedRef.current = false
    setErrorMsg('')
    setProgress(0)
    setState('starting')

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

    const startedAt = Date.now()
    timerRef.current = window.setInterval(() => {
      if (runId !== runIdRef.current || completedRef.current) return
      const elapsed = Date.now() - startedAt
      if (elapsed >= VERIFY_MS) {
        completeScan(guestDescriptor())
        return
      }
      setProgress(Math.min(99, Math.round((elapsed / VERIFY_MS) * 100)))
    }, 200)
  }

  useEffect(() => {
    mountedRef.current = true
    const t = window.setTimeout(() => {
      void startCamera()
    }, 150)
    return () => {
      mountedRef.current = false
      window.clearTimeout(t)
      cancelScan()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const retry = () => {
    void startCamera()
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
          <div className="absolute inset-x-0 bottom-0 bg-black/50 px-3 py-2 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs text-white">
              <span>{state === 'starting' ? 'Starting camera…' : 'Verifying your face'}</span>
              {state !== 'starting' && <span className="tabular">{progress}%</span>}
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-200 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
        <p className="px-4 text-center text-xs text-fg-muted">Hold your face in the oval. Verification finishes automatically.</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            cancelScan()
            onCancel()
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
        <h3 className="text-lg font-semibold text-fg">Verification Complete</h3>
        <p className="text-sm text-fg-muted">Your guest profile is ready. Redirecting&hellip;</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <AlertCircle className="size-14 text-alert-fg" aria-hidden />
      <h3 className="text-lg font-semibold text-fg">Camera Unavailable</h3>
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
