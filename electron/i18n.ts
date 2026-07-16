// Main process i18n — mirrors src/i18n/translations.ts for the main process subset
const I18N_MAIN: Record<string, string> = {
  'HTML 生成失败': 'HTML generation failed',
  'HTML 文件': 'HTML Files',
  '模板文件未找到，请确保 templates/api-doc.hbs 存在。':
    'Template file not found. Ensure templates/api-doc.hbs exists.',
  'API 文档': 'API Documentation',
  '已解析 ': 'Parsed ',
  ' 个 Controller，共 ': ' controllers, ',
  ' 个接口。': ' APIs.',
}

export type Lang = 'zh' | 'en'

export function t(s: string, lang: Lang = 'zh'): string {
  if (lang === 'en' && I18N_MAIN[s]) return I18N_MAIN[s]
  return s
}
