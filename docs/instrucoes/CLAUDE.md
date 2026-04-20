# OSHX MCP — Instruções para Claude

Este arquivo documenta tudo que foi feito no projeto, o que o usuário quer, e como trabalhar aqui.

---

## Quem é o usuário

- Fala português, frequentemente com erros de digitação
- Quer que Claude tome **todas as decisões sozinho** — nunca pergunte, só execute ("só faz")
- Repete "só faz", "n fica me perguntando", "EU JA TE FALEI" quando Claude fica pedindo confirmação
- Abreviação: GSAP = "Get Shit Done" = quebra em mini-peças, testa no sandbox, passa pro próximo

---

## O que é o OSHX MCP

Servidor MCP em TypeScript/Bun com 50+ tools, protocolo STDIO, `@modelcontextprotocol/sdk`.

**Problema original:** Agentes de IA "escapavam" do MCP usando ferramentas nativas (Read/Edit/Bash) porque:
1. MCP não tinha tools de filesystem
2. Não tinha loop para tarefas longas
3. Não tinha encadeamento de tools

**Solução implementada:** Transformar o MCP num ambiente de execução fechado.

---

## O que já foi implementado (branch: `claude/determined-jepsen-23c27c`)

### MCP v2 — Closed Loop Execution

#### Task 0 — Infraestrutura de testes
- `package.json` — adicionado script `"test": "bun test"`
- `tests/helpers.ts` — helper `parseResult()` para tests

#### Task 1 — Padronização de respostas JSON
- `src/core/state.ts` — adicionado `jsonOk(data)`, `jsonErr(error)`, `parseJsonResult(text)`
- `tests/state.test.ts` — 4 testes cobrindo as funções

#### Task 2 — Registry com categorias
- `src/core/registry.ts` — reescrito com `ToolCategory`, `listByCategory()`, `getCategory()`
- Categorias: `filesystem | terminal | git | web | agent | state | system`
- `tests/registry.test.ts` — 3 testes

#### Task 3 — Filesystem tools
- `src/tools/fs-tools.ts` — `fsModule` com 3 tools:
  - `oshx_fs_read(path)` — lê arquivo, retorna `{path, content, size}`
  - `oshx_fs_write(path, content)` — escreve arquivo + cria dirs automaticamente
  - `oshx_fs_edit(path, old_str, new_str)` — substituição exata única (erro se 0 ou >1 matches)
- `tests/fs-tools.test.ts` — 6 testes

#### Task 4 — Shell execution
- `src/tools/shell-tools.ts` — `shellModule`:
  - `oshx_shell(cmd, cwd?, timeout?)` — execSync com stdio piped
  - Retorna `{cmd, cwd, exit_code, stdout, stderr}` — sempre jsonOk mesmo com exit_code != 0
- `tests/shell-tools.test.ts` — 3 testes

#### Task 5 — Memória persistente
- `src/core/memory.ts` — store com 3 níveis:
  - `task` — RAM dentro do run_task (não implementado ainda)
  - `session` — Map global (vida do processo)
  - `persistent` — JSON em `{OSHX_ROOT}/memory/{key}.json`
- `src/tools/memory-tools.ts` — `memoryModule`:
  - `oshx_memory({op: "get"|"set"|"clear", key, value?, level?})`
- `tests/memory-tools.test.ts` — 4 testes

#### Task 6 — Orchestrator `oshx_run`
- `src/tools/orchestrator-tools.ts` — `orchestratorModule`:
  - `oshx_run({steps, stop_on_error?, task_id?})`
  - `steps: Array<{tool: string, args: Record<string, unknown>}>`
  - Executa steps em sequência usando o registry interno
  - Retorna `{task_id, success, steps_executed, steps_total, results[]}`
- `tests/orchestrator.test.ts` — 6 testes

#### Sistema de Browser persistente
- `src/core/browser-session.ts` — sessões Playwright keepalive via Map:
  - `sessionOpen`, `sessionNavigate`, `sessionClick`, `sessionType`
  - `sessionRead`, `sessionScreenshot`, `sessionEval`, `sessionWait`
  - `sessionClose`, `sessionList`
- `src/tools/browser-session-tools.ts` — `browserSessionModule`:
  - `oshx_browser({action, session_id?, url?, selector?, text?, expression?})`
  - 10 actions: open/navigate/click/type/read/screenshot/eval/wait/close/list
  - `session_id` default = "default"
  - Screenshots salvas no diretório MIRROR

#### Sistema agent-to-agent
- `src/tools/agent-tools.ts` — `agentModule`:
  - `oshx_agent_dm({from, to, content, request_id?})` — DM via vault JSON
  - `oshx_agent_call({from, to, task, timeout_ms?})` — chama outro agente e aguarda resposta
  - DMs armazenadas como `agent_dm_{sorted-a}-{sorted-b}.json` no vault
  - `oshx_agent_call` faz polling a cada 500ms aguardando `is_response=true` com `request_id` matching

### Todos os módulos registrados em `src/core/server.ts`
```
fsModule       → "filesystem"
shellModule    → "terminal"
memoryModule   → "state"
orchestratorModule → "agent"
browserSessionModule → "web"
agentModule    → "agent"
```

---

## Estado atual dos testes

26 testes passando com `bun test`.

---

## Docs criados

- `docs/superpowers/specs/2026-04-19-mcp-v2-closed-loop-design.md` — spec de design
- `docs/superpowers/plans/2026-04-19-mcp-v2-closed-loop.md` — plano de implementação (7 tasks GSAP)

---

## O que está pendente / deferred

### IDE (explicitamente adiada)
- IDE com Rust + Electron
- OAuth para contas de usuários
- Conectar agentes para codar dentro da IDE

### Melhorias futuras no MCP
- Playwright precisa ser instalado para `oshx_browser` funcionar (`bun add playwright`)
- Testar `oshx_agent_call` com agentes reais
- PR para mergear `claude/determined-jepsen-23c27c` → `main`

---

## Padrões de código

```typescript
// Toda tool retorna este formato:
type ToolResult = {
  success: boolean
  data?: unknown
  error?: string
}

// Use sempre:
import { jsonOk, jsonErr } from "../core/state.js"

// Nunca use ok()/err() em tools novas — apenas jsonOk/jsonErr
```

### ToolHandler signature
```typescript
type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>
}>
```

### ToolModule pattern
```typescript
export const myModule: ToolModule = {
  definitions: [...],  // MCP tool definitions
  handlers: { tool_name: async (args) => jsonOk(result) }
}
```

---

## Como rodar

```bash
bun test              # rodar testes
bun run index.ts      # iniciar servidor MCP
```

---

## Regras de colaboração

1. **Nunca pergunte** — tome a decisão e execute
2. Metodologia **GSAP**: mini-peça → testa → próximo
3. **TDD**: escreva o teste antes, rode pra ver falhar, implemente, rode pra ver passar, commit
4. Commits frequentes com mensagens descritivas
5. Sempre use subagents para implementação (skill: `superpowers:subagent-driven-development`)
6. Dois reviews por task: spec compliance → code quality
