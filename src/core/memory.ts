import fs from "fs";
import path from "path";
import { OSHX_ROOT } from "./constants.js";

const MEMORY_DIR = path.join(OSHX_ROOT, "memory");

const sessionStore = new Map<string, unknown>();

function ensureDir(): void {
    if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR, { recursive: true });
}

function persistPath(key: string): string {
    const safe = key.replace(/[^a-zA-Z0-9_-]/g, "_");
    return path.join(MEMORY_DIR, `${safe}.json`);
}

export function memGet(key: string, level: "session" | "persistent" = "session"): unknown {
    if (level === "session") return sessionStore.get(key);
    ensureDir();
    const p = persistPath(key);
    if (!fs.existsSync(p)) return undefined;
    return JSON.parse(fs.readFileSync(p, "utf-8")) as unknown;
}

export function memSet(key: string, value: unknown, level: "session" | "persistent" = "session"): void {
    if (level === "session") {
        sessionStore.set(key, value);
        return;
    }
    ensureDir();
    fs.writeFileSync(persistPath(key), JSON.stringify(value, null, 2), "utf-8");
}

export function memClear(key: string, level: "session" | "persistent" = "session"): void {
    if (level === "session") {
        sessionStore.delete(key);
        return;
    }
    const p = persistPath(key);
    if (fs.existsSync(p)) fs.unlinkSync(p);
}
