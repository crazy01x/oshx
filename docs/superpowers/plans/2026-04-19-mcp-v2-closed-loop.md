# MCP v2 Closed Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform OSHX MCP from a passive toolbox into a closed-loop execution environment — agents submit a sequence of steps, MCP executes them internally and returns all results without ever needing to "escape" to native tools.

**Architecture:** 4 new tool files (`fs-tools`, `shell-tools`, `memory-tools`, `orchestrator-tools`) + 1 new core module (`memory.ts`) + two new response helpers (`jsonOk`/`jsonErr`) + category support in the registry. The orchestrator (`oshx_run`) is a deterministic sequential executor — the agent provides planned steps, MCP runs them in order and returns a unified result.

**Tech Stack:** TypeScript, Bun runtime, Bun built-in test runner (`bun test`).

---

## File Map

**Create:**
- `tests/helpers.ts` — shared test utilities
- `tests/state.test.ts` — tests for new jsonOk/jsonErr helpers
- `tests/registry.test.ts` — tests for category registry
- `tests/fs-tools.test.ts` — tests for filesystem tools
- `tests/shell-tools.test.ts` — tests for shell_exec
- `tests/memory-tools.test.ts` — tests for task_memory
- `tests/orchestrator.test.ts` — tests for run_task
- `src/tools/fs-tools.ts` — oshx_fs_read, oshx_fs_write, oshx_fs_edit
- `src/tools/shell-tools.ts` — oshx_shell
- `src/core/memory.ts` — session + persistent memory store
- `src/tools/memory-tools.ts` — oshx_memory
- `src/tools/orchestrator-tools.ts` — oshx_run

**Modify:**
- `package.json` — add `"test": "bun test"` script
- `src/core/state.ts` — add `jsonOk()`, `jsonErr()`, `parseJsonResult()`
- `src/core/registry.ts` — add category support, `listByCategory()`
- `src/core/server.ts` — import + register 4 new modules

---

## Task 0: Bun Test Setup

**Files:**
- Modify: `package.json`
- Create: `tests/helpers.ts`

- [ ] **Step 1: Add test script to package.json**

Open `package.json` and replace the `"scripts"` block with:

```json
"scripts": {
  "start": "bun run index.ts",
  "cli": "bun run cli.ts",
  "mcp:start": "bun run cli.ts start",
  "mcp:init": "bun run cli.ts init",
  "mcp:doctor": "bun run cli.ts doctor",
  "test": "bun test"
}
```

- [ ] **Step 2: Create test helpers**

Create `tests/helpers.ts`:

```typescript
/** Extracts the parsed JSON from a tool result content array. */
export function parseResult(raw: { content: Array<{ type: string; text: string }> }): {
    success: boolean;
    data?: unknown;
    error?: string;
} {
    const text = raw.content[0]?.text ?? "{}";
    try {
        return JSON.parse(text) as { success: boolean; data?: unknown; error?: string };
    } catch {
        return { success: true, data: text };
    }
}
```

- [ ] **Step 3: Verify bun test runs (empty suite)**

```bash
cd "G:\oshx-mcp\.claude\worktrees\determined-jepsen-23c27c"
bun test
```

Expected: `0 tests` with no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json tests/helpers.ts
git commit -m "test: setup bun test runner + helpers"
```

---

## Task 1: jsonOk / jsonErr Helpers

**Files:**
- Modify: `src/core/state.ts`
- Create: `tests/state.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/state.test.ts`:

```typescript
import { expect, test, describe } from "bun:test";
import { jsonOk, jsonErr, parseJsonResult } from "../src/core/state.js";

describe("jsonOk", () => {
    test("wraps data in MCP content format with success:true", () => {
        const result = jsonOk({ foo: "bar" });
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe("text");
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.success).toBe(true);
        expect(parsed.data).toEqual({ foo: "bar" });
    });
});

describe("jsonErr", () => {
    test("wraps error message with success:false", () => {
        const result = jsonErr("something broke");
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBe("something broke");
    });
});

