import React, { useEffect } from 'react'
import { useStore } from './store'
import FileTree from './components/FileTree'
import Editor from './components/Editor'
import Terminal from './components/Terminal'
import StatusBar from './components/StatusBar'
import LoginScreen from './components/LoginScreen'

export default function App() {
  const { user, setUser, setFileTree, sidebarWidth, terminalHeight } = useStore()

  useEffect(() => {
    window.oshx.getUser().then(u => setUser(u))
    window.oshx.onAuthComplete(u => setUser(u))
    window.oshx.onAuthError(msg => console.error('auth error:', msg))
    window.oshx.readDir('G:/oshx-mcp').then(setFileTree).catch(() => {})
  }, [])

  if (!user) return <LoginScreen />

  return (
    <div className="flex flex-col h-screen bg-[#0f0f0f] text-[#cdd6f4] font-mono text-sm select-none">
      <div className="flex flex-1 overflow-hidden">
        <div
          className="flex-shrink-0 border-r border-[#313244] overflow-y-auto"
          style={{ width: sidebarWidth }}
        >
          <FileTree />
        </div>
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <Editor />
          </div>
          <div
            className="flex-shrink-0 border-t border-[#313244]"
            style={{ height: terminalHeight }}
          >
            <Terminal />
          </div>
        </div>
      </div>
      <StatusBar />
    </div>
  )
}
