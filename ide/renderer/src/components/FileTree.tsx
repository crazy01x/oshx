import React from 'react'
import { useStore } from '../store'
import type { FileNode } from '../../../../shared/types'

function TreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const { openTab, setActiveTab } = useStore()

  const handleClick = async () => {
    if (node.kind === 'file') {
      const content = await window.oshx.readFile(node.path)
      openTab(node.path, content)
      setActiveTab(node.path)
    }
  }

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-0.5 px-2 hover:bg-[#313244] cursor-pointer rounded text-xs"
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={handleClick}
      >
        <span className="text-[#6c7086]">{node.kind === 'dir' ? '▸' : '·'}</span>
        <span className={node.kind === 'dir' ? 'text-[#89b4fa]' : 'text-[#cdd6f4]'}>
          {node.name}
        </span>
      </div>
      {node.kind === 'dir' && node.children?.map(child => (
        <TreeNode key={child.path} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

export default function FileTree() {
  const { fileTree } = useStore()
  return (
    <div className="py-2">
      <div className="px-3 py-1 text-xs text-[#6c7086] uppercase tracking-widest mb-1">Explorer</div>
      {fileTree.map(node => <TreeNode key={node.path} node={node} />)}
    </div>
  )
}
