import React from 'react'
import MonacoEditor from '@monaco-editor/react'
import { useStore } from '../store'

function getLanguage(path: string): string {
  const ext = path.split('.').pop() ?? ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    rs: 'rust', py: 'python', go: 'go', json: 'json', md: 'markdown',
    css: 'css', html: 'html', toml: 'toml', yaml: 'yaml', yml: 'yaml',
  }
  return map[ext] ?? 'plaintext'
}

export default function Editor() {
  const { tabs, activeTab, updateTabContent, markTabSaved, closeTab, setActiveTab } = useStore()
  const activeTabData = tabs.find(t => t.path === activeTab)

  const handleSave = async () => {
    if (!activeTab || !activeTabData) return
    await window.oshx.writeFile(activeTab, activeTabData.content)
    markTabSaved(activeTab)
  }

  if (!activeTabData) {
    return (
      <div className="flex items-center justify-center h-full text-[#6c7086] text-sm">
        Open a file from the explorer
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex bg-[#1e1e2e] border-b border-[#313244] overflow-x-auto flex-shrink-0">
        {tabs.map(tab => (
          <div
            key={tab.path}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs border-r border-[#313244] cursor-pointer flex-shrink-0 ${
              tab.path === activeTab
                ? 'bg-[#0f0f0f] text-[#cdd6f4]'
                : 'text-[#6c7086] hover:bg-[#313244]'
            }`}
            onClick={() => setActiveTab(tab.path)}
          >
            <span>{tab.path.split('/').pop()}</span>
            {tab.dirty && <span className="text-[#f38ba8]">●</span>}
            <span
              className="hover:text-[#f38ba8] ml-1"
              onClick={(e) => { e.stopPropagation(); closeTab(tab.path) }}
            >×</span>
          </div>
        ))}
      </div>
      <div
        className="flex-1 overflow-hidden"
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave() }
        }}
      >
        <MonacoEditor
          height="100%"
          language={getLanguage(activeTabData.path)}
          value={activeTabData.content}
          theme="vs-dark"
          onChange={(v) => updateTabContent(activeTabData.path, v ?? '')}
          options={{
            fontSize: 13,
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            renderWhitespace: 'selection',
          }}
        />
      </div>
    </div>
  )
}
