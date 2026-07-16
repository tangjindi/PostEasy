import { contextBridge, ipcRenderer } from 'electron'

export type PostEasyAPI = {
  platform: string
  selectFolder: () => Promise<string | null>
  scanFiles: (opts: {
    rootPath: string
    subPath?: string
    excludeDirs?: string[]
  }) => Promise<{
    controllerFiles: string[]
    javaFiles: string[]
    configHints: { contextPath?: string; serverPort?: number }
  }>
  parseFiles: (
    controllerPaths: string[],
    allJavaPaths: string[],
    rootPath: string,
    configHints: { contextPath?: string; serverPort?: number }
  ) => Promise<unknown>
  generateDoc: (api: unknown, templatePath?: string, lang?: string) => Promise<string>
  saveFile: (opts: { defaultName: string; content: string; lang?: string }) => Promise<string | null>
  getRecentProjects: () => Promise<
    { path: string; name: string; lastOpened: string }[]
  >
  saveRecentProject: (project: {
    path: string
    name: string
    lastOpened: string
  }) => Promise<void>
}

const api: PostEasyAPI = {
  platform: process.platform,

  selectFolder: () => ipcRenderer.invoke('dialog:select-folder'),

  scanFiles: opts => ipcRenderer.invoke('scanner:scan', opts),

  parseFiles: (controllerPaths, allJavaPaths, rootPath, configHints) =>
    ipcRenderer.invoke('parser:parse', controllerPaths, allJavaPaths, rootPath, configHints),

  generateDoc: (api, templatePath, lang) =>
    ipcRenderer.invoke('generator:generate', api, templatePath, lang),

  saveFile: opts => ipcRenderer.invoke('dialog:save-file', opts),

  getRecentProjects: () => ipcRenderer.invoke('config:get-recent'),

  saveRecentProject: project => ipcRenderer.invoke('config:save-recent', project)
}

contextBridge.exposeInMainWorld('posteasy', api)
