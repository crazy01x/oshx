import crypto from "crypto";
import fs from "fs";
import type { OshxState } from "./constants.js";
import { STATE_FILE } from "./constants.js";

// ── JSON helpers ──────────────────────────────────────────────────────────────
export function readJSON<T>(file: string): T {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
}

export function writeJSON(file: string, data: unknown): void {
    const payload = JSON.stringify(data, null, 2);
    let lastError: unknown;

    for (let attempt = 1; attempt <= 6; attempt++) {
        const tmp = `${file}.tmp.${process.pid}.${Date.now()}.${attempt}`;
        try {
            fs.writeFileSync(tmp, payload, "utf-8");
            fs.renameSync(tmp, file); // atomic on POSIX, near-atomic on Windows
            return;
        } catch (error) {
            lastError = error;
            try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch {}

            const code = (error as NodeJS.ErrnoException)?.code ?? "";
            const retriable = code === "EPERM" || code === "EBUSY" || code === "EACCES";
            if (!retriable || attempt === 6) break;

            // tiny sync backoff to reduce lock contention on Windows
            const waitMs = attempt * 15;
            const end = Date.now() + waitMs;
            while (Date.now() < end) {
                // intentional busy-wait (very short)
            }
        }
    }

    // Last resort: direct write (less atomic, but avoids hard failure in locked environments)
    try {
        fs.writeFileSync(file, payload, "utf-8");
        return;
    } catch {
        throw lastError;
    }
}

export function fileExists(file: string): boolean {
    return fs.existsSync(file);
}

// ── Utils ─────────────────────────────────────────────────────────────────────
export function uid(): string {
    return crypto.randomBytes(4).toString("hex");
}

export function now(): string {
    return new Date().toISOString();
}

export function calcLevel(xp: number): number {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function ok(text: string) {
    return { content: [{ type: "text", text }] };
}

export function err(text: string) {
    return { content: [{ type: "text", text: ` ${text}` }] };
}

// ── Global state ──────────────────────────────────────────────────────────────
export function getState(): OshxState {
    return readJSON<OshxState>(STATE_FILE);
}

export function setState(patch: Partial<OshxState>): void {
    const current = getState();
    writeJSON(STATE_FILE, { ...current, ...patch });
}

export function bumpMessages(): void {
    const s = getState();
    s.total_messages++;
    writeJSON(STATE_FILE, s);
}

export function isLockdown(): boolean {
    return getState().lockdown ?? false;
}

export function isOperatorOverride(): boolean {
    return getState().operator_override ?? false;
}

export function setOperatorOverride(active: boolean, by = "operator"): void {
    setState({
        operator_override: active,
        operator_override_by: active ? by : undefined,
        operator_override_at: active ? now() : undefined,
    });
}

