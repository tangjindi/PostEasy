// I18N dictionary: Chinese text -> English text
// Pattern consistent with templates/api-doc.hbs I18N object
export const I18N: Record<string, string> = {
  // ---- App / Header ----
  'PostEasy': 'PostEasy',
  'Java Controller API 文档生成工具': 'Java Controller API Doc Generator',
  'PostEasy v1.0.0': 'PostEasy v1.0.0',

  // ---- HomePage ----
  '扫描 Java 项目 API': 'Scan Java Project APIs',
  '选择项目目录，自动识别 Controller 并生成 HTML 接口文档':
    'Select a project directory to auto-detect Controllers and generate HTML API docs',
  '项目根目录': 'Project Root',
  '选择 Java 项目根目录...': 'Select Java project root...',
  '接口路径（可选）': 'API Path (optional)',
  '如 src/main/java/com/example/controller': 'e.g. src/main/java/com/example/controller',
  '留空则从项目根目录开始扫描，支持多模块项目自动识别':
    'Leave empty to scan from project root; multi-module projects are auto-detected',
  '开始扫描': 'Start Scan',
  '最近打开的项目': 'Recent Projects',

  // ---- ScanPage ----
  '正在扫描项目...': 'Scanning project...',
  'Controller': 'Controllers',
  '接口': 'APIs',
  '问题': 'Issues',
  '配置提示：': 'Config hint: ',
  '扫描到的 Controller 文件': 'Scanned Controller Files',
  '接口预览': 'API Preview',
  '已废弃': 'Deprecated',
  '...还有 ': '...',
  ' 个接口': ' more',
  '← 返回': '← Back',
  '导出 HTML 文档': 'Export HTML',

  // ---- ExportPage ----
  '文档导出成功！': 'Export successful!',
  '可直接用浏览器打开该 HTML 文件，无需任何本地服务':
    'Open this HTML file directly in any browser; no local server required',
  '返回首页': 'Back to Home',
  '文档概览': 'Document Overview',
  '项目：': 'Project: ',
  '(未选择)': '(none)',
  'Controller 数量：': 'Controllers: ',
  '接口总数：': 'Total APIs: ',
  '文件名：': 'Filename: ',
  '导出失败': 'Export failed',
  '正在生成...': 'Generating...',

  // ---- Components ----
  ' 个文件解析出现问题': ' file(s) had parse issues',
  '导出错误报告': 'Export Error Report',
  '(扫描阶段)': '(scan phase)',
  'Controller 文件': 'Controller Files',
  '未找到文件': 'No files found',
  ' 文件': ' files',
  '选择文件夹...': 'Select folder...',
  '浏览': 'Browse',

  // ---- Main Process / IPC errors ----
  '未找到 Controller 文件': 'No Controller files found',
  '扫描失败': 'Scan failed',
  'HTML 生成失败': 'HTML generation failed',
  'HTML 文件': 'HTML Files',

  // ---- Validation constraints (parser fallback messages) ----
  '不能为 null': 'Cannot be null',
  '不能为空': 'Cannot be empty',
  '长度限制': 'Size constraint',
  '最小值限制': 'Min value constraint',
  '最大值限制': 'Max value constraint',
  '数值范围限制': 'Range constraint',
  '格式限制': 'Pattern constraint',
  '邮箱格式': 'Email format',
  '必须为正数': 'Must be positive',
  '必须为负数': 'Must be negative',
  '必须为非负数': 'Must be non-negative',
  '必须为非正数': 'Must be non-positive',
  '必须为 true': 'Must be true',
  '必须为 false': 'Must be false',
  '必须是过去时间': 'Must be in the past',
  '必须是未来时间': 'Must be in the future',
  '必须是过去或当前时间': 'Must be past or present',
  '必须是未来或当前时间': 'Must be future or present',
}

export type Lang = 'zh' | 'en'
