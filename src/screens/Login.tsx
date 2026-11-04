import { useRef, useState } from 'react'
import { CircleAlert, Eye, EyeOff } from 'lucide-react'
import { AuthCard, AuthLayout } from '../components/layout/AuthLayout'
import { Button } from '../components/ui/Button'
import { FieldError, Input, Label } from '../components/ui/Field'
import { GoogleIcon } from '../components/ui/GoogleIcon'
import { Logo } from '../components/ui/Logo'
import { useToast } from '../components/ui/Toast'
import { useApp } from '../lib/store'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function Login() {
  const { navigate, simulateFailure } = useApp()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [touched, setTouched] = useState({ email: false, password: false })
  const [loading, setLoading] = useState<'password' | 'google' | null>(null)
  const [authError, setAuthError] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const pwRef = useRef<HTMLInputElement>(null)
  const errRef = useRef<HTMLDivElement>(null)

  const emailErr = !email.trim() ? 'Enter your email address.' : !EMAIL_RE.test(email.trim()) ? 'Enter an email in this format: name@gmail.com' : undefined
  const pwErr = !password ? 'Enter your password.' : undefined

  const submit = () => {
    setTouched({ email: true, password: true })
    if (emailErr) return emailRef.current?.focus()
    if (pwErr) return pwRef.current?.focus()
    setAuthError(false)
    setLoading('password')
    setTimeout(() => {
      setLoading(null)
      if (simulateFailure || password.toLowerCase() === 'wrong') {
        setAuthError(true)
        setTimeout(() => errRef.current?.focus(), 0)
        return
      }
      navigate({ name: 'dashboard' })
    }, 1200)
  }

  return (
    <AuthLayout>
      <AuthCard>
        <div className="flex flex-col items-center text-center">
          <Logo size="lg" />
          <h1 className="mt-6 text-2xl text-fg">Welcome back</h1>
          <p className="mt-1 text-sm text-fg-muted">Sign in to report and track illegal mining near you.</p>
        </div>

        <form
          noValidate
          className="mt-6 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          {authError && (
            <div ref={errRef} tabIndex={-1} role="alert" className="flex items-start gap-2 rounded-lg border border-high/40 bg-high-soft p-3 text-sm text-high-fg outline-none">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>Email or password is incorrect. Try again.</span>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="l-email">Email</Label>
            <Input
              ref={emailRef}
              id="l-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="name@gmail.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setAuthError(false)
              }}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              invalid={(touched.email && !!emailErr) || authError}
              aria-describedby={touched.email && emailErr ? 'l-email-err' : undefined}
            />
            <FieldError id="l-email-err">{touched.email && emailErr}</FieldError>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="l-pw">Password</Label>
              <button
                type="button"
                className="cursor-pointer rounded-sm text-sm font-medium text-brand-soft-fg underline-offset-4 hover:underline"
                onClick={() => {
                  if (emailErr) {
                    setTouched((t) => ({ ...t, email: true }))
                    emailRef.current?.focus()
                    return
                  }
                  toast({ tone: 'info', title: 'Check your inbox.', description: `If ${email.trim()} has an account, we sent a reset link to it.` })
                }}
              >
                Forgot password?
              </button>
            </div>
            <Input
              ref={pwRef}
              id="l-pw"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setAuthError(false)
              }}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              invalid={(touched.password && !!pwErr) || authError}
              aria-describedby={touched.password && pwErr ? 'l-pw-err' : undefined}
              trailing={
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  aria-pressed={show}
                  className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg"
                >
                  {show ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
                </button>
              }
            />
            <FieldError id="l-pw-err">{touched.password && pwErr}</FieldError>
          </div>
          <Button type="submit" block size="lg" loading={loading === 'password'} loadingText="Signing in" disabled={loading === 'google'} className="mt-2">
            Sign in
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-fg-muted" role="separator">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          variant="secondary"
          block
          size="lg"
          loading={loading === 'google'}
          loadingText="Connecting to Google"
          disabled={loading === 'password'}
          onClick={() => {
            setLoading('google')
            setTimeout(() => navigate({ name: 'dashboard' }), 1200)
          }}
        >
          <span className="inline-flex items-center gap-2">
            <GoogleIcon />
            Continue with Google
          </span>
        </Button>

        <p className="mt-6 text-center text-sm text-fg-muted">
          New to ResQ?{' '}
          <button type="button" onClick={() => navigate({ name: 'signup' })} className="cursor-pointer rounded-sm font-medium text-brand-soft-fg underline-offset-4 hover:underline">
            Create an account
          </button>
        </p>
      </AuthCard>
    </AuthLayout>
  )
}

