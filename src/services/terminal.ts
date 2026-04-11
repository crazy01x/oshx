import type { ChildProcessWithoutNullStreams } from "child_process";
import { spawn } from "child_process";
import path from "path";
import { OSHX_ROOT } from "../core/constants.js";
import { getHandler } from "../core/registry.js";
import { isLockdown, isOperatorOverride, uid } from "../core/state.js";
import { postToChannel } from "../modules/channels.js";
import { getLocks, isDangerous } from "../modules/moderation.js";

// ── Project root lockdown ─────────────────────────────────────────────────────
// OSHX_ROOT aponta para o diretório de dados do Oshx; código do projeto fica dois níveis acima
const PROJECT_ROOT = path.resolve(OSHX_ROOT, "../..");

function isSafeCwd(cwd: string): boolean {
    const resolved = path.resolve(cwd);
    const rel = path.relative(PROJECT_ROOT, resolved);
    if (resolved === PROJECT_ROOT) return true;
    return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

// ── MCP inception — route mcp://tool_name {...args} through registry ──────────
async function runMcpInception(
    raw: string,
    author: string
): Promise<ExecResult> {
    // Format: mcp://tool_name {"key":"value",...}
    const match = raw.match(/^mcp:\/\/(\S+)\s*(.*)/s);
    if (!match) {
        return { session_id: "", output: " Formato inválido. Use: mcp://tool_name {\"arg\":\"value\"}", interactive: false };
    }
    const [, toolName, argsRaw] = match;
    const handler = getHandler(toolName);
    if (!handler) {
        return { session_id: "", output: ` Tool "${toolName}" não encontrada no registry. Use oshx_list_tools para ver as disponíveis.`, interactive: false };
    }
    let args: Record<string, unknown> = {};
    if (argsRaw.trim()) {
        try { args = JSON.parse(argsRaw.trim()); }
        catch { return { session_id: "", output: ` JSON inválido nos args: ${argsRaw}`, interactive: false }; }
    }
    if (!args.author) args.author = author;

    postToChannel("terminal", author, ` MCP INCEPTION: ${toolName}(${JSON.stringify(args).slice(0, 100)})`);
    try {
        const result = await handler(args);
        const output = result.content[0]?.text ?? "";
        postToChannel("terminal", "OSHX-SYSTEM", ` ${toolName} → ${output.slice(0, 400)}`);
        return { session_id: "", output, interactive: false };
    } catch (e: unknown) {
        const msg = ` ${toolName} falhou: ${e instanceof Error ? e.message : String(e)}`;
        return { session_id: "", output: msg, interactive: false };
    }
}

// ── Session store ─────────────────────────────────────────────────────────────
export const sessions = new Map<string, ChildProcessWithoutNullStreams>();

export interface ExecResult {
    session_id: string;
    output: string;
    interactive: boolean;
    exit_code?: number;
}

// ── Start process ─────────────────────────────────────────────────────────────
export function startProcess(
    author: string,
    command: string,
    cwd?: string
): Promise<ExecResult> {
    // MCP inception shortcut
    if (command.startsWith("mcp://")) {
        return runMcpInception(command, author);
    }

    // Lockdown check
    if (isLockdown()) {
        return Promise.resolve({
            session_id: "",
            output: " LOCKDOWN ativo — todos os processos suspensos. Use oshx_lockdown para desfazer.",
            interactive: false,
        });
    }

    if (isOperatorOverride()) {
        return Promise.resolve({
            session_id: "",
            output: "⏸ OPERATOR OVERRIDE ativo — execução de terminal pausada até liberação no dashboard.",
            interactive: false,
        });
    }

    // Path lockdown
    const safeCwd = cwd ?? process.cwd();
    if (!isSafeCwd(safeCwd)) {
        return Promise.resolve({
            session_id: "",
            output: ` PATH LOCKDOWN — cwd fora do projeto.\n  Pedido: ${safeCwd}\n  Permitido: ${PROJECT_ROOT} e subdiretórios.`,
            interactive: false,
        });
    }

    // Dangerous command check (any active lock warns)
    const locks = getLocks();
    if (locks.length > 0 && isDangerous(command)) {
        return Promise.resolve({
            session_id: "",
            output: ` BLOQUEADO — Lock \`${locks[0].id}\` ativo por @${locks[0].locked_by}: ${locks[0].reason}\nLibere o lock antes de executar comandos destrutivos.`,
            interactive: false,
        });
    }

    const sessionId = uid();
    const env = { ...process.env, FORCE_COLOR: "0" };
    const child = spawn(command, { shell: true, cwd: safeCwd, env });
    sessions.set(sessionId, child);

    // Log to #terminal
    postToChannel("terminal", author, `$ ${command}${cwd ? ` [${cwd}]` : ""} [session:${sessionId}]`);

    return new Promise((resolve) => {
        let stdout = "";
        let stderr = "";
        let resolved = false;

        const settle = (result: ExecResult) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(watchdog);
            cleanup();
            resolve(result);
        };

        const onData = (data: Buffer) => {
            stdout += data.toString();
            const isInteractive = /[?►>]/.test(stdout) || stdout.length > 800;
            if (isInteractive) {
                postToChannel("terminal", "OSHX-SYSTEM",
                    `[${sessionId}] Processo interativo iniciado:\n${stdout.slice(0, 400)}`);
                settle({ session_id: sessionId, output: stdout, interactive: true });
            }
        };
        const onErr  = (data: Buffer) => { stderr += data.toString(); };
        const onClose = (code: number | null) => {
            sessions.delete(sessionId);
            const result = [`Exit ${code} [${sessionId}]`, stdout, stderr ? `Stderr:\n${stderr}` : ""].filter(Boolean).join("\n");
            postToChannel("terminal", "OSHX-SYSTEM", result.slice(0, 600));
            settle({ session_id: sessionId, output: result, interactive: false, exit_code: code ?? 0 });
        };

        const cleanup = () => {
            child.stdout.removeListener("data", onData);
            child.stderr.removeListener("data", onErr);
            child.removeListener("close", onClose);
            child.stdout.on("data", () => {}); // drain silently
        };

        child.stdout.on("data", onData);
        child.stderr.on("data", onErr);
        child.on("close", onClose);

        // 30s watchdog — SIGKILL and report
        const watchdog = setTimeout(() => {
            try { child.kill("SIGKILL"); } catch {}
            sessions.delete(sessionId);
            const msg = `⏱ WATCHDOG [${sessionId}] — processo encerrado após 30s (SIGKILL)\nOutput capturado:\n${(stdout + stderr).slice(0, 500)}`;
            postToChannel("terminal", "OSHX-SYSTEM", msg, "alert");
            settle({ session_id: sessionId, output: msg, interactive: false, exit_code: -1 });
        }, 30000);
    });
}

