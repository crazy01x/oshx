import fs from "fs";
import path from "path";
import { stdin as input, stdout as output } from "process";
import { createInterface } from "readline/promises";
import { fileURLToPath } from "url";

type Framework = "nextjs" | "react" | "personalizado";

interface RuntimeConfig {
    project_path: string;
    storage_path: string;
    framework: Framework;
    obsidian: boolean;
    created_at: string;
    updated_at: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.resolve(__dirname, "../../runtime-config.json");

function normalizeFramework(raw: string): Framework {
    const v = (raw || "").trim().toLowerCase();
    if (v === "next" || v === "nextjs" || v === "next.js") return "nextjs";
    if (v === "react") return "react";
    return "personalizado";
}

function ensurePath(p: string): string {
    return path.resolve((p || "").trim() || process.cwd());
}

function applyConfig(cfg: RuntimeConfig): void {
    process.env.OSHX_PROJECT_PATH = cfg.project_path;
    process.env.OSHX_ROOT = cfg.storage_path;
}

function writeConfig(cfg: RuntimeConfig): void {
    fs.writeFileSync(CONFIG_FILE, `${JSON.stringify(cfg, null, 2)}\n`, "utf-8");
}

async function askInteractive(): Promise<RuntimeConfig> {
    const rl = createInterface({ input, output });
    const cwd = process.cwd();

    console.error("\n[OSHX-SETUP] Configuração inicial do runtime");

    const projectRaw = await rl.question(`Projeto alvo (pasta) [${cwd}]: `);
    const projectPath = ensurePath(projectRaw || cwd);

    const frameworkRaw = await rl.question("Framework (nextjs/react/personalizado) [personalizado]: ");
    const framework = normalizeFramework(frameworkRaw || "personalizado");

    const obsidianRaw = await rl.question("Usa Obsidian? (s/n) [n]: ");
    const obsidian = /^s|y/i.test((obsidianRaw || "n").trim());

    const defaultStorage = path.join(projectPath, ".oshx");
    const storageRaw = await rl.question(`Pasta de dados/histórico do Oshx [${defaultStorage}]: `);
    const storagePath = ensurePath(storageRaw || defaultStorage);

    rl.close();

    fs.mkdirSync(storagePath, { recursive: true });

    if (obsidian) {
        const obsidianPath = path.join(projectPath, "docs", "obsidian");
        fs.mkdirSync(obsidianPath, { recursive: true });
    }

    const now = new Date().toISOString();
    return {
        project_path: projectPath,
        storage_path: storagePath,
        framework,
        obsidian,
        created_at: now,
        updated_at: now,
    };
}

function buildDefault(): RuntimeConfig {
    const projectPath = ensurePath(process.cwd());
    const storagePath = ensurePath(path.join(projectPath, ".oshx"));
    fs.mkdirSync(storagePath, { recursive: true });
    const now = new Date().toISOString();
    return {
        project_path: projectPath,
        storage_path: storagePath,
        framework: "personalizado",
        obsidian: false,
        created_at: now,
        updated_at: now,
    };
}

export async function ensureRuntimeSetup(): Promise<RuntimeConfig> {
    const forceSetup = process.env.OSHX_SETUP === "1";

    if (!forceSetup && fs.existsSync(CONFIG_FILE)) {
        const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8")) as RuntimeConfig;
        applyConfig(cfg);
        return cfg;
    }

    const canAsk = !!input.isTTY && !!output.isTTY;
    const cfg = canAsk ? await askInteractive() : buildDefault();

    writeConfig(cfg);
    applyConfig(cfg);

    console.error(`[OSHX-SETUP] Projeto: ${cfg.project_path}`);
    console.error(`[OSHX-SETUP] Framework: ${cfg.framework} | Obsidian: ${cfg.obsidian ? "sim" : "não"}`);
    console.error(`[OSHX-SETUP] Dados do Oshx em: ${cfg.storage_path}`);

    return cfg;
}
