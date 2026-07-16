import { useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'

interface FolderPickerProps {
  value: string
  onChange: (path: string) => void
  placeholder?: string
}

export default function FolderPicker({
  value,
  onChange,
  placeholder
}: FolderPickerProps): JSX.Element {
  const { t } = useI18n()
  const [hover, setHover] = useState(false)

  const handlePick = async () => {
    const api = (window as any).posteasy
    if (!api?.selectFolder) return
    const folder = await api.selectFolder()
    if (folder) onChange(folder)
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || t('选择文件夹...')}
        className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600
          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
          placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          text-sm"
      />
      <button
        onClick={handlePick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg
          text-sm font-medium transition-colors flex items-center gap-2 shrink-0"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        {t('浏览')}
      </button>
    </div>
  )
}
