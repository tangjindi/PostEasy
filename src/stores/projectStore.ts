import { create } from 'zustand'

export interface RecentProject {
  path: string
  name: string
  lastOpened: string
}

interface ProjectState {
  rootPath: string | null
  recentProjects: RecentProject[]
  projectName: string

  setRootPath: (path: string) => void
  addRecent: (project: RecentProject) => void
  loadRecent: () => Promise<void>
  setProjectName: (name: string) => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  rootPath: null,
  recentProjects: [],
  projectName: '',

  setRootPath: (path: string) => {
    set({ rootPath: path })
    // Extract project name from path
    const parts = path.replace(/\\/g, '/').split('/')
    const name = parts[parts.length - 1] || path
    set({ projectName: name })
  },

  addRecent: (project: RecentProject) => {
    const current = get().recentProjects
    const filtered = current.filter(p => p.path !== project.path)
    const updated = [project, ...filtered].slice(0, 10)
    set({ recentProjects: updated })
    // Persist via IPC
    window.posteasy?.saveRecentProject?.(project)
  },

  loadRecent: async () => {
    try {
      const projects = await window.posteasy?.getRecentProjects?.()
      if (projects) {
        // Validate paths exist
        const valid = projects.filter(p => {
          // Can't check existence from renderer — main process handles that
          return p && p.path
        })
        set({ recentProjects: valid || [] })
      }
    } catch {
      set({ recentProjects: [] })
    }
  },

  setProjectName: (name: string) => set({ projectName: name })
}))
