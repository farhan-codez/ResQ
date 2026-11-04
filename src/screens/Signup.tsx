import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Camera, CameraOff, Check, CircleCheck, LoaderCircle, RotateCcw, Upload, Sun, Square, Scan } from 'lucide-react'
import { AuthCard, AuthLayout } from '../components/layout/AuthLayout'
import { Button } from '../components/ui/Button'
import { FieldError, Input, Label } from '../components/ui/Field'
import { Logo } from '../components/ui/Logo'
import { cx } from '../lib/meta'
import { useApp } from '../lib/store'

const STEPS = ['Details', 'Ghana Card', 'Done'] as const

function Progress({ step }: { step: number }) {
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Sign-up progress">
      {STEPS.map((s, i) => {
        const done = i < step
        const current = i === step
        return (
          <li key={s} aria-current={current ? 'step' : undefined} className="flex flex-col gap-2">
            <span className={cx('h-1 rounded-full', done || current ? 'bg-brand' : 'bg-surface-3')} />
            <span className={cx('flex items-center gap-1 text-xs font-medium', current ? 'text-fg' : done ? 'text-brand-soft-fg' : 'text-fg-muted')}>
              {done && <Check className="size-3.5" strokeWidth={2.5} aria-hidden />}
              <span className="sr-only">{done ? 'Completed: ' : current ? 'Current step: ' : 'Next: '}</span>
              {s}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function DetailsStep({ onNext, initial }: { onNext: (v: { name: string; email: string }) => void; initial: { name: string; email: string } }) {
  const [name, setName] = useState(initial.name)
  const [email, setEmail] = useState(initial.email)
  const [touched, setTouched] = useState({ name: false, email: false })
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  const nameErr = name.trim().length === 0 ? 'Enter your full name as it appears on your Ghana Card.' : name.trim().split(/\s+/).length < 2 ? 'Add your surname too.' : undefined
  const e = email.trim().toLowerCase()
  const emailErr = !e ? 'Enter your Gmail address.' : !/^[a-z0-9.+_-]+@gmail\.com$/.test(e) ? 'Use a Gmail address, like ama.mensah@gmail.com' : undefined

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(ev) => {
        ev.preventDefault()
        setTouched({ name: true, email: true })
        if (nameErr) return nameRef.current?.focus()
        if (emailErr) return emailRef.current?.focus()
        onNext({ name: name.trim(), email: e })
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="s-name">Full name</Label>
        <Input
          ref={nameRef}
          id="s-name"
          autoComplete="name"
          value={name}
          onChange={(ev) => setName(ev.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          invalid={touched.name && !!nameErr}
          aria-describedby={touched.name && nameErr ? 's-name-err' : undefined}
        />
        <FieldError id="s-name-err">{touched.name && nameErr}</FieldError>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="s-email">Gmail address</Label>
        <Input
          ref={emailRef}
          id="s-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="name@gmail.com"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          invalid={touched.email && !!emailErr}
          aria-describedby={touched.email && emailErr ? 's-email-err' : undefined}
        />
        <FieldError id="s-email-err">{touched.email && emailErr}</FieldError>
      </div>
      <Button type="submit" size="lg" block iconRight={ArrowRight} className="mt-2">
        Continue
      </Button>
    </form>
  )
}

type CamState = 'starting' | 'live' | 'denied' | 'captured'

function CardStep({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const [state, setState] = useState<CamState>('starting')
  const [photo, setPhoto] = useState<string | null>(null)
  const [fromUpload, setFromUpload] = useState(false)
  const [saving, setSaving] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  const start = useCallback(async () => {
    setState('starting')
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported')
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
      setState('live')
    } catch {
      setState('denied')
    }
  }, [])

  useEffect(() => {
    start()
    return stop
  }, [start])

  const capture = () => {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth
    c.height = v.videoHeight
    c.getContext('2d')!.drawImage(v, 0, 0)
    setPhoto(c.toDataURL('image/jpeg', 0.9))
    setFromUpload(false)
    stop()
    setState('captured')
  }

  const retake = () => {
    setPhoto(null)
    if (fromUpload) fileRef.current?.click()
    else start()
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-medium text-fg">Photograph your Ghana Card</h2>
        <p className="mt-0.5 text-sm text-fg-muted">We use it once to confirm who you are. It is never shown to other users.</p>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#0b100d]" aria-live="polite">
        {(state === 'live' || state === 'starting') && <video ref={videoRef} className="absolute inset-0 size-full object-cover" muted playsInline aria-label="Camera preview" />}
        {state === 'captured' && photo && <img src={photo} alt="Captured Ghana Card" className="absolute inset-0 size-full object-cover" />}

        {(state === 'live' || state === 'starting') && (
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <div className="relative aspect-[1.586] w-[78%] rounded-[10px] shadow-[0_0_0_9999px_rgb(0_0_0/0.5)]">
              {['top-0 left-0 border-t-2 border-l-2 rounded-tl-[10px]', 'top-0 right-0 border-t-2 border-r-2 rounded-tr-[10px]', 'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-[10px]', 'bottom-0 right-0 border-b-2 border-r-2 rounded-br-[10px]'].map((c) => (
                <span key={c} className={cx('absolute size-6 border-white', c)} />
              ))}
              <span className="absolute inset-0 rounded-[10px] border border-dashed border-white/40" />
              <span className="absolute inset-x-0 -bottom-7 text-center text-xs font-medium text-white/90">Fit the card inside the frame</span>
            </div>
          </div>
        )}
        {state === 'starting' && (
          <div className="absolute inset-x-0 top-3 flex justify-center">
            <span className="flex items-center gap-2 rounded-md bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> Starting camera
            </span>
          </div>
        )}
        {state === 'denied' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
            <span className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white">
              <CameraOff className="size-5" aria-hidden />
            </span>
            <p className="max-w-64 text-sm text-white">Camera is off. Allow camera access in your browser, or upload a photo instead.</p>
          </div>
        )}
        {state === 'captured' && (
          <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
            <Check className="size-3.5" aria-hidden /> Photo ready to check
          </span>
        )}
      </div>

      {state !== 'captured' && (
        <ul className="grid grid-cols-3 gap-2 text-xs text-fg-muted" aria-label="Photo tips">
          {[
            { icon: Sun, t: 'Good light' },
            { icon: Square, t: 'Card flat' },
            { icon: Scan, t: 'All four corners visible' },
          ].map(({ icon: I, t }) => (
            <li key={t} className="flex flex-col items-center gap-1 rounded-lg border border-border px-2 py-2 text-center">
              <I className="size-5 text-brand-soft-fg" aria-hidden />
              {t}.
            </li>
          ))}
        </ul>
      )}
      {state === 'captured' && <p className="text-sm text-fg-muted">Check that the text is sharp and nothing is covered by glare.</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (!f) return
          stop()
          setPhoto(URL.createObjectURL(f))
          setFromUpload(true)
          setState('captured')
          e.target.value = ''
        }}
      />

      <div className="flex flex-col gap-2">
        {state === 'captured' ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="lg" icon={RotateCcw} onClick={retake}>
              Retake
            </Button>
            <Button
              size="lg"
              icon={Check}
              loading={saving}
              loadingText="Uploading"
              onClick={() => {
                setSaving(true)
                setTimeout(onNext, 1100)
              }}
            >
              Use this photo
            </Button>
          </div>
        ) : state === 'denied' ? (
          <>
            <Button size="lg" icon={Upload} block onClick={() => fileRef.current?.click()}>
              Upload photo
            </Button>
            <Button variant="secondary" size="lg" icon={Camera} block onClick={start}>
              Try camera again
            </Button>
          </>
        ) : (
          <>
            <Button size="lg" icon={Camera} block onClick={capture} loading={state === 'starting'} loadingText="Starting camera">
              Take photo
            </Button>
            <Button variant="ghost" icon={Upload} block onClick={() => fileRef.current?.click()}>
              Upload a photo instead
            </Button>
          </>
        )}
        <Button variant="ghost" icon={ArrowLeft} block onClick={onBack} className="text-fg-muted">
          Go back to details
        </Button>
      </div>
    </div>
  )
}

function DoneStep({ email }: { email: string }) {
  const { navigate } = useApp()
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => ref.current?.focus(), [])
  return (
    <div className="flex flex-col items-center text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-resolved-soft text-resolved-fg">
        <CircleCheck className="size-7" strokeWidth={2} aria-hidden />
      </span>
      <h2 ref={ref} tabIndex={-1} className="mt-4 text-2xl text-fg outline-none">
        Account created
      </h2>
      <p className="mt-2 text-sm text-fg-muted">You can start reporting now.</p>
      <div className="mt-5 flex w-full items-start gap-3 rounded-lg border border-border bg-surface-2 p-4 text-left">
        <LoaderCircle className="mt-0.5 size-5 shrink-0 animate-spin text-investigating-fg motion-reduce:animate-none" aria-hidden />
        <div>
          <p className="text-sm font-medium text-fg">We're verifying your Ghana Card</p>
          <p className="mt-0.5 text-sm text-fg-muted">This usually takes less than 24 hours. We'll email {email || 'you'} when it's done.</p>
        </div>
      </div>
      <Button size="lg" block iconRight={ArrowRight} className="mt-6" onClick={() => navigate({ name: 'dashboard' })}>
        Go to dashboard
      </Button>
    </div>
  )
}

export function Signup() {
  const { navigate } = useApp()
  const [step, setStep] = useState(0)
  const [details, setDetails] = useState({ name: '', email: '' })
  return (
    <AuthLayout>
      <AuthCard>
        <div className="flex items-center justify-between">
          <Logo />
          <span className="text-xs text-fg-muted">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
        <div className="mt-6">
          <Progress step={step} />
        </div>
        {step === 0 && (
          <div className="mt-6">
            <h1 className="text-2xl text-fg">Create your account</h1>
            <p className="mt-1 mb-6 text-sm text-fg-muted">Verified reports reach regulators faster.</p>
            <DetailsStep
              initial={details}
              onNext={(v) => {
                setDetails(v)
                setStep(1)
              }}
            />
          </div>
        )}
        {step === 1 && (
          <div className="mt-6">
            <CardStep onBack={() => setStep(0)} onNext={() => setStep(2)} />
          </div>
        )}
        {step === 2 && (
          <div className="mt-8">
            <DoneStep email={details.email} />
          </div>
        )}
        {step < 2 && (
          <p className="mt-6 text-center text-sm text-fg-muted">
            Already have an account?{' '}
            <button type="button" onClick={() => navigate({ name: 'login' })} className="cursor-pointer rounded-sm font-medium text-brand-soft-fg underline-offset-4 hover:underline">
              Sign in
            </button>
          </p>
        )}
      </AuthCard>
    </AuthLayout>
  )
}