// ── Send input to interactive session ─────────────────────────────────────────
export function sendInput(sessionId: string, raw: string): Promise<string> {
    if (isOperatorOverride()) {
        return Promise.resolve("⏸ OPERATOR OVERRIDE ativo — input bloqueado.");
    }

    const child = sessions.get(sessionId);
    if (!child) return Promise.resolve(`Session \`${sessionId}\` não encontrada.`);

    const input = raw
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\u001b/g, "\u001b");

    child.stdin.write(input);

    return new Promise((resolve) => {
        let out = "";
        const listener = (chunk: Buffer) => { out += chunk.toString(); };
        child.stdout.on("data", listener);
        setTimeout(() => {
            child.stdout.removeListener("data", listener);
            resolve(`Input enviado. Estado do terminal:\n${out}`);
        }, 2000);
    });
}

// ── Kill session ──────────────────────────────────────────────────────────────
export function killSession(sessionId: string, author: string): string {
    const child = sessions.get(sessionId);
    if (!child) return `Session \`${sessionId}\` não encontrada.`;
    child.kill("SIGTERM");
    sessions.delete(sessionId);
    postToChannel("terminal", author, ` Session \`${sessionId}\` finalizada por @${author}.`);
    return `Session \`${sessionId}\` finalizada.`;
}

export function killAllSessions(author: string, reason = "bulk-kill"): number {
    let count = 0;
    for (const [sessionId, child] of sessions.entries()) {
        try {
            child.kill("SIGKILL");
            count++;
        } catch {}
        sessions.delete(sessionId);
    }
    if (count > 0) {
        postToChannel("terminal", author, ` ${count} sessão(ões) encerradas (${reason}).`, "alert");
    }
    return count;
}

export function listSessions(): string[] {
    return Array.from(sessions.keys());
}

