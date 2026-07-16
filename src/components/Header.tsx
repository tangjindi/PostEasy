import { useI18n } from '@/i18n/I18nContext'

interface HeaderProps {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps): JSX.Element {
  const { lang, toggleLang } = useI18n()

  return (
    <header className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-primary-600">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <button
        onClick={toggleLang}
        className="px-3 py-1 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-md
          text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title={lang === 'zh' ? 'Switch to English' : '切换为中文'}
      >
        {lang === 'zh' ? 'EN' : '中'}
      </button>
    </header>
  )
}
