import { useState } from 'react'
import { useI18n } from './i18n/I18nContext'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import ScanPage from './pages/ScanPage'
import ExportPage from './pages/ExportPage'

type Page = 'home' | 'scanning' | 'export'

function App(): JSX.Element {
  const { t } = useI18n()
  const [page, setPage] = useState<Page>('home')

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Header
        title="PostEasy"
        subtitle={page === 'home' ? t('Java Controller API 文档生成工具') : undefined}
      />

      <main className="px-6 py-8">
        {page === 'home' && (
          <HomePage onStartScan={() => setPage('scanning')} />
        )}

        {page === 'scanning' && (
          <ScanPage
            onGoExport={() => setPage('export')}
            onGoHome={() => setPage('home')}
          />
        )}

        {page === 'export' && (
          <ExportPage
            onGoBack={() => setPage('scanning')}
            onGoHome={() => setPage('home')}
          />
        )}
      </main>

      <footer className="text-center py-4 text-xs text-gray-400">
        {t('PostEasy v1.0.0')}
      </footer>
    </div>
  )
}

export default App
