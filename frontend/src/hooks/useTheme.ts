import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

// Same key is read by the inline script in index.html to avoid a flash of the wrong theme.
const KEY = 'vsa.theme'

function loadTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(loadTheme)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      /* ignore */
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  const cycle = () =>
    setTheme((t) => (t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system'))

  return { theme, cycle }
}
