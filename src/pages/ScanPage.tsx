import { useEffect } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { useScanStore } from '@/stores/scanStore'
import { useI18n } from '@/i18n/I18nContext'
import ProgressBar from '@/components/ProgressBar'
import FileList from '@/components/FileList'
import ErrorList from '@/components/ErrorList'

interface ScanPageProps {
  onGoExport: () => void
  onGoHome: () => void
}

export default function ScanPage({ onGoExport, onGoHome }: ScanPageProps): JSX.Element {
  const rootPath = useProjectStore(s => s.rootPath)
  const projectName = useProjectStore(s => s.projectName)

  const scanning = useScanStore(s => s.scanning)
  const progress = useScanStore(s => s.progress)
  const controllerFiles = useScanStore(s => s.controllerFiles)
  const parseResult = useScanStore(s => s.parseResult)
  const errors = useScanStore(s => s.errors)
  const startScan = useScanStore(s => s.startScan)

  const { t } = useI18n()

  useEffect(() => {
    if (rootPath && !scanning) {
      startScan(rootPath)
    }
  }, [rootPath])

  if (scanning) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {t('正在扫描项目...')}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{projectName}</p>
        </div>
        <ProgressBar
          current={progress.current}
          total={progress.total}
          currentFile={progress.currentFile}
        />
      </div>
    )
  }

  const totalApis = parseResult?.controllers.reduce(
    (sum, c) => sum + c.methods.length, 0
  ) || 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="text-2xl font-bold text-blue-600">{controllerFiles.length}</div>
          <div className="text-xs text-blue-500 mt-1">{t('Controller')}</div>
        </div>
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div className="text-2xl font-bold text-green-600">{totalApis}</div>
          <div className="text-xs text-green-500 mt-1">{t('接口')}</div>
        </div>
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <div className="text-2xl font-bold text-amber-600">{errors.length}</div>
          <div className="text-xs text-amber-500 mt-1">{t('问题')}</div>
        </div>
      </div>

      {/* Config hints */}
      {parseResult?.configHints && (parseResult.configHints.contextPath || parseResult.configHints.serverPort) && (
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">{t('配置提示：')}</span>
          {parseResult.configHints.contextPath && (
            <span className="ml-2">context-path: <code className="text-primary-600">{parseResult.configHints.contextPath}</code></span>
          )}
          {parseResult.configHints.serverPort && (
            <span className="ml-2">port: <code className="text-primary-600">{parseResult.configHints.serverPort}</code></span>
          )}
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <ErrorList
          errors={errors}
          onExport={() => {
            const text = errors.map(e => `${e.filePath}: ${e.message}`).join('\n')
            const blob = new Blob([text], { type: 'text/plain' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `parse-errors-${projectName}.txt`
            a.click()
            URL.revokeObjectURL(url)
          }}
        />
      )}

      {/* File list */}
      <FileList files={controllerFiles} title={t('扫描到的 Controller 文件')} />

      {/* Controllers preview */}
      {parseResult && parseResult.controllers.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('接口预览')}
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {parseResult.controllers.map((ctrl, i) => (
              <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-t-lg flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {ctrl.displayName || ctrl.className}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">{ctrl.basePath}</span>
                  {ctrl.isDeprecated && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{t('已废弃')}</span>
                  )}
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {ctrl.methods.slice(0, 10).map((m, j) => (
                    <div key={j} className="px-4 py-2 flex items-center gap-3 text-sm">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium text-white ${httpColor(m.httpMethods[0] || 'GET')}`}>
                        {m.httpMethods[0] || 'GET'}
                      </span>
                      <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{m.fullPath}</span>
                      <span className="text-xs text-gray-400 truncate">{m.summary}</span>
                    </div>
                  ))}
                  {ctrl.methods.length > 10 && (
                    <div className="px-4 py-1 text-xs text-gray-400">
                      {t('...还有 ') + (ctrl.methods.length - 10) + t(' 个接口')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onGoHome}
          className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg
            text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          {t('← 返回')}
        </button>
        <button
          onClick={onGoExport}
          disabled={!parseResult || parseResult.controllers.length === 0}
          className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300
            dark:disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors
            disabled:cursor-not-allowed"
        >
          {t('导出 HTML 文档')}
        </button>
      </div>
    </div>
  )
}

function httpColor(method: string): string {
  const colors: Record<string, string> = {
    GET: 'bg-green-500',
    POST: 'bg-blue-500',
    PUT: 'bg-orange-500',
    DELETE: 'bg-red-500',
    PATCH: 'bg-purple-500',
    ALL: 'bg-gray-500'
  }
  return colors[method] || 'bg-gray-500'
}
