import { execSync } from "child_process";
import { postToChannel } from "../modules/channels.js";

function git(args: string, cwd: string): string {
    try {
        return execSync(`git ${args}`, { cwd, encoding: "utf-8", timeout: 15000 }).trim();
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`git ${args.split(" ")[0]} falhou: ${msg.slice(0, 300)}`);
    }
}

// ── Operations ────────────────────────────────────────────────────────────────
export function getDiff(cwd: string): string {
    try {
        const staged   = git("diff --staged --stat", cwd);
        const unstaged = git("diff --stat", cwd);
        const full     = git("diff HEAD", cwd).slice(0, 3000);
        return [staged && `STAGED:\n${staged}`, unstaged && `UNSTAGED:\n${unstaged}`, full && `DIFF:\n${full}`]
            .filter(Boolean).join("\n\n") || "Sem alterações.";
    } catch (e: unknown) {
        return e instanceof Error ? e.message : String(e);
    }
}

export function commit(message: string, author: string, cwd: string): string {
    try {
        const status = git("status --short", cwd);
        if (!status) return "Nada para commitar.";
        git("add -A", cwd);
        const result = git(`commit -m "${message.replace(/"/g, "'")}"`, cwd);
        postToChannel("git-ops", author, ` Commit: ${message}\n\`\`\`\n${result}\n\`\`\``, "commit");
        postToChannel("hall-of-fame", "OSHX-SYSTEM",
            ` @${author} commitou: "${message}"`, "achievement");
        return result;
    } catch (e: unknown) {
        return e instanceof Error ? e.message : String(e);
    }
}

export function push(branch: string, author: string, cwd: string): string {
    try {
        const result = git(`push origin ${branch}`, cwd);
        postToChannel("git-ops", author, ` Push para \`${branch}\`:\n${result}`);
        return result;
    } catch (e: unknown) {
        return e instanceof Error ? e.message : String(e);
    }
}

export function createBranch(name: string, author: string, cwd: string): string {
    try {
        const result = git(`checkout -b ${name}`, cwd);
        postToChannel("git-ops", author, ` Branch criada: \`${name}\``);
        return result;
    } catch (e: unknown) {
        return e instanceof Error ? e.message : String(e);
    }
}

export function switchBranch(name: string, cwd: string): string {
    try {
        return git(`checkout ${name}`, cwd);
    } catch (e: unknown) {
        return e instanceof Error ? e.message : String(e);
    }
}

export function getCurrentBranch(cwd: string): string {
    try { return git("branch --show-current", cwd); }
    catch { return "unknown"; }
}

export function depCheck(cwd: string): string {
    try {
        // Try bun audit first, fall back to npm audit
        try { return execSync("bun audit", { cwd, encoding: "utf-8", timeout: 20000 }); }
        catch { return execSync("npm audit --json", { cwd, encoding: "utf-8", timeout: 20000 }).slice(0, 2000); }
    } catch (e: unknown) {
        return e instanceof Error ? e.message : "Falha ao verificar dependências.";
    }
}

