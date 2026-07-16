import { useEffect } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { useI18n } from '@/i18n/I18nContext'
import FolderPicker from '@/components/FolderPicker'
import type { RecentProject } from '@/stores/projectStore'

interface HomePageProps {
  onStartScan: () => void
}

export default function HomePage({ onStartScan }: HomePageProps): JSX.Element {
  const {
    rootPath,
    recentProjects,
    setRootPath,
    loadRecent,
    addRecent
  } = useProjectStore()

  const { t, lang } = useI18n()

  useEffect(() => {
    loadRecent()
  }, [])

  const handleStartScan = () => {
    if (!rootPath) return

    // Save to recent
    const name = rootPath.replace(/\\/g, '/').split('/').pop() || rootPath
    addRecent({
      path: rootPath,
      name,
      lastOpened: new Date().toISOString()
    })

    onStartScan()
  }

  const handleRecentClick = (project: RecentProject) => {
    // Quick validation — the scanner will handle actual path validation
    setRootPath(project.path)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Hero */}
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('扫描 Java 项目 API')}
        </h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          {t('选择项目目录，自动识别 Controller 并生成 HTML 接口文档')}
        </p>
      </div>

      {/* Project folder selection */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t('项目根目录')}
          </label>
          <FolderPicker
            value={rootPath || ''}
            onChange={setRootPath}
            placeholder={t('选择 Java 项目根目录...')}
          />
        </div>

      </div>

      {/* Start scan button */}
      <button
        onClick={handleStartScan}
        disabled={!rootPath}
        className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300
          dark:disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors
          text-lg disabled:cursor-not-allowed"
      >
        {t('开始扫描')}
      </button>

      {/* Recent projects */}
      {recentProjects.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t('最近打开的项目')}
          </h3>
          <div className="space-y-2">
            {recentProjects.map((project, i) => (
              <button
                key={i}
                onClick={() => handleRecentClick(project)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors
                  ${rootPath === project.path
                    ? 'border-primary-300 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" className="text-primary-500 shrink-0">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {project.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate max-w-md">
                      {project.path}
                    </p>
                  </div>
                  <span className="ml-auto text-xs text-gray-400">
                    {new Date(project.lastOpened).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US')}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
