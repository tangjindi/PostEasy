import { createContext, useContext, useCallback, useState, type ReactNode } from 'react'
import { I18N, type Lang } from './translations'

const LANG_STORAGE_KEY = 'posteasy_lang'

interface I18nContextValue {
  lang: Lang
  t: (s: string) => string
  toggleLang: () => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

function loadLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY)
    return stored === 'en' ? 'en' : 'zh'
  } catch {
    return 'zh'
  }
}

function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang)
  } catch { /* ignore */ }
}

export function I18nProvider({ children }: { children: ReactNode }): JSX.Element {
  const [lang, setLang] = useState<Lang>(loadLang)

  const t = useCallback((s: string): string => {
    if (lang === 'en' && I18N[s]) return I18N[s]
    return s
  }, [lang])

  const toggleLang = useCallback(() => {
    setLang(prev => {
      const next = prev === 'zh' ? 'en' : 'zh'
      saveLang(next)
      return next
    })
  }, [])

  return (
    <I18nContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
