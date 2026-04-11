/**
 * Logger seguro — mascara automaticamente tokens, secrets e dados sensíveis
 * antes de qualquer exibição no dashboard ou nos arquivos de log.
 */

// ── Padrões de dados sensíveis ────────────────────────────────────────────────
const SENSITIVE: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /sk-[a-zA-Z0-9_-]{20,}/g,                               label: "OPENAI_KEY" },
    { pattern: /Bearer\s+[a-zA-Z0-9\-_.]{20,}/gi,                      label: "BEARER_TOKEN" },
    { pattern: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, label: "JWT" },
    { pattern: /(token|secret|password|passwd|pwd|apikey|api_key)\s*[:=]\s*["']?[a-zA-Z0-9\-_.+/]{8,}/gi, label: "SECRET" },
    { pattern: /TURSO_AUTH_TOKEN=[^\s"'&]+/g,                           label: "TURSO_TOKEN" },
    { pattern: /DATABASE_URL=[^\s"'&]+/g,                               label: "DB_URL" },
    { pattern: /BETTER_AUTH_SECRET=[^\s"'&]+/g,                         label: "AUTH_SECRET" },
    { pattern: /[a-f0-9]{32,64}/g,                                      label: "HEX_SECRET" },
];

export function sanitize(text: string): string {
    let result = text;
    for (const { pattern, label } of SENSITIVE) {
        result = result.replace(pattern, `[${label}:REDACTED]`);
        pattern.lastIndex = 0;
    }
    return result;
}

// ── Logger público ────────────────────────────────────────────────────────────
type Level = "info" | "warn" | "error" | "debug";

const LEVELS: Record<Level, string> = {
    info:  "ℹ",
    warn:  "",
    error: "",
    debug: "·",
};

export function log(level: Level, module: string, message: string): void {
    const safe = sanitize(message);
    const ts   = new Date().toISOString().slice(11, 23);
    console.error(`[${ts}] ${LEVELS[level]} [${module}] ${safe}`);
}

export const logger = {
    info:  (mod: string, msg: string) => log("info",  mod, msg),
    warn:  (mod: string, msg: string) => log("warn",  mod, msg),
    error: (mod: string, msg: string) => log("error", mod, msg),
    debug: (mod: string, msg: string) => log("debug", mod, msg),
};

