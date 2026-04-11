import fs from "fs";
import path from "path";
import type { ToolModule } from "../core/constants.js";
import { listTools } from "../core/registry.js";
import { now, ok } from "../core/state.js";
import { postToChannel } from "../modules/channels.js";

const ROOT = process.cwd();
const RUNTIME_FILE = path.join(ROOT, "runtime-config.json");
const POLICY_FILE = path.join(ROOT, "agent-policy.json");
const BROADCAST_CHANNELS = ["announcements", "dono", "general"] as const;

type Framework = "nextjs" | "react" | "personalizado";
type OperationMode = "normal" | "continuous" | "continuous_strict";

interface RuntimeConfig {
  project_path?: string;
  storage_path?: string;
  framework?: Framework;
  obsidian?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AgentPolicy {
  mode: OperationMode;
  owner_interrupt_only_critical: boolean;
  min_loop_seconds: number;
  require_mcp_tools: boolean;
  updated_at: string;
}

const DEFAULT_POLICY: AgentPolicy = {
  mode: "continuous",
  owner_interrupt_only_critical: true,
  min_loop_seconds: 2,
  require_mcp_tools: true,
  updated_at: now(),
};

function ensureDir(target: string): string {
  const resolved = path.resolve(target || ROOT);
  fs.mkdirSync(resolved, { recursive: true });
  return resolved;
}

function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

function readRuntimeConfig(): RuntimeConfig {
  return readJson<RuntimeConfig>(RUNTIME_FILE, {});
}

function writeRuntimeConfig(patch: Partial<RuntimeConfig>): RuntimeConfig {
  const base = readRuntimeConfig();
  const next: RuntimeConfig = { ...base, ...patch, updated_at: now() };
  writeJson(RUNTIME_FILE, next);
  return next;
}

function readPolicy(): AgentPolicy {
  const raw = readJson<Partial<AgentPolicy>>(POLICY_FILE, {});
  return {
    mode: raw.mode ?? DEFAULT_POLICY.mode,
    owner_interrupt_only_critical: raw.owner_interrupt_only_critical ?? DEFAULT_POLICY.owner_interrupt_only_critical,
    min_loop_seconds: raw.min_loop_seconds ?? DEFAULT_POLICY.min_loop_seconds,
    require_mcp_tools: raw.require_mcp_tools ?? DEFAULT_POLICY.require_mcp_tools,
    updated_at: raw.updated_at ?? DEFAULT_POLICY.updated_at,
  };
}

function writePolicy(patch: Partial<AgentPolicy>): AgentPolicy {
  const next: AgentPolicy = { ...readPolicy(), ...patch, updated_at: now() };
  writeJson(POLICY_FILE, next);
  return next;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asMode(value: unknown): OperationMode | undefined {
  const normalized = asString(value)?.toLowerCase();
  if (normalized === "normal" || normalized === "continuous" || normalized === "continuous_strict") {
    return normalized;
  }
  return undefined;
}

function asFramework(value: unknown): Framework | undefined {
  const normalized = asString(value)?.toLowerCase();
  if (normalized === "nextjs" || normalized === "react" || normalized === "personalizado") {
    return normalized;
  }
  return undefined;
}

function asPositiveInt(value: unknown): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return Math.max(1, Math.floor(value));
}

function broadcast(author: string, message: string): void {
  for (const channel of BROADCAST_CHANNELS) {
    postToChannel(channel, author, message, "system");
  }
}

export const workspaceModule: ToolModule = {
  definitions: [
    {
      name: "oshx_get_project_context",
      description: "Retorna contexto de produção do MCP (projeto alvo, storage, framework e política operacional).",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "oshx_set_project_context",
      description: "Atualiza contexto de execução (project_path, storage_path, framework, obsidian).",
      inputSchema: {
        type: "object",
        properties: {
          project_path: { type: "string" },
          storage_path: { type: "string" },
          framework: { type: "string", description: "nextjs | react | personalizado" },
          obsidian: { type: "boolean" },
        },
      },
    },
    {
      name: "oshx_init_project_system",
      description: "Cria estrutura operacional no projeto (.oshx, docs, prompts e handoff; docs/obsidian opcional).",
      inputSchema: {
        type: "object",
        properties: {
          project_path: { type: "string" },
          obsidian: { type: "boolean" },
        },
      },
    },
    {
      name: "oshx_healthcheck",
      description: "Diagnóstico rápido do MCP em produção: runtime-config, policy, storage e total de tools registradas.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "oshx_catalog_systems",
      description: "Exibe catálogo operacional por sistemas (identidade, comunicação, terminal, segurança, swarm e governança).",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "oshx_broadcast_mode_continuo",
      description: "Publica regra de operação contínua para agentes (MCP-first, ciclo sem ociosidade e comunicação objetiva).",
      inputSchema: {
        type: "object",
        properties: {
          author: { type: "string" },
          strict: { type: "boolean", description: "Quando true, reduz interrupções humanas a casos críticos" },
        },
        required: ["author"],
      },
    },
    {
      name: "oshx_archive_history",
      description: "Arquiva snapshot de runtime e policy no storage do projeto para retenção operacional e auditoria.",
      inputSchema: {
        type: "object",
        properties: {
          author: { type: "string" },
          label: { type: "string" },
        },
        required: ["author"],
      },
    },
    {
      name: "oshx_set_agent_policy",
      description: "Define política operacional dos agentes (mode, loop mínimo, MCP obrigatório).",
      inputSchema: {
        type: "object",
        properties: {
          mode: { type: "string", description: "normal | continuous | continuous_strict" },
          owner_interrupt_only_critical: { type: "boolean" },
          min_loop_seconds: { type: "number" },
          require_mcp_tools: { type: "boolean" },
        },
      },
    },
    {
      name: "oshx_get_agent_policy",
      description: "Retorna a política operacional ativa dos agentes.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "oshx_kickoff_continuous_cycle",
      description: "Publica kickoff de rotina contínua: inbox, task, execução, validação e status curto.",
      inputSchema: {
        type: "object",
        properties: {
          author: { type: "string" },
          strict: { type: "boolean" },
        },
        required: ["author"],
      },
    },
  ],

  handlers: {
    async oshx_get_project_context() {
      return ok(JSON.stringify({ root: ROOT, runtime: readRuntimeConfig(), policy: readPolicy() }, null, 2));
    },

    async oshx_set_project_context(args) {
      const projectPath = asString(args.project_path);
      const storagePath = asString(args.storage_path);
      const framework = asFramework(args.framework);
      const obsidian = asBoolean(args.obsidian);

      const cfg = writeRuntimeConfig({
        ...(projectPath ? { project_path: ensureDir(projectPath) } : {}),
        ...(storagePath ? { storage_path: ensureDir(storagePath) } : {}),
        ...(framework ? { framework } : {}),
        ...(typeof obsidian === "boolean" ? { obsidian } : {}),
      });

      if (cfg.storage_path) process.env.OSHX_ROOT = cfg.storage_path;
      if (cfg.project_path) process.env.OSHX_PROJECT_PATH = cfg.project_path;

      return ok(`Contexto atualizado com sucesso.\n${JSON.stringify(cfg, null, 2)}`);
    },

    async oshx_init_project_system(args) {
      const cfg = readRuntimeConfig();
      const projectPath = ensureDir(asString(args.project_path) ?? cfg.project_path ?? ROOT);
      const useObsidian = asBoolean(args.obsidian) ?? Boolean(cfg.obsidian);
      const storagePath = ensureDir(cfg.storage_path ?? path.join(projectPath, ".oshx"));

      const dirs = [
        storagePath,
        path.join(storagePath, "archives"),
        path.join(projectPath, ".oshx", "handoffs"),
        path.join(projectPath, ".oshx", "prompts"),
        path.join(projectPath, "docs"),
      ];

      if (useObsidian) dirs.push(path.join(projectPath, "docs", "obsidian"));
      for (const dir of dirs) fs.mkdirSync(dir, { recursive: true });

      const opGuide = path.join(projectPath, ".oshx", "prompts", "continuous-operation.md");
      if (!fs.existsSync(opGuide)) {
        fs.writeFileSync(
          opGuide,
          [
            "# OSHX Continuous Operation Mode",
            "",
            "- Operar em ciclo contínuo: inbox -> executar -> validar -> próximo passo.",
            "- MCP-first: evitar execução fora do MCP.",
            "- Escalar interação humana apenas para bloqueio crítico, risco operacional ou decisão de negócio.",
          ].join("\n"),
          "utf-8"
        );
      }

      writeRuntimeConfig({ project_path: projectPath, storage_path: storagePath, obsidian: useObsidian });
      return ok(`Sistema do projeto inicializado em ${projectPath}`);
    },

    async oshx_healthcheck() {
      const runtime = readRuntimeConfig();
      const policy = readPolicy();
      const checks = [
        `runtime-config: ${fs.existsSync(RUNTIME_FILE) ? "ok" : "missing"}`,
        `agent-policy: ${fs.existsSync(POLICY_FILE) ? "ok" : "missing"}`,
        `project_path: ${runtime.project_path ? "ok" : "missing"}`,
        `storage_path: ${runtime.storage_path ? "ok" : "missing"}`,
        `mode: ${policy.mode}`,
        `tools registradas: ${listTools().length}`,
      ];
      return ok(`OSHX Healthcheck\n${checks.map(v => `- ${v}`).join("\n")}`);
    },

    async oshx_catalog_systems() {
      const tools = listTools();
      const groups: Record<string, number> = {
        identidade: tools.filter(t => /boot|profile|mood|tutorial|status|briefing|shutdown/.test(t)).length,
        comunicacao: tools.filter(t => /post|read|dm|react|redirect|pin|channel/.test(t)).length,
        terminal: tools.filter(t => /exec|send_input|kill_session|run_script|create_script/.test(t)).length,
        seguranca: tools.filter(t => /dep_check|pentest|probe|resilience|dynamic/.test(t)).length,
        swarm: tools.filter(t => /inbox|chain|consciousness|notifications|recall/.test(t)).length,
        governanca: tools.filter(t => /propose|vote|resolve|leaderboard|award|promote/.test(t)).length,
        workspace: tools.filter(t => /project_context|project_system|agent_policy|continuous_cycle|healthcheck|catalog_systems|archive_history/.test(t)).length,
      };

      return ok([
        "Catalogo de Sistemas OSHX",
        ...Object.entries(groups).map(([name, count]) => `- ${name}: ${count} tools`),
        `- total: ${tools.length} tools`,
      ].join("\n"));
    },

    async oshx_broadcast_mode_continuo(args) {
      const author = asString(args.author) ?? "OSHX-SYSTEM";
      const strict = Boolean(args.strict);
      const message = strict
        ? "Modo continuo estrito: operar via MCP em ciclo continuo e interromper interacao humana apenas em bloqueio critico, risco operacional ou decisao de negocio."
        : "Modo continuo: operar via MCP em ciclo continuo com atualizacoes objetivas nos canais de operacao.";

      broadcast(author, message);
      return ok("Comunicado publicado em announcements, dono e general.");
    },

    async oshx_archive_history(args) {
      const author = asString(args.author) ?? "OSHX-SYSTEM";
      const runtime = readRuntimeConfig();
      const policy = readPolicy();
      const storage = ensureDir(runtime.storage_path ?? path.join(ROOT, ".oshx"));
      const archiveDir = ensureDir(path.join(storage, "archives"));
      const label = asString(args.label) ?? "snapshot";
      const stamp = now().replace(/[:.]/g, "-");
      const out = path.join(archiveDir, `${label}-${stamp}.json`);

      writeJson(out, { at: now(), by: author, runtime, policy });
      postToChannel("docs", author, `Archive gerado: ${out}`);
      return ok(`Snapshot salvo em ${out}`);
    },

    async oshx_set_agent_policy(args) {
      const policy = writePolicy({
        ...(asMode(args.mode) ? { mode: asMode(args.mode)! } : {}),
        ...(typeof args.owner_interrupt_only_critical === "boolean"
          ? { owner_interrupt_only_critical: args.owner_interrupt_only_critical }
          : {}),
        ...(asPositiveInt(args.min_loop_seconds) ? { min_loop_seconds: asPositiveInt(args.min_loop_seconds)! } : {}),
        ...(typeof args.require_mcp_tools === "boolean" ? { require_mcp_tools: args.require_mcp_tools } : {}),
      });

      return ok(`Politica operacional atualizada.\n${JSON.stringify(policy, null, 2)}`);
    },

    async oshx_get_agent_policy() {
      return ok(JSON.stringify(readPolicy(), null, 2));
    },

    async oshx_kickoff_continuous_cycle(args) {
      const author = asString(args.author) ?? "OSHX-SYSTEM";
      const strict = Boolean(args.strict);

      const lines = [
        "Kickoff de ciclo continuo:",
        "1) oshx_inbox ou variantes",
        "2) oshx_task_list",
        "3) execucao (terminal, browser, git)",
        "4) validacao",
        "5) oshx_post com status curto",
        "6) repetir sem ociosidade",
      ];

      if (strict) {
        lines.push("Modo estrito: interromper interacao humana apenas em bloqueio critico, risco operacional ou decisao de negocio.");
      }

      const message = lines.join("\n");
      postToChannel("announcements", author, message, "system");
      postToChannel("standups", author, message, "system");
      return ok("Kickoff continuo publicado em announcements e standups.");
    },
  },
};
