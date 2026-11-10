import { useRef, useState } from 'react'
import { CircleAlert, Eye, EyeOff, User, Upload, Loader2 } from 'lucide-react'
import { AuthCard, AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { FieldError, Input, Label } from '@/components/ui/Field'
import { Logo } from '@/components/ui/Logo'
import { useToast } from '@/components/ui/Toast'
import { useApp } from '@/lib/store'
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient'
import { uploadGhanaCard } from '@/lib/api'
import { cx } from '@/lib/meta'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function GuestUpgrade() {
  const { navigate, upgradeGuest, role } = useApp()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [ghanaCardFile, setGhanaCardFile] = useState<File | null>(null)
  const [show, setShow] = useState(false)
  const [touched, setTouched] = useState({ email: false, password: false, fullName: false, phone: false, ghanaCard: false })
  const [loading, setLoading] = useState<'password' | 'google' | 'ghanaCard' | null>(null)
  const [authError, setAuthError] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const pwRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const errRef = useRef<HTMLDivElement>(null)

  const emailErr = !email.trim() ? 'Enter your email address.' : !EMAIL_RE.test(email.trim()) ? 'Enter an email in this format: name@gmail.com' : undefined
  const pwErr = !password ? 'Enter your password.' : password.length < 8 ? 'Use at least 8 characters.' : undefined
  const nameErr = !fullName.trim() ? 'Enter your full name.' : undefined
  const phoneErr = !phone.trim() ? 'Enter your phone number.' : undefined
  const ghanaCardErr = !ghanaCardFile ? 'Upload your Ghana Card.' : undefined

  const isGuest = role === 'guest'

  const submit = () => {
    setTouched({ email: true, password: true, fullName: true, phone: true, ghanaCard: true })
    if (emailErr) return emailRef.current?.focus()
    if (pwErr) return pwRef.current?.focus()
    if (nameErr) return nameRef.current?.focus()
    if (phoneErr) return phoneRef.current?.focus()
    if (ghanaCardErr) return errRef.current?.focus()
    setAuthError(false)
    setLoading('password')
    const fail = () => {
      setLoading(null)
      setAuthError(true)
      setTimeout(() => errRef.current?.focus(), 0)
    }
    if (isSupabaseConfigured) {
      supabase.auth
        .signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim(), phone: phone.trim() } } })
        .then(async ({ data, error }) => {
          if (error) return fail()
          if (!data.user) return fail()
          // Upload Ghana Card
          if (ghanaCardFile) {
            setLoading('ghanaCard')
            try {
              await uploadGhanaCard(ghanaCardFile, data.user.id)
            } catch {
              setLoading(null)
              toast({ tone: 'error', title: 'Failed to upload Ghana Card', description: 'Please try again.' })
              return
            }
          }
          // Upgrade guest to citizen
          try {
            await upgradeGuest(data.user.id)
          } catch {
            // If upgrade fails, the user is still created as a citizen
            // The guest profile just won't be linked
          }
          setLoading(null)
          toast({ tone: 'success', title: 'Account upgraded!', description: 'You are now a full citizen.' })
          navigate({ name: 'dashboard' })
        })
        .catch(fail)
      return
    }
    // Demo mode
    setTimeout(() => {
      setLoading(null)
      navigate({ name: 'dashboard' })
    }, 1200)
  }

  return (
    <AuthLayout>
      <AuthCard>
        <div className="flex flex-col items-center text-center">
          <Logo size="lg" />
          <h1 className="mt-6 text-2xl text-fg">Upgrade to Citizen Account</h1>
          <p className="mt-1 text-sm text-fg-muted">Add your Ghana Card to unlock full features and keep your report history.</p>
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
              <span>Please fix the errors above.</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="u-email">Email</Label>
            <Input
              ref={emailRef}
              id="u-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="name@gmail.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setAuthError(false) }}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              invalid={touched.email && !!emailErr}
              aria-describedby={touched.email && emailErr ? 'u-email-err' : undefined}
            />
            <FieldError id="u-email-err">{touched.email && emailErr}</FieldError>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="u-name">Full Name</Label>
            <Input
              ref={nameRef}
              id="u-name"
              autoComplete="name"
              placeholder="Kwame Asante"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setAuthError(false) }}
              onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
              invalid={touched.fullName && !!nameErr}
              aria-describedby={touched.fullName && nameErr ? 'u-name-err' : undefined}
            />
            <FieldError id="u-name-err">{touched.fullName && nameErr}</FieldError>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="u-phone">Phone Number</Label>
            <Input
              ref={phoneRef}
              id="u-phone"
              type="tel"
              autoComplete="tel"
              placeholder="+233 24 123 4567"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setAuthError(false) }}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              invalid={touched.phone && !!phoneErr}
              aria-describedby={touched.phone && phoneErr ? 'u-phone-err' : undefined}
            />
            <FieldError id="u-phone-err">{touched.phone && phoneErr}</FieldError>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="u-pw">Password</Label>
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
              id="u-pw"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setAuthError(false) }}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              invalid={(touched.password && !!pwErr) || authError}
              aria-describedby={touched.password && pwErr ? 'u-pw-err' : undefined}
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
            <FieldError id="u-pw-err">{touched.password && pwErr}</FieldError>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="u-ghana-card">Ghana Card</Label>
            <input
              type="file"
              id="u-ghana-card"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setGhanaCardFile(file)
                setTouched((t) => ({ ...t, ghanaCard: true }))
                setAuthError(false)
              }}
            />
            <button
              type="button"
              onClick={() => document.getElementById('u-ghana-card')?.click()}
              className={cx(
                'flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong text-sm font-medium text-fg-muted hover:border-fg-subtle hover:bg-surface-2 hover:text-fg',
                ghanaCardFile ? 'h-20' : 'h-20 w-full',
              )}
            >
              <Upload className="size-5" aria-hidden />
              {ghanaCardFile ? ghanaCardFile.name : 'Upload Ghana Card (front)'}
            </button>
            {touched.ghanaCard && ghanaCardErr && (
              <FieldError id="u-ghana-card-err">{ghanaCardErr}</FieldError>
            )}
          </div>

          <Button type="submit" block size="lg" loading={loading !== null} loadingText={loading === 'ghanaCard' ? 'Uploading Ghana Card...' : 'Creating account'} disabled={loading !== null} className="mt-2">
            Upgrade to Citizen
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-fg-muted">
          Already have an account?{' '}
          <button type="button" onClick={() => navigate({ name: 'login' })} className="cursor-pointer rounded-sm font-medium text-brand-soft-fg underline-offset-4 hover:underline">
            Sign in
          </button>
        </p>
      </AuthCard>
    </AuthLayout>
  )
}