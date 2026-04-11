#!/usr/bin/env bun

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = __dirname;
const RUNTIME_FILE = path.join(ROOT, "runtime-config.json");

interface RuntimeConfig {
  project_path: string;
  storage_path: string;
  framework: "nextjs" | "react" | "personalizado";
  obsidian: boolean;
  created_at: string;
  updated_at: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function defaultRuntimeConfig(): RuntimeConfig {
  const projectPath = ROOT;
  const storagePath = path.join(ROOT, ".oshx");
  const ts = nowIso();
  return {
    project_path: projectPath,
    storage_path: storagePath,
    framework: "personalizado",
    obsidian: false,
    created_at: ts,
    updated_at: ts,
  };
}

function loadRuntimeConfig(): RuntimeConfig {
  if (!fs.existsSync(RUNTIME_FILE)) {
    return defaultRuntimeConfig();
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(RUNTIME_FILE, "utf-8")) as Partial<RuntimeConfig>;
    const base = defaultRuntimeConfig();
    return {
      project_path: path.resolve(parsed.project_path ?? base.project_path),
      storage_path: path.resolve(parsed.storage_path ?? base.storage_path),
      framework: parsed.framework ?? base.framework,
      obsidian: parsed.obsidian ?? base.obsidian,
      created_at: parsed.created_at ?? base.created_at,
      updated_at: parsed.updated_at ?? base.updated_at,
    };
  } catch {
    return defaultRuntimeConfig();
  }
}

function saveRuntimeConfig(cfg: RuntimeConfig): void {
  fs.mkdirSync(path.dirname(RUNTIME_FILE), { recursive: true });
  fs.writeFileSync(RUNTIME_FILE, `${JSON.stringify(cfg, null, 2)}\n`, "utf-8");
}

function parseArg(flag: string, args: string[]): string | undefined {
  const direct = args.find((a) => a.startsWith(`${flag}=`));
  if (direct) return direct.slice(flag.length + 1);
  const idx = args.findIndex((a) => a === flag);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  return undefined;
}

function hasFlag(flag: string, args: string[]): boolean {
  return args.includes(flag);
}

function printHelp(): void {
  console.log(`
OSHX CLI

Usage:
  oshx <command> [options]

Commands:
  start                 Start MCP server (stdio)
  init                  Initialize runtime config and directories
  doctor                Validate runtime configuration and paths
  config show           Show runtime config
  config set            Update runtime config

Options (init/config set):
  --project <path>      Project path
  --storage <path>      Storage path for OSHX data
  --framework <name>    nextjs | react | personalizado
  --obsidian            Enable obsidian docs folder
  --no-obsidian         Disable obsidian docs folder

Examples:
  bun run cli.ts init --project . --storage ./.oshx --framework react
  bun run cli.ts start
  bun run cli.ts doctor
`);
}

function normalizeFramework(value?: string): RuntimeConfig["framework"] {
  const v = (value || "").trim().toLowerCase();
  if (v === "next" || v === "nextjs" || v === "next.js") return "nextjs";
  if (v === "react") return "react";
  return "personalizado";
}

function ensureStructure(cfg: RuntimeConfig): void {
  fs.mkdirSync(cfg.project_path, { recursive: true });
  fs.mkdirSync(cfg.storage_path, { recursive: true });
  fs.mkdirSync(path.join(cfg.project_path, "docs"), { recursive: true });
  fs.mkdirSync(path.join(cfg.project_path, ".oshx", "prompts"), { recursive: true });
  fs.mkdirSync(path.join(cfg.project_path, ".oshx", "handoffs"), { recursive: true });
  if (cfg.obsidian) {
    fs.mkdirSync(path.join(cfg.project_path, "docs", "obsidian"), { recursive: true });
  }
}

async function startMcp(): Promise<void> {
  const { ensureRuntimeSetup } = await import("./src/core/runtime-setup.js");
  const { boot } = await import("./src/core/boot.js");
  const { startMCPServer } = await import("./src/core/server.js");

  await ensureRuntimeSetup();
  await boot();
  await startMCPServer();
}

function runInit(args: string[]): void {
  const current = loadRuntimeConfig();
  const projectPath = path.resolve(parseArg("--project", args) ?? current.project_path);
  const storagePath = path.resolve(parseArg("--storage", args) ?? current.storage_path);
  const framework = normalizeFramework(parseArg("--framework", args) ?? current.framework);

  let obsidian = current.obsidian;
  if (hasFlag("--obsidian", args)) obsidian = true;
  if (hasFlag("--no-obsidian", args)) obsidian = false;

  const next: RuntimeConfig = {
    project_path: projectPath,
    storage_path: storagePath,
    framework,
    obsidian,
    created_at: current.created_at || nowIso(),
    updated_at: nowIso(),
  };

  ensureStructure(next);
  saveRuntimeConfig(next);

  console.log("Runtime initialized successfully.");
  console.log(JSON.stringify(next, null, 2));
}

function runDoctor(): void {
  const cfg = loadRuntimeConfig();
  const checks = [
    ["runtime-config", fs.existsSync(RUNTIME_FILE)],
    ["project_path", fs.existsSync(cfg.project_path)],
    ["storage_path", fs.existsSync(cfg.storage_path)],
    ["docs", fs.existsSync(path.join(cfg.project_path, "docs"))],
    ["oshx prompts", fs.existsSync(path.join(cfg.project_path, ".oshx", "prompts"))],
  ] as const;

  console.log("OSHX Doctor");
  for (const [name, status] of checks) {
    console.log(`- ${name}: ${status ? "ok" : "missing"}`);
  }
}

function showConfig(): void {
  console.log(JSON.stringify(loadRuntimeConfig(), null, 2));
}

function setConfig(args: string[]): void {
  runInit(args);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const sub = args[1];

  if (!command || command === "--help" || command === "-h" || command === "help") {
    printHelp();
    return;
  }

  if (command === "start") {
    await startMcp();
    return;
  }

  if (command === "init") {
    runInit(args.slice(1));
    return;
  }

  if (command === "doctor") {
    runDoctor();
    return;
  }

  if (command === "config" && sub === "show") {
    showConfig();
    return;
  }

  if (command === "config" && sub === "set") {
    setConfig(args.slice(2));
    return;
  }

  printHelp();
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(`Fatal error: ${message}`);
  process.exit(1);
});
