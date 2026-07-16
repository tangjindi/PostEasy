import { useState, useCallback } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { useScanStore } from '@/stores/scanStore'
import { useI18n } from '@/i18n/I18nContext'
import FolderPicker from '@/components/FolderPicker'

interface ExportPageProps {
  onGoBack: () => void
  onGoHome: () => void
}

export default function ExportPage({ onGoBack, onGoHome }: ExportPageProps): JSX.Element {
  const projectName = useProjectStore(s => s.projectName)
  const parseResult = useScanStore(s => s.parseResult)
  const generateHtml = useScanStore(s => s.generateHtml)

  const { t, lang } = useI18n()

  const [exporting, setExporting] = useState(false)
  const [exportedPath, setExportedPath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const defaultFileName = `${projectName || 'API'}${lang === 'en' ? '-API Docs.html' : '-API文档.html'}`

  const handleExport = useCallback(async () => {
    if (!parseResult) return
    setExporting(true)
    setError(null)

    try {
      // Generate HTML
      const html = await generateHtml(parseResult, lang)

      // Save file
      const api = (window as any).posteasy
      if (!api?.saveFile) {
        // Fallback: browser download
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = defaultFileName
        a.click()
        URL.revokeObjectURL(url)
        setExportedPath(defaultFileName)
      } else {
        const savedPath = await api.saveFile({
          defaultName: defaultFileName,
          content: html,
          lang
        })
        if (savedPath) {
          setExportedPath(savedPath)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('导出失败'))
    } finally {
      setExporting(false)
    }
  }, [parseResult, generateHtml, defaultFileName, lang, t])

  if (exportedPath) {
    return (
      <div className="max-w-lg mx-auto text-center py-12 space-y-6">
        <div className="text-green-500">
          <svg className="w-16 h-16 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {t('文档导出成功！')}
        </h3>
        <p className="text-sm text-gray-500 break-all">{exportedPath}</p>
        <p className="text-xs text-gray-400">
          {t('可直接用浏览器打开该 HTML 文件，无需任何本地服务')}
        </p>
        <button
          onClick={onGoHome}
          className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white
            font-medium rounded-lg transition-colors"
        >
          {t('返回首页')}
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Preview */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('文档概览')}
        </h3>
        <div className="text-sm text-gray-500 space-y-1">
          <p>{t('项目：')}{projectName || t('(未选择)')}</p>
          <p>{t('Controller 数量：')}{parseResult?.controllers.length || 0}</p>
          <p>
            {t('接口总数：')}
            {parseResult?.controllers.reduce((s, c) => s + c.methods.length, 0) || 0}
          </p>
          <p>{t('文件名：')}{defaultFileName}</p>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onGoBack}
          className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg
            text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          {t('← 返回')}
        </button>
        <button
          onClick={handleExport}
          disabled={exporting || !parseResult}
          className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300
            dark:disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors
            disabled:cursor-not-allowed"
        >
          {exporting ? t('正在生成...') : t('导出 HTML 文档')}
        </button>
      </div>
    </div>
  )
}
