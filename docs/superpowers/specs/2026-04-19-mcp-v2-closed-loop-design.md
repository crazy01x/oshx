# OSHX MCP v2 — Closed Loop Execution Environment

**Date:** 2026-04-19  
**Scope:** MCP improvements only (IDE deferred)  
**Method:** GSAP — mini-peças testáveis em sequência

---

## Problema

O MCP v1 é uma caixa de ferramentas passiva. Os agentes escapam porque:

1. Ferramentas nativas do Claude (Read/Edit/Bash) são mais completas que as do MCP
2. Resultados insuficientes forçam o agente a agir por conta própria
3. Não há mecanismo de loop — tarefas longas escapam do MCP naturalmente
4. Sem encadeamento — cada tool call é isolada, sem contexto acumulado

---

## Objetivo

Transformar o MCP num **ambiente de execução fechado**: agentes submetem objetivos, o MCP executa e retorna resultado. Os agentes não precisam sair.

---

## Arquitetura v2

```
Agente (Claude, GPT, etc.)
         │
         ▼
   run_task(goal)          ← ponto de entrada único
         │
         ▼
   OrchestratorLoop
   ┌─────────────────────────────────┐
   │  Pensar → Selecionar tool       │
   │       ↓                         │
   │  Executar tool interna          │
   │       ↓                         │
   │  Observar resultado             │
   │       ↓                         │
   │  Goal atingido? → retorna       │
   │  Não? → próxima iteração        │
   └─────────────────────────────────┘
         │
         ▼
   task_memory (contexto acumulado)
```

---

## Seção 1: Padronização das Tools Existentes

**Resposta padrão para todas as tools:**
```typescript
type ToolResult = {
  success: boolean
  data: unknown
  error?: string
  meta?: { duration_ms: number; tool: string }
}
```

**Categorias no registry:**

| Categoria | Tools |
|---|---|
| `filesystem` | fs_read, fs_write, fs_edit (novas) |
| `terminal` | shell_exec (nova), terminal existente |
| `git` | git-tools existente |
| `web` | browser-tools existente |
| `agent` | run_task (nova), swarm-tools |
| `state` | task_memory (nova), cache-tools |
| `system` | system-tools, emergency-tools |

**4 novas tools essenciais (rotas de fuga tapadas):**

- `fs_read(path)` — lê arquivo, retorna conteúdo
- `fs_write(path, content)` — escreve arquivo
- `fs_edit(path, old, new)` — substituição exata (como Edit tool)
- `shell_exec(cmd, cwd?, timeout?)` — executa comando, retorna stdout/stderr

---

## Seção 2: Orchestrator — `run_task`

**Parâmetros:**
```typescript
run_task({
  goal: string           // objetivo em linguagem natural
  context?: string       // contexto inicial opcional
  context_id?: string    // retomar sessão anterior
  max_steps?: number     // default: 10
  allowed_tools?: string[] // restrição opcional de segurança
})
```

**Retorno:**
```typescript
{
  success: boolean
  result: string          // resposta final
  context_id: string      // ID para retomar depois
  trace: Array<{          // auditoria dos passos
    step: number
    tool: string
    input: unknown
    output: unknown
  }>
  steps_used: number
}
```

**Loop interno (ReAct pattern):**
1. Recebe `goal` + contexto acumulado
2. Seleciona a próxima tool baseado no estado atual
3. Executa a tool
4. Avalia: goal atingido? → retorna. Não? → acumula resultado e repete
5. Se `max_steps` atingido → retorna resultado parcial com flag `incomplete: true`

---

## Seção 3: Estado Persistente — `task_memory`

**3 níveis:**

| Nível | Duração | Storage |
|---|---|---|
| `task` | Dentro de um `run_task` | RAM (objeto JS) |
| `session` | Vida do processo MCP | RAM (Map global) |
| `persistent` | Entre reinicializações | `.oshx/memory/*.json` |

**Tool exposta:**
```typescript
task_memory({
  op: 'get' | 'set' | 'clear'
  key: string
  value?: unknown        // só para 'set'
  level?: 'task' | 'session' | 'persistent'  // default: 'session'
})
```

---

## Ordem de Implementação (GSAP)

| # | Mini-peça | Testável por |
|---|---|---|
| 1 | Padronizar resposta de todas as tools | Unit: cada tool retorna `{success, data, error}` |
| 2 | Adicionar `fs_read`, `fs_write`, `fs_edit` | Teste: criar/editar arquivo via MCP |
| 3 | Adicionar `shell_exec` | Teste: rodar `echo hello` via MCP |
| 4 | Implementar `task_memory` (session level) | Teste: set/get em sequência |
| 5 | Implementar `run_task` orchestrator | Teste: goal simples de 2-3 passos |
| 6 | Adicionar persistent memory | Teste: reiniciar MCP, recuperar contexto |
| 7 | Integrar categorias no registry | Teste: listar tools por categoria |

---

## Fora do Escopo (v2)

- IDE (deferred)
- OAuth / auth
- Interface web nova
- Integração com modelos de linguagem externos
