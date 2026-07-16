import { useI18n } from '@/i18n/I18nContext'

interface ProgressBarProps {
  current: number
  total: number
  currentFile?: string
}

export default function ProgressBar({
  current,
  total,
  currentFile
}: ProgressBarProps): JSX.Element {
  const { t } = useI18n()
  const pct = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>
          {current} / {total}{t(' 文件')}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {currentFile && (
        <p className="text-xs text-gray-400 truncate">{currentFile}</p>
      )}
    </div>
  )
}
