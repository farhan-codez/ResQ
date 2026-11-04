import { useEffect, useState } from 'react'

export function useIsMobile() {
  const q = '(max-width: 767px)'
  const [m, setM] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const mql = window.matchMedia(q)
    const on = () => setM(mql.matches)
    mql.addEventListener('change', on)
    return () => mql.removeEventListener('change', on)
  }, [])
  return m
}
