import type { ParseError } from '@/types/global'
import { useI18n } from '@/i18n/I18nContext'

interface ErrorListProps {
  errors: ParseError[]
  onExport?: () => void
}

export default function ErrorList({ errors, onExport }: ErrorListProps): JSX.Element {
  const { t } = useI18n()

  if (errors.length === 0) return <></>

  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" className="text-amber-600">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {errors.length}{t(' 个文件解析出现问题')}
          </span>
        </div>
        {onExport && (
          <button
            onClick={onExport}
            className="text-xs text-amber-700 dark:text-amber-300 hover:underline"
          >
            {t('导出错误报告')}
          </button>
        )}
      </div>
      <div className="border-t border-amber-200 dark:border-amber-800 max-h-48 overflow-y-auto">
        {errors.map((err, i) => (
          <div key={i} className="px-4 py-2 text-xs text-amber-700 dark:text-amber-300
            border-b border-amber-100 dark:border-amber-800/50 last:border-0">
            <span className="font-mono">{err.filePath || t('(扫描阶段)')}</span>
            <span className="mx-2">—</span>
            <span>{err.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
