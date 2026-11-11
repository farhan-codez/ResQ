import { useState } from 'react'
import { User, Shield, AlertCircle, Loader2 } from 'lucide-react'
import { AuthCard, AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { useToast } from '@/components/ui/Toast'
import { useApp } from '@/lib/store'
import { FaceScan } from '@/components/auth/FaceScan'
import { createGuest, guestIdFromDescriptor } from '@/lib/api'

export function GuestAuth() {
  const { navigate, setRole } = useApp()
  const toast = useToast()
  const [step, setStep] = useState<'intro' | 'scan' | 'creating' | 'done'>('intro')
  const [guestId, setGuestId] = useState('')

  const handleScanComplete = async (descriptor: number[]) => {
    setStep('creating')
    const id = guestIdFromDescriptor(descriptor)
    setGuestId(id)

    try {
      await createGuest(descriptor)
      // Persist the guest profile locally so the session survives a reload.
      localStorage.setItem(`resq.guest.${id}`, JSON.stringify({ faceDescriptor: descriptor, createdAt: Date.now() }))
      localStorage.setItem('resq.guest.current', id)
      setRole('guest')
    } catch (e) {
      console.error('Failed to create guest profile', e)
      toast({ tone: 'error', title: 'Failed to create guest profile', description: 'Please try again.' })
      setStep('intro')
      return
    }

    setStep('done')
    toast({ tone: 'success', title: 'Guest profile created', description: `Your ID: ${id}` })

    setTimeout(() => {
      navigate({ name: 'dashboard' })
    }, 1500)
  }

  const handleCancel = () => {
    if (step === 'scan') setStep('intro')
    else navigate({ name: 'login' })
  }

  return (
    <AuthLayout>
      <AuthCard>
        {step === 'intro' && (
          <div className="flex flex-col items-center text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-brand-soft text-brand-soft-fg">
              <User className="size-8" aria-hidden />
            </div>
            <h1 className="mt-6 text-2xl text-fg">Continue as Guest</h1>
            <p className="mt-2 text-sm text-fg-muted max-w-xs">
              No Ghana Card? No problem. We'll create a secure guest profile using a quick face scan.
            </p>

            <div className="mt-6 space-y-3 text-left text-sm">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-2">
                <Shield className="mt-0.5 size-5 text-brand-soft-fg shrink-0" aria-hidden />
                <div>
                  <p className="font-medium text-fg">Privacy first</p>
                  <p className="text-xs text-fg-muted">Only a mathematical face descriptor is stored - no photos, no biometric images.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-2">
                <User className="mt-0.5 size-5 text-brand-soft-fg shrink-0" aria-hidden />
                <div>
                  <p className="font-medium text-fg">No pranks</p>
                  <p className="text-xs text-fg-muted">Every report is tied to your face descriptor. Anonymous abuse is prevented.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-2">
                <AlertCircle className="mt-0.5 size-5 text-brand-soft-fg shrink-0" aria-hidden />
                <div>
                  <p className="font-medium text-fg">Upgrade anytime</p>
                  <p className="text-xs text-fg-muted">Add your Ghana Card later to become a full citizen account.</p>
                </div>
              </div>
            </div>

            <Button variant="primary" icon={User} block className="mt-8" onClick={() => setStep('scan')}>
              Start Face Scan
            </Button>

            <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => navigate({ name: 'login' })}>
              Back to login
            </Button>
          </div>
        )}

        {step === 'scan' && (
          <FaceScan
            onComplete={handleScanComplete}
            onCancel={handleCancel}
          />
        )}

        {step === 'creating' && (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <Loader2 className="size-12 animate-spin text-brand" aria-hidden />
            <h3 className="text-lg font-semibold text-fg">Creating your guest profile&hellip;</h3>
            <p className="text-sm text-fg-muted">This only takes a moment.</p>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-resolved-soft text-resolved-fg">
              <Loader2 className="size-8 animate-spin" aria-hidden />
            </div>
            <h3 className="text-lg font-semibold text-fg">All set!</h3>
            <p className="text-sm text-fg-muted">Redirecting to the map&hellip;</p>
          </div>
        )}
      </AuthCard>
    </AuthLayout>
  )
}