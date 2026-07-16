import { create } from 'zustand'
import type { ParsedAPI, ParseError } from '@/types/global'

interface ScanProgress {
  current: number
  total: number
  currentFile: string
}

interface ScanState {
  scanning: boolean
  progress: ScanProgress
  controllerFiles: string[]
  allJavaFiles: string[]
  parseResult: ParsedAPI | null
  errors: ParseError[]
  htmlContent: string | null

  startScan: (rootPath: string, subPath?: string, excludeDirs?: string[]) => Promise<void>
  setScanning: (v: boolean) => void
  generateHtml: (api: ParsedAPI, lang?: string) => Promise<string>
  reset: () => void
}

export const useScanStore = create<ScanState>((set, get) => ({
  scanning: false,
  progress: { current: 0, total: 0, currentFile: '' },
  controllerFiles: [],
  allJavaFiles: [],
  parseResult: null,
  errors: [],
  htmlContent: null,

  startScan: async (rootPath: string, subPath?: string, excludeDirs?: string[]) => {
    const api = window.posteasy
    if (!api) return

    set({ scanning: true, progress: { current: 0, total: 0, currentFile: '' }, errors: [] })

    try {
      // Step 1: Scan
      const scanResult = await api.scanFiles({ rootPath, subPath, excludeDirs })
      const { controllerFiles, javaFiles, configHints } = scanResult

      if (controllerFiles.length === 0) {
        set({
          scanning: false,
          controllerFiles: [],
          allJavaFiles: javaFiles,
          parseResult: {
            projectName: rootPath.split('/').pop() || rootPath,
            controllers: [],
            configHints,
            errors: [{ filePath: '', message: '未找到 Controller 文件' }]
          }
        })
        return
      }

      set({
        progress: { current: 0, total: controllerFiles.length, currentFile: '' },
        controllerFiles,
        allJavaFiles: javaFiles
      })

      // Step 2: Parse
      const parseResult = await api.parseFiles(
        controllerFiles,
        javaFiles,
        rootPath,
        configHints
      )

      set({
        scanning: false,
        parseResult,
        errors: parseResult.errors || [],
        progress: { current: controllerFiles.length, total: controllerFiles.length, currentFile: '' }
      })
    } catch (err) {
      set({
        scanning: false,
        errors: [{
          filePath: '',
          message: err instanceof Error ? err.message : '扫描失败'
        }]
      })
    }
  },

  setScanning: (v: boolean) => set({ scanning: v }),

  generateHtml: async (api: ParsedAPI, lang?: string) => {
    const html = await window.posteasy.generateDoc(api, undefined, lang)
    set({ htmlContent: html })
    return html
  },

  reset: () => set({
    scanning: false,
    progress: { current: 0, total: 0, currentFile: '' },
    controllerFiles: [],
    allJavaFiles: [],
    parseResult: null,
    errors: [],
    htmlContent: null
  })
}))
