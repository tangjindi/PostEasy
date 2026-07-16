import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { scanJavaProject } from './ipc/scanner'
import { parseControllers } from './ipc/parser'
import { generateHtmlDoc } from './ipc/generator'
import { t, type Lang } from './i18n'
import type { ParseError } from './ipc/types'

// ---- Persistent config (recent projects) ----
const userDataPath = app.getPath('userData')
const recentProjectsPath = join(userDataPath, 'recent-projects.json')
const logDir = join(userDataPath, 'logs')

// Ensure log directory exists
try {
  const fs = require('fs')
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }
} catch { /* ignore */ }

// ---- Window ----
function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(details => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/src/index.html'))
  }

  return mainWindow
}

// ---- IPC Handlers ----

function registerIpcHandlers(): void {
  // Dialog: select folder
  ipcMain.handle('dialog:select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // Scanner: scan for Controller files
  ipcMain.handle('scanner:scan', async (_event, opts) => {
    const { controllerFiles, javaFiles, configHints } = scanJavaProject(opts)
    return { controllerFiles, javaFiles, configHints }
  })

  // Parser: parse Controller files
  ipcMain.handle('parser:parse', async (_event, controllerPaths, allJavaPaths, rootPath, configHints) => {
    // Write log for errors
    const result = parseControllers(controllerPaths, allJavaPaths, rootPath, configHints)
    if (result.errors.length > 0) {
      writeErrorLog(result.errors)
    }
    return result
  })

  // Generator: generate HTML document
  ipcMain.handle('generator:generate', async (_event, api, templatePath, lang?: Lang) => {
    try {
      return generateHtmlDoc(api, templatePath)
    } catch (err) {
      throw new Error(t('HTML 生成失败', lang || 'zh') + ': ' + (err instanceof Error ? err.message : String(err)))
    }
  })

  // Dialog: save file
  ipcMain.handle('dialog:save-file', async (_event, opts) => {
    const lang: Lang = opts.lang || 'zh'
    const result = await dialog.showSaveDialog({
      defaultPath: opts.defaultName,
      filters: [{ name: t('HTML 文件', lang), extensions: ['html'] }]
    })
    if (result.canceled || !result.filePath) return null

    const fs = require('fs')
    fs.writeFileSync(result.filePath, opts.content, 'utf-8')
    return result.filePath
  })

  // Config: get recent projects
  ipcMain.handle('config:get-recent', async () => {
    try {
      const fs = require('fs')
      if (fs.existsSync(recentProjectsPath)) {
        const data = fs.readFileSync(recentProjectsPath, 'utf-8')
        return JSON.parse(data)
      }
    } catch { /* ignore */ }
    return []
  })

  // Config: save recent project
  ipcMain.handle('config:save-recent', async (_event, project) => {
    try {
      const fs = require('fs')
      let recent: { path: string; name: string; lastOpened: string }[] = []
      if (fs.existsSync(recentProjectsPath)) {
        recent = JSON.parse(fs.readFileSync(recentProjectsPath, 'utf-8'))
      }
      // Remove existing entry for same path
      recent = recent.filter(p => p.path !== project.path)
      // Add to front
      recent.unshift(project)
      // Keep max 10
      recent = recent.slice(0, 10)
      fs.writeFileSync(recentProjectsPath, JSON.stringify(recent, null, 2), 'utf-8')
    } catch { /* ignore */ }
  })
}

// ---- Error Logging ----

function writeErrorLog(errors: ParseError[]): void {
  try {
    const fs = require('fs')
    const date = new Date().toISOString().split('T')[0]
    const logFile = join(logDir, `parse-errors-${date}.log`)
    const lines = errors.map(e => `[${new Date().toISOString()}] ${e.filePath}: ${e.message}`)
    fs.appendFileSync(logFile, lines.join('\n') + '\n', 'utf-8')

    // Clean up old logs (> 7 days)
    const files = fs.readdirSync(logDir)
    for (const file of files) {
      if (file.startsWith('parse-errors-')) {
        const fileDate = file.replace('parse-errors-', '').replace('.log', '')
        const diffDays = (Date.now() - new Date(fileDate).getTime()) / (1000 * 60 * 60 * 24)
        if (diffDays > 7) {
          fs.unlinkSync(join(logDir, file))
        }
      }
    }
  } catch { /* ignore */ }
}

// ---- App Lifecycle ----

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
