import type { ReactNode } from 'react'
import { LOGIN_POSTER, LOGIN_VIDEO_SRC } from '../../lib/data'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-4 py-10">
      {/* Background video placeholder. Set LOGIN_VIDEO_SRC in src/lib/data.ts to the supplied file. */}
      <video
        className="absolute inset-0 size-full object-cover"
        poster={LOGIN_POSTER}
        src={LOGIN_VIDEO_SRC || undefined}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden
        tabIndex={-1}
      />
      <div className="absolute inset-0 bg-[#0c2a1b]/60" aria-hidden />
      <main className="relative w-full max-w-[400px]">{children}</main>
      <p className="relative mt-6 text-center text-xs text-white/80">Protecting Ghana's rivers and forests, one report at a time.</p>
    </div>
  )
}

export function AuthCard({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-border bg-surface p-6 shadow-overlay md:p-8">{children}</div>
}

