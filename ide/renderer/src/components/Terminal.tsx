import React, { useEffect, useRef } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { useStore } from '../store'
import 'xterm/css/xterm.css'

export default function Terminal() {
  const { terminalId, setTerminalId } = useStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<XTerm | null>(null)
  const fitRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const term = new XTerm({
      theme: { background: '#0f0f0f', foreground: '#cdd6f4' },
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      cursorBlink: true,
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(containerRef.current)
    fit.fit()

    termRef.current = term
    fitRef.current = fit

    window.oshx.terminalCreate('G:/oshx-mcp').then(id => {
      setTerminalId(id)
      window.oshx.onTerminalData((evtId, data) => {
        if (evtId === id) term.write(data)
      })
      term.onData(data => window.oshx.terminalInput(id, data))
    })

    const ro = new ResizeObserver(() => {
      fit.fit()
      if (terminalId) window.oshx.terminalResize(terminalId, term.cols, term.rows)
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      term.dispose()
    }
  }, [])

  return <div ref={containerRef} className="h-full p-1" />
}
