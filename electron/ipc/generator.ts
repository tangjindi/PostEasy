import * as fs from 'fs'
import * as path from 'path'
import Handlebars from 'handlebars'
import type { ParsedAPI } from './types'

// Register Handlebars helpers
Handlebars.registerHelper('json', function (context) {
  return new Handlebars.SafeString(JSON.stringify(context))
})

Handlebars.registerHelper('httpColor', function (method: string) {
  const colors: Record<string, string> = {
    GET: '#22c55e',
    POST: '#3b82f6',
    PUT: '#f97316',
    DELETE: '#ef4444',
    PATCH: '#a855f7',
    HEAD: '#6b7280',
    OPTIONS: '#6b7280',
    ALL: '#6b7280'
  }
  return colors[method] || '#6b7280'
})

Handlebars.registerHelper('httpBadge', function (methods: string[]) {
  const colorMap: Record<string, string> = {
    GET: 'bg-green-500',
    POST: 'bg-blue-500',
    PUT: 'bg-orange-500',
    DELETE: 'bg-red-500',
    PATCH: 'bg-purple-500',
    ALL: 'bg-gray-500'
  }
  return methods.map(m =>
    `<span class="http-badge ${colorMap[m] || 'bg-gray-500'}">${m}</span>`
  ).join('')
})

/**
 * Generate a self-contained HTML API documentation file
 * from parsed API data using the Handlebars template.
 */
export function generateHtmlDoc(
  api: ParsedAPI,
  templatePath?: string
): string {
  // Resolve template path for both dev and production
  let resolvedPath = templatePath
  if (!resolvedPath) {
    // Try several locations
    const candidates = [
      path.join(__dirname, '../../templates/api-doc.hbs'),  // dev
      path.join(process.resourcesPath || '', 'templates/api-doc.hbs'), // production (extraResources)
      path.join(__dirname, '../templates/api-doc.hbs'),  // alternate
    ]
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        resolvedPath = p
        break
      }
    }
  }

  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    // Final fallback: embed inline template
    return generateFallbackHtml(api)
  }

  const templateContent = fs.readFileSync(resolvedPath, 'utf-8')
  const template = Handlebars.compile(templateContent)

  return template({
    projectName: api.projectName,
    controllers: api.controllers,
    configHints: api.configHints,
    errors: api.errors,
    generatedAt: new Date().toISOString(),
    apiJson: JSON.stringify(api, null, 0).replace(/<\//g, '<\\/')
  })
}

/**
 * Minimal fallback HTML generator when template file is unavailable.
 * Used in production builds where the .hbs file might be bundled differently.
 */
function generateFallbackHtml(api: ParsedAPI): string {
  const apiJson = JSON.stringify(api).replace(/<\//g, '<\\/')
  // This is a minimal wrapper — the full template should be available in dev
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${api.projectName} - API 文档</title>
  <style>
    body { font-family: -apple-system, sans-serif; padding: 20px; }
    .error { color: #ef4444; }
  </style>
</head>
<body>
  <h1>${api.projectName} - API 文档</h1>
  <p class="error">⚠️ 模板文件未找到，请确保 templates/api-doc.hbs 存在。</p>
  <p>已解析 ${api.controllers.length} 个 Controller，共 ${api.controllers.reduce((s, c) => s + c.methods.length, 0)} 个接口。</p>
  <script>
    window.__POSTEASY_DATA__ = ${apiJson};
  </script>
</body>
</html>`
}
