import type { ReactNode } from 'react'
import { LOGIN_POSTER, LOGIN_VIDEO_SRC } from '../../lib/data'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-10 bg-[#0c2a1b]">
      {/* Background poster — falls back to solid brand green if the image fails to load */}
      <div
        className="absolute inset-0 z-[-10] object-cover w-full h-full"
        style={{
          backgroundImage: `url(${LOGIN_POSTER})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        aria-hidden
      />
      <div className="absolute inset-0 z-[-5] bg-[#0c2a1b]/55" aria-hidden />
      <main className="relative w-full max-w-[400px]">{children}</main>
      <p className="relative mt-8 mb-2 text-center text-xs text-white/60">Protecting Ghana's rivers and forests, one report at a time.</p>
    </div>
  )
}

export function AuthCard({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-border bg-surface p-6 shadow-overlay md:p-8">{children}</div>
}