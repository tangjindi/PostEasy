import * as fs from 'fs'
import * as path from 'path'
import type { ScanOptions, ConfigHints } from './types'

const DEFAULT_EXCLUDE_DIRS = [
  'target',
  'build',
  '.gradle',
  'node_modules',
  '.git',
  '.idea',
  '.vscode',
  'test',
  '__pycache__',
  '.settings',
  'bin'
]

/**
 * Scan a directory tree for Java Controller files.
 * Also checks for Spring Boot configuration files.
 */
export function scanJavaProject(opts: ScanOptions): {
  controllerFiles: string[]
  javaFiles: string[]
  configHints: ConfigHints
} {
  const rootPath = opts.rootPath
  const excludeDirs = new Set([
    ...DEFAULT_EXCLUDE_DIRS,
    ...(opts.excludeDirs || [])
  ])

  const controllerFiles: string[] = []
  const javaFiles: string[] = []

  // Detect multi-module structure
  const srcDirs = findSourceDirectories(rootPath, excludeDirs)

  for (const srcDir of srcDirs) {
    walkDir(srcDir, excludeDirs, controllerFiles, javaFiles)
  }

  // If no explicit src dirs found, walk from rootPath
  if (srcDirs.length === 0) {
    walkDir(rootPath, excludeDirs, controllerFiles, javaFiles)
  }

  // Parse application config files for context-path / port hints
  const configHints = parseApplicationConfig(rootPath)

  return { controllerFiles, javaFiles, configHints }
}

/**
 * Detect Maven/Gradle source directories in single or multi-module projects.
 */
function findSourceDirectories(rootPath: string, excludeDirs: Set<string>): string[] {
  const srcDirs: string[] = []

  // Check root src/main/java first
  const rootSrc = path.join(rootPath, 'src', 'main', 'java')
  if (fs.existsSync(rootSrc)) {
    srcDirs.push(rootSrc)
  }

  // Check submodules (detect by pom.xml / build.gradle in subdirs)
  try {
    const entries = fs.readdirSync(rootPath, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory() || excludeDirs.has(entry.name)) continue
      if (entry.name.startsWith('.')) continue

      const subDir = path.join(rootPath, entry.name)
      const hasPom = fs.existsSync(path.join(subDir, 'pom.xml'))
      const hasGradle = fs.existsSync(path.join(subDir, 'build.gradle')) ||
        fs.existsSync(path.join(subDir, 'build.gradle.kts'))

      if (hasPom || hasGradle) {
        const subSrc = path.join(subDir, 'src', 'main', 'java')
        if (fs.existsSync(subSrc)) {
          srcDirs.push(subSrc)
        }
      }
    }
  } catch {
    // ignore readdir errors
  }

  return srcDirs
}

/**
 * Recursively walk directory tree, collecting controller and java files.
 */
function walkDir(
  dirPath: string,
  excludeDirs: Set<string>,
  controllerFiles: string[],
  javaFiles: string[],
  depth: number = 0
): void {
  if (depth > 20) return

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      if (excludeDirs.has(entry.name)) continue
      if (entry.name.startsWith('.')) continue
      walkDir(fullPath, excludeDirs, controllerFiles, javaFiles, depth + 1)
    } else if (entry.isFile() && entry.name.endsWith('.java')) {
      javaFiles.push(fullPath)

      if (isControllerFile(entry.name)) {
        controllerFiles.push(fullPath)
      }
    }
  }
}

/**
 * Check if a Java file name matches the Controller pattern.
 * Matches: *Controller.java
 * Excludes: *ControllerImpl.java, *ControllerTest.java, *Abstract*.java
 */
function isControllerFile(fileName: string): boolean {
  if (!fileName.endsWith('Controller.java')) return false
  if (fileName.endsWith('ControllerImpl.java')) return false
  if (fileName.endsWith('ControllerTest.java')) return false
  if (fileName.includes('Abstract')) return false
  return true
}

/**
 * Parse application.yml / application.properties for config hints.
 */
function parseApplicationConfig(rootPath: string): ConfigHints {
  const hints: ConfigHints = {}

  // Check common config file locations
  const configPaths = [
    path.join(rootPath, 'src', 'main', 'resources', 'application.yml'),
    path.join(rootPath, 'src', 'main', 'resources', 'application.yaml'),
    path.join(rootPath, 'src', 'main', 'resources', 'application.properties')
  ]

  for (const configPath of configPaths) {
    try {
      if (!fs.existsSync(configPath)) continue
      const content = fs.readFileSync(configPath, 'utf-8')

      if (configPath.endsWith('.properties')) {
        hints.contextPath = extractPropValue(content, 'server.servlet.context-path')
        const port = extractPropValue(content, 'server.port')
        if (port) hints.serverPort = parseInt(port, 10)
      } else {
        hints.contextPath = extractYamlValue(content, 'server.servlet.context-path')
        const port = extractYamlValue(content, 'server.port')
        if (port) hints.serverPort = parseInt(port, 10)
      }
      break // first found wins
    } catch {
      // ignore parse errors
    }
  }

  return hints
}

function extractPropValue(content: string, key: string): string | undefined {
  const regex = new RegExp(`^${key.replace('.', '\\.')}\\s*=\\s*(.+)$`, 'm')
  const match = content.match(regex)
  return match ? match[1].trim() : undefined
}

function extractYamlValue(content: string, keyPath: string): string | undefined {
  const keys = keyPath.split('.')
  const lines = content.split('\n')
  let currentIndent = -1
  let found = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (trimmed.startsWith('#') || trimmed === '') continue

    const indent = line.search(/\S/)

    for (let ki = 0; ki < keys.length; ki++) {
      const key = keys[ki]
      const regex = new RegExp(`^${key}\\s*:\\s*(.*)$`)
      const match = trimmed.match(regex)

      if (match && (indent > currentIndent || currentIndent === -1)) {
        if (ki === keys.length - 1) {
          const val = match[1].trim()
          return val.replace(/^['"]|['"]$/g, '') || undefined
        }
        currentIndent = indent
        found = true
        break
      }
    }
  }

  return found ? undefined : undefined
}
