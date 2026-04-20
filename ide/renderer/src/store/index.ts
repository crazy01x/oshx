import { create } from 'zustand'
import type { FileNode, User } from '../../../shared/types'

interface EditorTab {
  path: string
  content: string
  dirty: boolean
}

interface Store {
  user: User | null
  setUser: (u: User | null) => void

  fileTree: FileNode[]
  setFileTree: (t: FileNode[]) => void
  selectedPath: string | null
  selectPath: (p: string | null) => void

  tabs: EditorTab[]
  activeTab: string | null
  openTab: (path: string, content: string) => void
  updateTabContent: (path: string, content: string) => void
  closeTab: (path: string) => void
  setActiveTab: (path: string) => void
  markTabSaved: (path: string) => void

  terminalId: string | null
  setTerminalId: (id: string) => void

  sidebarWidth: number
  terminalHeight: number
  setSidebarWidth: (w: number) => void
  setTerminalHeight: (h: number) => void
}

export const useStore = create<Store>((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),

  fileTree: [],
  setFileTree: (fileTree) => set({ fileTree }),
  selectedPath: null,
  selectPath: (selectedPath) => set({ selectedPath }),

  tabs: [],
  activeTab: null,
  openTab: (path, content) => {
    const exists = get().tabs.find(t => t.path === path)
    if (exists) { set({ activeTab: path }); return }
    set(s => ({ tabs: [...s.tabs, { path, content, dirty: false }], activeTab: path }))
  },
  updateTabContent: (path, content) =>
    set(s => ({ tabs: s.tabs.map(t => t.path === path ? { ...t, content, dirty: true } : t) })),
  closeTab: (path) =>
    set(s => {
      const tabs = s.tabs.filter(t => t.path !== path)
      const activeTab = s.activeTab === path ? (tabs[tabs.length - 1]?.path ?? null) : s.activeTab
      return { tabs, activeTab }
    }),
  setActiveTab: (activeTab) => set({ activeTab }),
  markTabSaved: (path) =>
    set(s => ({ tabs: s.tabs.map(t => t.path === path ? { ...t, dirty: false } : t) })),

  terminalId: null,
  setTerminalId: (terminalId) => set({ terminalId }),

  sidebarWidth: 240,
  terminalHeight: 200,
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  setTerminalHeight: (terminalHeight) => set({ terminalHeight }),
}))
