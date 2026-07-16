import { useI18n } from '@/i18n/I18nContext'

interface FileListProps {
  files: string[]
  title?: string
}

export default function FileList({ files, title }: FileListProps): JSX.Element {
  const { t } = useI18n()

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>{t('未找到文件')}</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {title || t('Controller 文件')} ({files.length})
      </h3>
      <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
        {files.map((file, i) => (
          <div
            key={i}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400
              border-b border-gray-100 dark:border-gray-800 last:border-0
              font-mono text-xs truncate hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            {extractFileName(file)}
          </div>
        ))}
      </div>
    </div>
  )
}

function extractFileName(fullPath: string): string {
  const parts = fullPath.replace(/\\/g, '/').split('/')
  // Show last 3 segments for context
  const display = parts.slice(-3).join('/')
  return display
}