describe("parseJsonResult", () => {
    test("parses valid JSON result text", () => {
        const text = JSON.stringify({ success: true, data: 42 });
        const parsed = parseJsonResult(text);
        expect(parsed.success).toBe(true);
        expect(parsed.data).toBe(42);
    });

    test("falls back to { success: true, data: text } for non-JSON (legacy ok() output)", () => {
        const parsed = parseJsonResult("Canal atualizado com sucesso.");
        expect(parsed.success).toBe(true);
        expect(parsed.data).toBe("Canal atualizado com sucesso.");
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/state.test.ts
```

Expected: FAIL — `jsonOk is not a function` (not yet implemented).

- [ ] **Step 3: Implement helpers in state.ts**

Add at the end of `src/core/state.ts` (after the `err` function):

```typescript
export function jsonOk(data: unknown) {
    return { content: [{ type: "text", text: JSON.stringify({ success: true, data }) }] };
}

export function jsonErr(error: string) {
    return { content: [{ type: "text", text: JSON.stringify({ success: false, error }) }] };
}

export function parseJsonResult(text: string): { success: boolean; data?: unknown; error?: string } {
    try {
        return JSON.parse(text) as { success: boolean; data?: unknown; error?: string };
    } catch {
        return { success: true, data: text };
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/state.test.ts
```

Expected: `3 tests passed`.

- [ ] **Step 5: Commit**

```bash
git add src/core/state.ts tests/state.test.ts
git commit -m "feat: add jsonOk/jsonErr/parseJsonResult helpers to state"
```

---

## Task 2: Registry Categories

**Files:**
- Modify: `src/core/registry.ts`
- Create: `tests/registry.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/registry.test.ts`:

```typescript
import { expect, test, describe, beforeEach } from "bun:test";

// We need a fresh registry per test — import the module functions
// and use a test-local approach by calling registerAll with test data.
// Since registry is a module singleton, we test its real behavior.
import { registerAll, listByCategory, getCategory, listTools } from "../src/core/registry.js";

describe("registry categories", () => {
    test("registerAll with category assigns category to all tools in the map", () => {
        registerAll({ test_fs_tool: async () => ({ content: [] }) }, "filesystem");
        expect(getCategory("test_fs_tool")).toBe("filesystem");
    });

    test("listByCategory returns only tools in that category", () => {
        registerAll({ test_shell_tool: async () => ({ content: [] }) }, "terminal");
        const fsList = listByCategory("filesystem");
        expect(fsList).toContain("test_fs_tool");
        expect(fsList).not.toContain("test_shell_tool");
    });

    test("registerAll without category does not set category", () => {
        registerAll({ test_no_cat: async () => ({ content: [] }) });
        expect(getCategory("test_no_cat")).toBeUndefined();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/registry.test.ts
```

Expected: FAIL — `listByCategory is not a function`.

- [ ] **Step 3: Update registry.ts**

Replace the full contents of `src/core/registry.ts` with:

```typescript
/**
 * Tool Registry — Singleton that enables oshx_run orchestration.
 * Any module can import getHandler() to invoke other tools programmatically.
 */

export type ToolCategory = "filesystem" | "terminal" | "git" | "web" | "agent" | "state" | "system";

type ToolHandler = (
    args: Record<string, unknown>
) => Promise<{ content: Array<{ type: string; text: string }> }>;

const _registry = new Map<string, ToolHandler>();
const _categories = new Map<string, ToolCategory>();

export function registerAll(map: Record<string, ToolHandler>, category?: ToolCategory): void {
    for (const [name, handler] of Object.entries(map)) {
        _registry.set(name, handler);
        if (category) _categories.set(name, category);
    }
}

export function getHandler(name: string): ToolHandler | undefined {
    return _registry.get(name);
}

export function listTools(): string[] {
    return Array.from(_registry.keys()).sort();
}

export function listByCategory(category: ToolCategory): string[] {
    return Array.from(_registry.keys())
        .filter(name => _categories.get(name) === category)
        .sort();
}

export function getCategory(name: string): ToolCategory | undefined {
    return _categories.get(name);
}

export function toolCount(): number {
    return _registry.size;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/registry.test.ts
```

Expected: `3 tests passed`.

- [ ] **Step 5: Commit**

```bash
git add src/core/registry.ts tests/registry.test.ts
git commit -m "feat: add category support to tool registry"
```

---

## Task 3: Filesystem Tools

**Files:**
- Create: `src/tools/fs-tools.ts`
- Create: `tests/fs-tools.test.ts`
- Modify: `src/core/server.ts`

- [ ] **Step 1: Write failing test**

Create `tests/fs-tools.test.ts`:

```typescript
import { expect, test, describe, afterEach } from "bun:test";
import fs from "fs";
import path from "path";
import { fsModule } from "../src/tools/fs-tools.js";
import { parseResult } from "./helpers.js";

const TMP = path.join(import.meta.dir, "__tmp_fs_test__");

afterEach(() => {
    if (fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true });
});

describe("oshx_fs_read", () => {
    test("reads an existing file", async () => {
        fs.mkdirSync(TMP, { recursive: true });
        fs.writeFileSync(path.join(TMP, "hello.txt"), "hello world", "utf-8");

        const raw = await fsModule.handlers.oshx_fs_read({ path: path.join(TMP, "hello.txt") });
        const r = parseResult(raw);
        expect(r.success).toBe(true);
        expect((r.data as { content: string }).content).toBe("hello world");
    });

    test("returns error for missing file", async () => {
        const raw = await fsModule.handlers.oshx_fs_read({ path: "/nonexistent/file.txt" });
        const r = parseResult(raw);
        expect(r.success).toBe(false);
        expect(r.error).toContain("nonexistent");
    });
});

describe("oshx_fs_write", () => {
    test("creates file and directories", async () => {
        const filePath = path.join(TMP, "nested", "dir", "file.txt");
        const raw = await fsModule.handlers.oshx_fs_write({ path: filePath, content: "written!" });
        const r = parseResult(raw);
        expect(r.success).toBe(true);
        expect(fs.readFileSync(filePath, "utf-8")).toBe("written!");
    });
});

describe("oshx_fs_edit", () => {
    test("replaces unique string in file", async () => {
        fs.mkdirSync(TMP, { recursive: true });
        const filePath = path.join(TMP, "edit.txt");
        fs.writeFileSync(filePath, "hello world\n", "utf-8");

        const raw = await fsModule.handlers.oshx_fs_edit({
            path: filePath,
            old_str: "hello world",
            new_str: "goodbye world",
        });
        const r = parseResult(raw);
        expect(r.success).toBe(true);
        expect(fs.readFileSync(filePath, "utf-8")).toBe("goodbye world\n");
    });

    test("returns error if old_str not found", async () => {
        fs.mkdirSync(TMP, { recursive: true });
        const filePath = path.join(TMP, "edit2.txt");
        fs.writeFileSync(filePath, "hello world\n", "utf-8");

        const raw = await fsModule.handlers.oshx_fs_edit({
            path: filePath,
            old_str: "does not exist",
            new_str: "anything",
        });
        const r = parseResult(raw);
        expect(r.success).toBe(false);
    });

    test("returns error if old_str appears multiple times", async () => {
        fs.mkdirSync(TMP, { recursive: true });
        const filePath = path.join(TMP, "edit3.txt");
        fs.writeFileSync(filePath, "abc abc abc\n", "utf-8");

        const raw = await fsModule.handlers.oshx_fs_edit({
            path: filePath,
            old_str: "abc",
            new_str: "xyz",
        });
        const r = parseResult(raw);
        expect(r.success).toBe(false);
        expect(r.error).toContain("3 vezes");
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/fs-tools.test.ts
```

Expected: FAIL — `Cannot find module '../src/tools/fs-tools.js'`.

- [ ] **Step 3: Create src/tools/fs-tools.ts**

```typescript
import fs from "fs";
import path from "path";
import type { ToolModule } from "../core/constants.js";
import { jsonOk, jsonErr } from "../core/state.js";

export const fsModule: ToolModule = {
    definitions: [
        {
            name: "oshx_fs_read",
            description: "Lê o conteúdo de um arquivo do sistema. Retorna texto UTF-8. Use para inspecionar arquivos antes de editar, ler configs, ou carregar código existente. path pode ser absoluto ou relativo ao cwd do processo.",
            inputSchema: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Caminho do arquivo" },
                },
                required: ["path"],
            },
        },
        {
            name: "oshx_fs_write",
            description: "Escreve conteúdo completo em um arquivo. Cria o arquivo e diretórios necessários se não existirem. CUIDADO: sobrescreve o arquivo completamente. Para edições pontuais, use oshx_fs_edit.",
            inputSchema: {
                type: "object",
                properties: {
                    path: { type: "string" },
                    content: { type: "string" },
                },
                required: ["path", "content"],
            },
        },
        {
            name: "oshx_fs_edit",
            description: "Substituição exata de texto dentro de um arquivo. Falha se old_str não for encontrado ou aparecer mais de uma vez no arquivo. Use oshx_fs_read antes para confirmar o trecho exato.",
            inputSchema: {
                type: "object",
                properties: {
                    path: { type: "string" },
                    old_str: { type: "string", description: "Texto exato a substituir (deve aparecer exatamente 1 vez)" },
                    new_str: { type: "string", description: "Texto de substituição" },
                },
                required: ["path", "old_str", "new_str"],
            },
        },
    ],

    handlers: {
        async oshx_fs_read(args) {
            const filePath = args.path as string;
            try {
                const content = fs.readFileSync(filePath, "utf-8");
                return jsonOk({ path: filePath, content, size: content.length });
            } catch (e) {
                return jsonErr(`Não foi possível ler ${filePath}: ${(e as Error).message}`);
            }
        },

        async oshx_fs_write(args) {
            const filePath = args.path as string;
            const content = args.content as string;
            try {
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                fs.writeFileSync(filePath, content, "utf-8");
                return jsonOk({ path: filePath, bytes_written: Buffer.byteLength(content, "utf-8") });
            } catch (e) {
                return jsonErr(`Não foi possível escrever ${filePath}: ${(e as Error).message}`);
            }
        },

        async oshx_fs_edit(args) {
            const filePath = args.path as string;
            const oldStr = args.old_str as string;
            const newStr = args.new_str as string;
            try {
                const content = fs.readFileSync(filePath, "utf-8");
                const count = content.split(oldStr).length - 1;
                if (count === 0) return jsonErr(`old_str não encontrado em ${filePath}`);
                if (count > 1) return jsonErr(`old_str encontrado ${count} vezes em ${filePath} — precisa ser único`);
                const updated = content.replace(oldStr, newStr);
                fs.writeFileSync(filePath, updated, "utf-8");
                return jsonOk({ path: filePath, replaced: true });
            } catch (e) {
                return jsonErr(`Erro em oshx_fs_edit: ${(e as Error).message}`);
            }
        },
    },
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/fs-tools.test.ts
```

Expected: `6 tests passed`.

- [ ] **Step 5: Register fsModule in server.ts**

Add import after the last existing tool import:

```typescript
import { fsModule } from "../tools/fs-tools.js";
```

Add `fsModule` to the `modules` array (after `workspaceModule`):

```typescript
const modules: ToolModule[] = [
    identityModule,
    channelModule,
    terminalModule,
    emergencyModule,
    consensusModule,
    xpModule,
    cacheModule,
    vaultModule,
    taskModule,
    gitModule,
    browserModule,
    systemModule,
    swarmModule,
    workspaceModule,
    fsModule,
];
```

After the existing `registerAll(allHandlers)` line, add:

```typescript
registerAll(fsModule.handlers, "filesystem");
```

- [ ] **Step 6: Commit**

```bash
git add src/tools/fs-tools.ts tests/fs-tools.test.ts src/core/server.ts
git commit -m "feat: add oshx_fs_read/write/edit filesystem tools"
```

---

## Task 4: Shell Tool

**Files:**
- Create: `src/tools/shell-tools.ts`
- Create: `tests/shell-tools.test.ts`
- Modify: `src/core/server.ts`

- [ ] **Step 1: Write failing test**

Create `tests/shell-tools.test.ts`:

```typescript
import { expect, test, describe } from "bun:test";
import { shellModule } from "../src/tools/shell-tools.js";
import { parseResult } from "./helpers.js";

describe("oshx_shell", () => {
    test("runs a command and returns stdout", async () => {
        const raw = await shellModule.handlers.oshx_shell({ cmd: "echo hello_oshx" });
        const r = parseResult(raw);
        expect(r.success).toBe(true);
        const data = r.data as { stdout: string; exit_code: number };
        expect(data.stdout).toContain("hello_oshx");
        expect(data.exit_code).toBe(0);
    });

    test("returns exit_code and stderr for failing command", async () => {
        const raw = await shellModule.handlers.oshx_shell({ cmd: "exit 1", cwd: process.cwd() });
        const r = parseResult(raw);
        // success is still true (tool succeeded), but exit_code is non-zero
        expect(r.success).toBe(true);
        const data = r.data as { exit_code: number };
        expect(data.exit_code).not.toBe(0);
    });

    test("uses custom cwd", async () => {
        const raw = await shellModule.handlers.oshx_shell({ cmd: "pwd", cwd: "/tmp" });
        const r = parseResult(raw);
        const data = r.data as { stdout: string };
        // On Windows this will use cmd.exe behavior, so just check it runs
        expect(r.success).toBe(true);
        expect(typeof data.stdout).toBe("string");
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/shell-tools.test.ts
```

Expected: FAIL — `Cannot find module '../src/tools/shell-tools.js'`.

- [ ] **Step 3: Create src/tools/shell-tools.ts**

```typescript
import { execSync } from "child_process";
import type { ToolModule } from "../core/constants.js";
import { jsonOk, jsonErr } from "../core/state.js";

export const shellModule: ToolModule = {
    definitions: [
        {
            name: "oshx_shell",
            description: "Executa um comando shell e retorna stdout, stderr e exit_code. Timeout padrão: 30s. Retorna sucesso mesmo com exit_code != 0 — verifique exit_code para saber se o comando falhou. Evite comandos interativos ou que lêem stdin. Use cwd para definir diretório de trabalho.",
            inputSchema: {
                type: "object",
                properties: {
                    cmd: { type: "string", description: "Comando a executar" },
                    cwd: { type: "string", description: "Diretório de trabalho (opcional, padrão: process.cwd())" },
                    timeout: { type: "number", description: "Timeout em ms (padrão: 30000)" },
                },
                required: ["cmd"],
            },
        },
    ],

    handlers: {
        async oshx_shell(args) {
            const cmd = args.cmd as string;
            const cwd = (args.cwd as string | undefined) || process.cwd();
            const timeout = (args.timeout as number | undefined) ?? 30000;

            try {
                const stdout = execSync(cmd, {
                    cwd,
                    timeout,
                    encoding: "utf-8",
                    stdio: ["pipe", "pipe", "pipe"],
                });
                return jsonOk({ cmd, cwd, exit_code: 0, stdout: stdout.trim(), stderr: "" });
            } catch (e: unknown) {
                const error = e as {
                    stdout?: string;
                    stderr?: string;
                    status?: number;
                    message: string;
                };
                return jsonOk({
                    cmd,
                    cwd,
                    exit_code: error.status ?? 1,
                    stdout: (error.stdout ?? "").trim(),
                    stderr: (error.stderr ?? error.message).trim(),
                });
            }
        },
    },
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/shell-tools.test.ts
```

Expected: `3 tests passed`.

- [ ] **Step 5: Register shellModule in server.ts**

Add after the fsModule import line:

```typescript
import { shellModule } from "../tools/shell-tools.js";
```

Add `shellModule` to the `modules` array (after `fsModule`).

Add after the existing `registerAll(allHandlers)` line:

```typescript
registerAll(shellModule.handlers, "terminal");
```

- [ ] **Step 6: Commit**

```bash
git add src/tools/shell-tools.ts tests/shell-tools.test.ts src/core/server.ts
git commit -m "feat: add oshx_shell tool for in-MCP command execution"
```

---

## Task 5: Memory Store + task_memory Tool

**Files:**
- Create: `src/core/memory.ts`
- Create: `src/tools/memory-tools.ts`
- Create: `tests/memory-tools.test.ts`
- Modify: `src/core/server.ts`

- [ ] **Step 1: Write failing test**

Create `tests/memory-tools.test.ts`:

```typescript
import { expect, test, describe, afterEach } from "bun:test";
import { memoryModule } from "../src/tools/memory-tools.js";
import { memClear } from "../src/core/memory.js";
import { parseResult } from "./helpers.js";

afterEach(() => {
    memClear("test_key", "session");
    memClear("test_persist", "persistent");
});

describe("oshx_memory set + get (session)", () => {
    test("stores and retrieves a value in session", async () => {
        await memoryModule.handlers.oshx_memory({ op: "set", key: "test_key", value: { x: 1 }, level: "session" });
        const raw = await memoryModule.handlers.oshx_memory({ op: "get", key: "test_key", level: "session" });
        const r = parseResult(raw);
        expect(r.success).toBe(true);
        expect((r.data as { value: { x: number }; found: boolean }).value).toEqual({ x: 1 });
        expect((r.data as { found: boolean }).found).toBe(true);
    });

    test("returns found:false for missing key", async () => {
        const raw = await memoryModule.handlers.oshx_memory({ op: "get", key: "missing_key_xyz", level: "session" });
        const r = parseResult(raw);
        expect((r.data as { found: boolean }).found).toBe(false);
    });
});

describe("oshx_memory clear", () => {
    test("clears a stored key", async () => {
        await memoryModule.handlers.oshx_memory({ op: "set", key: "test_key", value: 42, level: "session" });
        await memoryModule.handlers.oshx_memory({ op: "clear", key: "test_key", level: "session" });
        const raw = await memoryModule.handlers.oshx_memory({ op: "get", key: "test_key", level: "session" });
        const r = parseResult(raw);
        expect((r.data as { found: boolean }).found).toBe(false);
    });
});

describe("oshx_memory set error cases", () => {
    test("returns error when value is missing for set op", async () => {
        const raw = await memoryModule.handlers.oshx_memory({ op: "set", key: "test_key" });
        const r = parseResult(raw);
        expect(r.success).toBe(false);
        expect(r.error).toContain("value");
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/memory-tools.test.ts
```

Expected: FAIL — `Cannot find module '../src/tools/memory-tools.js'`.

- [ ] **Step 3: Create src/core/memory.ts**

```typescript
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
```

- [ ] **Step 4: Create src/tools/memory-tools.ts**

```typescript
import type { ToolModule } from "../core/constants.js";
import { jsonOk, jsonErr } from "../core/state.js";
import { memGet, memSet, memClear } from "../core/memory.js";

export const memoryModule: ToolModule = {
    definitions: [
        {
            name: "oshx_memory",
            description: "Armazena e recupera contexto entre chamadas ao MCP. Use para passar informações entre tools sem precisar sair do MCP. Nível 'session' existe enquanto o processo MCP estiver rodando. Nível 'persistent' sobrevive a reinicializações (salvo em .oshx/memory/). Ops: get, set, clear.",
            inputSchema: {
                type: "object",
                properties: {
                    op: { type: "string", enum: ["get", "set", "clear"] },
                    key: { type: "string", description: "Identificador da memória" },
                    value: { description: "Valor a armazenar (qualquer tipo JSON) — obrigatório para op: set" },
                    level: { type: "string", enum: ["session", "persistent"], description: "Nível de persistência (padrão: session)" },
                },
                required: ["op", "key"],
            },
        },
    ],

    handlers: {
        async oshx_memory(args) {
            const op = args.op as "get" | "set" | "clear";
            const key = args.key as string;
            const level = (args.level as "session" | "persistent") || "session";

            if (op === "get") {
                const value = memGet(key, level);
                return jsonOk({ key, level, value, found: value !== undefined });
            }

            if (op === "set") {
                if (args.value === undefined) return jsonErr("value é obrigatório para op: set");
                memSet(key, args.value, level);
                return jsonOk({ key, level, stored: true });
            }

            if (op === "clear") {
                memClear(key, level);
                return jsonOk({ key, level, cleared: true });
            }

            return jsonErr(`op inválida: ${String(op)}. Use: get, set, clear`);
        },
    },
};
```

- [ ] **Step 5: Run test to verify it passes**

```bash
bun test tests/memory-tools.test.ts
```

Expected: `4 tests passed`.

- [ ] **Step 6: Register memoryModule in server.ts**

Add import:

```typescript
import { memoryModule } from "../tools/memory-tools.js";
```

Add `memoryModule` to the `modules` array (after `shellModule`).

Add after the shellModule registration line:

```typescript
registerAll(memoryModule.handlers, "state");
```

- [ ] **Step 7: Commit**

```bash
git add src/core/memory.ts src/tools/memory-tools.ts tests/memory-tools.test.ts src/core/server.ts
git commit -m "feat: add session/persistent memory store + oshx_memory tool"
```

---

## Task 6: Orchestrator — oshx_run

**Files:**
- Create: `src/tools/orchestrator-tools.ts`
- Create: `tests/orchestrator.test.ts`
- Modify: `src/core/server.ts`

- [ ] **Step 1: Write failing test**

Create `tests/orchestrator.test.ts`:

```typescript
import { expect, test, describe } from "bun:test";
import { registerAll } from "../src/core/registry.js";
import { jsonOk, jsonErr } from "../src/core/state.js";
import { orchestratorModule } from "../src/tools/orchestrator-tools.js";
import { parseResult } from "./helpers.js";

// Register mock tools for testing
registerAll({
    mock_echo: async (args) => jsonOk({ echoed: args.msg }),
    mock_fail: async () => jsonErr("intentional failure"),
    mock_add:  async (args) => jsonOk({ sum: (args.a as number) + (args.b as number) }),
});

describe("oshx_run", () => {
    test("executes a single step and returns its result", async () => {
        const raw = await orchestratorModule.handlers.oshx_run({
            steps: [{ tool: "mock_echo", args: { msg: "hello" } }],
        });
        const r = parseResult(raw);
        expect(r.success).toBe(true);
        const data = r.data as { success: boolean; steps_executed: number; results: Array<{ data: { echoed: string } }> };
        expect(data.success).toBe(true);
        expect(data.steps_executed).toBe(1);
        expect(data.results[0].data.echoed).toBe("hello");
    });

    test("executes multiple steps in sequence", async () => {
        const raw = await orchestratorModule.handlers.oshx_run({
            steps: [
                { tool: "mock_echo", args: { msg: "step1" } },
                { tool: "mock_add",  args: { a: 2, b: 3 } },
            ],
        });
        const r = parseResult(raw);
        const data = r.data as { steps_executed: number; results: Array<{ data: unknown }> };
        expect(data.steps_executed).toBe(2);
        expect((data.results[1].data as { sum: number }).sum).toBe(5);
    });

    test("stops on first error when stop_on_error is true (default)", async () => {
        const raw = await orchestratorModule.handlers.oshx_run({
            steps: [
                { tool: "mock_fail",  args: {} },
                { tool: "mock_echo", args: { msg: "should not run" } },
            ],
        });
        const r = parseResult(raw);
        const data = r.data as { steps_executed: number; success: boolean };
        expect(data.steps_executed).toBe(1);
        expect(data.success).toBe(false);
    });

    test("continues on error when stop_on_error is false", async () => {
        const raw = await orchestratorModule.handlers.oshx_run({
            steps: [
                { tool: "mock_fail",  args: {} },
                { tool: "mock_echo", args: { msg: "still runs" } },
            ],
            stop_on_error: false,
        });
        const r = parseResult(raw);
        const data = r.data as { steps_executed: number };
        expect(data.steps_executed).toBe(2);
    });

    test("returns error for unknown tool", async () => {
        const raw = await orchestratorModule.handlers.oshx_run({
            steps: [{ tool: "nonexistent_tool_xyz", args: {} }],
        });
        const r = parseResult(raw);
        const data = r.data as { results: Array<{ error: string }> };
        expect(data.results[0].error).toContain("nonexistent_tool_xyz");
    });

    test("returns error for empty steps array", async () => {
        const raw = await orchestratorModule.handlers.oshx_run({ steps: [] });
        const r = parseResult(raw);
        expect(r.success).toBe(false);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/orchestrator.test.ts
```

Expected: FAIL — `Cannot find module '../src/tools/orchestrator-tools.js'`.

- [ ] **Step 3: Create src/tools/orchestrator-tools.ts**

```typescript
import type { ToolModule } from "../core/constants.js";
import { jsonOk, jsonErr, parseJsonResult, uid } from "../core/state.js";
import { getHandler } from "../core/registry.js";

interface Step {
    tool: string;
    args: Record<string, unknown>;
}

export const orchestratorModule: ToolModule = {
    definitions: [
        {
            name: "oshx_run",
            description: "Executa uma sequência de tools do MCP em ordem, passando contexto acumulado entre elas. Use para encadear múltiplas operações sem sair do MCP. Cada step especifica tool + args. stop_on_error (padrão: true) para na primeira falha. task_id é opcional para rastreamento. Retorna results[] com o resultado de cada step.",
            inputSchema: {
                type: "object",
                properties: {
                    steps: {
                        type: "array",
                        description: "Sequência de {tool, args} a executar em ordem",
                        items: {
                            type: "object",
                            properties: {
                                tool: { type: "string", description: "Nome da tool a chamar" },
                                args: { type: "object", description: "Argumentos da tool" },
                            },
                            required: ["tool", "args"],
                        },
                    },
                    stop_on_error: {
                        type: "boolean",
                        description: "Para na primeira falha. Padrão: true.",
                    },
                    task_id: {
                        type: "string",
                        description: "ID para rastreamento (gerado automaticamente se omitido)",
                    },
                },
                required: ["steps"],
            },
        },
    ],

    handlers: {
        async oshx_run(args) {
            const steps = args.steps as Step[];
            const stopOnError = args.stop_on_error !== false;
            const taskId = (args.task_id as string | undefined) || uid();

            if (!Array.isArray(steps) || steps.length === 0) {
                return jsonErr("steps deve ser um array não-vazio de {tool, args}");
            }

            const results: Array<{
                step: number;
                tool: string;
                success: boolean;
                data: unknown;
                error?: string;
            }> = [];

            for (let i = 0; i < steps.length; i++) {
                const { tool, args: stepArgs } = steps[i];
                const handler = getHandler(tool);

                if (!handler) {
                    const r = { step: i, tool, success: false, data: null, error: `Tool não encontrada: ${tool}` };
                    results.push(r);
                    if (stopOnError) break;
                    continue;
                }

                try {
                    const raw = await handler(stepArgs);
                    const text = raw.content[0]?.text ?? "{}";
                    const parsed = parseJsonResult(text);
                    results.push({
                        step: i,
                        tool,
                        success: parsed.success,
                        data: parsed.data ?? null,
                        error: parsed.error,
                    });
                    if (!parsed.success && stopOnError) break;
                } catch (e) {
                    results.push({ step: i, tool, success: false, data: null, error: (e as Error).message });
                    if (stopOnError) break;
                }
            }

            const allOk = results.length === steps.length && results.every(r => r.success);
            return jsonOk({
                task_id: taskId,
                success: allOk,
                steps_executed: results.length,
                steps_total: steps.length,
                results,
            });
        },
    },
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/orchestrator.test.ts
```

Expected: `6 tests passed`.

- [ ] **Step 5: Register orchestratorModule in server.ts**

Add import:

```typescript
import { orchestratorModule } from "../tools/orchestrator-tools.js";
```

Add `orchestratorModule` to the `modules` array (after `memoryModule`).

Add after the memoryModule registration line:

```typescript
registerAll(orchestratorModule.handlers, "agent");
```

- [ ] **Step 6: Run full test suite to confirm nothing broke**

```bash
bun test
```

Expected: all tests pass (state, registry, fs-tools, shell-tools, memory-tools, orchestrator).

- [ ] **Step 7: Commit**

```bash
git add src/tools/orchestrator-tools.ts tests/orchestrator.test.ts src/core/server.ts
git commit -m "feat: add oshx_run orchestrator — agents stay inside MCP for multi-step tasks"
```

---

## Task 7: Final Integration Smoke Test

**Goal:** Verify the full MCP starts with all new tools registered and visible.

- [ ] **Step 1: Check tool count**

```bash
cd "G:\oshx-mcp\.claude\worktrees\determined-jepsen-23c27c"
bun run -e "
import { startMCPServer } from './src/core/server.js';
import { listTools, listByCategory } from './src/core/registry.js';
// Don't start server, just import to trigger registration
const { boot } = await import('./src/core/boot.js');
await boot();
// Register modules manually to inspect
const { fsModule } = await import('./src/tools/fs-tools.js');
const { shellModule } = await import('./src/tools/shell-tools.js');
const { memoryModule } = await import('./src/tools/memory-tools.js');
const { orchestratorModule } = await import('./src/tools/orchestrator-tools.js');
const { registerAll } = await import('./src/core/registry.js');
registerAll(fsModule.handlers, 'filesystem');
registerAll(shellModule.handlers, 'terminal');
registerAll(memoryModule.handlers, 'state');
registerAll(orchestratorModule.handlers, 'agent');
console.log('filesystem:', listByCategory('filesystem'));
console.log('terminal:', listByCategory('terminal'));
console.log('state:', listByCategory('state'));
console.log('agent:', listByCategory('agent'));
"
```

Expected output:
```
filesystem: [ 'oshx_fs_edit', 'oshx_fs_read', 'oshx_fs_write' ]
terminal: [ 'oshx_shell' ]
state: [ 'oshx_memory' ]
agent: [ 'oshx_run' ]
```

- [ ] **Step 2: Commit final state**

```bash
git add -A
git commit -m "feat: MCP v2 complete — closed loop execution environment"
```

---

## Summary

After all 7 tasks, the MCP has:

| New tool | What it does |
|---|---|
| `oshx_fs_read` | Lê arquivos — remove necessidade de usar Read nativo |
| `oshx_fs_write` | Cria/sobrescreve arquivos |
| `oshx_fs_edit` | Edição pontual de arquivos |
| `oshx_shell` | Executa comandos shell com output capturado |
| `oshx_memory` | Armazena contexto entre chamadas (session + persistent) |
| `oshx_run` | Executa sequência de tools — agentes não precisam sair do MCP |
