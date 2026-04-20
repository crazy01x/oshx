import { spawn, ChildProcess } from 'child_process'
import { createInterface } from 'readline'
import { join } from 'path'
import { randomUUID } from 'crypto'
import type { RpcRequest, RpcResponse } from '../shared/types'

const SIDECAR_BIN = join(__dirname, '../../rust-sidecar/target/release/oshx-sidecar.exe')

interface PendingRequest {
  resolve: (r: RpcResponse) => void
  reject: (e: Error) => void
  timer: ReturnType<typeof setTimeout>
}

class SidecarClient {
  private proc: ChildProcess | null = null
  private pending = new Map<string, PendingRequest>()
  private restartCount = 0
  private readonly MAX_RESTARTS = 3

  start(): void {
    this.proc = spawn(SIDECAR_BIN, [], { stdio: ['pipe', 'pipe', 'inherit'] })

    const rl = createInterface({ input: this.proc.stdout! })
    rl.on('line', (line) => {
      if (!line.trim()) return
      try {
        const resp: RpcResponse = JSON.parse(line)
        const pending = this.pending.get(resp.id)
        if (pending) {
          clearTimeout(pending.timer)
          this.pending.delete(resp.id)
          pending.resolve(resp)
        }
      } catch { /* ignore malformed */ }
    })

    this.proc.on('exit', () => {
      if (this.restartCount < this.MAX_RESTARTS) {
        this.restartCount++
        setTimeout(() => this.start(), 1000)
      }
    })
  }

  call<T = unknown>(method: string, params: unknown, timeoutMs = 10_000): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.proc) return reject(new Error('sidecar not running'))
      const id = randomUUID()
      const req: RpcRequest = { id, method, params }
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`sidecar timeout: ${method}`))
      }, timeoutMs)
      this.pending.set(id, {
        resolve: (r) => r.error ? reject(new Error(r.error)) : resolve(r.result as T),
        reject,
        timer,
      })
      this.proc.stdin!.write(JSON.stringify(req) + '\n')
    })
  }

  stop(): void {
    this.proc?.kill()
    this.proc = null
  }
}

export const sidecar = new SidecarClient()
