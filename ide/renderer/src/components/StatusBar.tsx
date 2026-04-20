import React, { useEffect, useState } from 'react'
import { useStore } from '../store'
import type { GitStatus } from '../../../../shared/types'

export default function StatusBar() {
  const { user, setUser, activeTab } = useStore()
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null)

  useEffect(() => {
    if (!activeTab) return
    const repoPath = activeTab.split('/').slice(0, -1).join('/')
    window.oshx.gitStatus(repoPath).then(setGitStatus).catch(() => {})
  }, [activeTab])

  const handleLogout = async () => {
    await window.oshx.logout()
    setUser(null)
  }

  return (
    <div className="flex items-center justify-between px-3 py-1 bg-[#1e1e2e] border-t border-[#313244] text-[10px] text-[#6c7086] flex-shrink-0">
      <div className="flex items-center gap-4">
        {gitStatus && <span className="text-[#a6e3a1]">⎇ {gitStatus.branch}</span>}
        {activeTab && <span>{activeTab.split('/').pop()}</span>}
        {gitStatus && gitStatus.entries.length > 0 && (
          <span className="text-[#f9e2af]">{gitStatus.entries.length} changed</span>
        )}
      </div>
      {user && (
        <div
          className="flex items-center gap-2 cursor-pointer hover:text-[#cdd6f4]"
          onClick={handleLogout}
        >
          <img src={user.avatar_url} alt={user.login} className="w-4 h-4 rounded-full" />
          <span>{user.login}</span>
          <span className="text-[#45475a]">· logout</span>
        </div>
      )}
    </div>
  )
}
