import { LOCKS_FILE } from "../core/constants.js";
import type { Lock } from "../core/constants.js";
import { readJSON, writeJSON, uid, now, getState, setState } from "../core/state.js";
import { postToChannel } from "./channels.js";
import { oshxBus } from "../core/events.js";

// ── Patterns that trigger auto-tackle ─────────────────────────────────────────
const DANGEROUS = /\b(rm\s+-rf|DROP\s+TABLE|DELETE\s+FROM\s+\w+\s*;|format\s+[a-z]:|\btruncate\b.*table)\b/i;

export function isDangerous(command: string): boolean {
    return DANGEROUS.test(command);
}

// ── Lock management ───────────────────────────────────────────────────────────
export function getLocks(): Lock[] {
    return readJSON<Lock[]>(LOCKS_FILE);
}

export function addLock(sessionId: string, lockedBy: string, reason: string): Lock {
    const lock: Lock = { id: uid(), session_id: sessionId, locked_by: lockedBy, reason, timestamp: now() };
    const locks = getLocks();
    locks.push(lock);
    writeJSON(LOCKS_FILE, locks);
    oshxBus.emit("lock", { lock });

    // Alert in emergency channel
    postToChannel(
        "emergency",
        lockedBy,
        ` **TACKLE** — @${lockedBy} bloqueou sessão \`${sessionId}\`\nMotivo: ${reason}\n Lock ID: \`${lock.id}\`\n@OWNER — intervenção necessária!`,
        "emergency"
    );
    return lock;
}

export function removeLock(lockId: string): boolean {
    const locks = getLocks();
    const idx = locks.findIndex(l => l.id === lockId);
    if (idx === -1) return false;
    locks.splice(idx, 1);
    writeJSON(LOCKS_FILE, locks);
    oshxBus.emit("release", { lock_id: lockId });
    return true;
}

export function getSessionLock(sessionId: string): Lock | undefined {
    return getLocks().find(l => l.session_id === sessionId);
}

// ── Lockdown ──────────────────────────────────────────────────────────────────
export function activateLockdown(reason: string, by: string): void {
    setState({ lockdown: true, lockdown_reason: reason });
    postToChannel(
        "emergency",
        "OSHX-SYSTEM",
        ` **EMERGENCY LOCKDOWN** ativado por @${by}\nMotivo: ${reason}\nTodos os processos suspensos. Use oshx_lockdown com activate:false para desfazer.`,
        "emergency"
    );
}

export function deactivateLockdown(by: string): void {
    setState({ lockdown: false, lockdown_reason: undefined });
    postToChannel(
        "emergency",
        "OSHX-SYSTEM",
        ` Lockdown desativado por @${by}. Operações normais retomadas.`,
        "system"
    );
}

