import { useState, useEffect } from 'react'
import { dataService } from '@/services/dataService'

type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const settings = dataService.getSettings()
    return settings.theme
  })

  const [isDark, setIsDark] = useState<boolean>(() => {
    const settings = dataService.getSettings()
    return resolveTheme(settings.theme)
  })

  useEffect(() => {
    const unsubscribe = dataService.subscribe(() => {
      const newTheme = dataService.getSettings().theme
      setThemeState(newTheme)
      setIsDark(resolveTheme(newTheme))
      applyTheme(resolveTheme(newTheme))
    })

    applyTheme(resolveTheme(theme))
    return unsubscribe
  }, [])

  function resolveTheme(t: Theme): boolean {
    if (t === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return t === 'dark'
  }

  function applyTheme(dark: boolean) {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  function setTheme(newTheme: Theme) {
    dataService.updateSettings({ theme: newTheme })
    setThemeState(newTheme)
    const dark = resolveTheme(newTheme)
    setIsDark(dark)
    applyTheme(dark)
  }

  function toggleTheme() {
    const next: Theme = isDark ? 'light' : 'dark'
    setTheme(next)
  }

  return { theme, isDark, setTheme, toggleTheme }
}
