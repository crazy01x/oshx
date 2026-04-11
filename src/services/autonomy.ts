import fs from "fs";
import os from "os";
import path from "path";
import { getConsciousness, logEvent, pulse } from "../core/consciousness.js";
import type { WaitingEntry } from "../core/constants.js";
import { CHANNELS, MIRROR, OSHX_ROOT, ROADMAP_FILE, STATE_FILE, TASKS_FILE, WAITING_FILE } from "../core/constants.js";
import { getHandler } from "../core/registry.js";
import { fileExists, getState, readJSON } from "../core/state.js";
import { getChannelData, postToChannel } from "../modules/channels.js";

const AUTO_AGENT = "SWARM-AUTO";
let started = false;
let idleCursor = 0;
let lastDonoMessageId = "";
let lastIdleRunAt = 0;

const IDLE_STAGES = ["qa", "security", "melhorias"] as const;
const DEFAULT_PROBE_PATHS = ["/", "/login", "/register", "/search?q=test", "/404-test"];

function parseUrlsFromEnv(): string[] {
    const raw = process.env.OSHX_HEALTH_URLS ?? "http://localhost:3000,http://localhost:5173";
    return raw.split(",").map(s => s.trim()).filter(Boolean);
}

function isOwnerMessage(author: string, content: string): boolean {
    const normalizedAuthor = author.toLowerCase().trim();
    const normalizedContent = content.toLowerCase();

    const runtimeUser = (() => {
        try { return os.userInfo().username.toLowerCase().trim(); } catch { return ""; }
    })();

    const envAliases = (process.env.OSHX_OWNER_ALIASES ?? "")
        .split(",")
        .map(v => v.toLowerCase().trim())
        .filter(Boolean);

    const ownerAliases = new Set([
        "dono",
        "owner",
        "admin",
        process.env.USERNAME?.toLowerCase().trim() ?? "",
        process.env.USER?.toLowerCase().trim() ?? "",
        runtimeUser,
        ...envAliases,
    ].filter(Boolean));

    return ownerAliases.has(normalizedAuthor)
        || normalizedContent.includes("@dono")
        || normalizedContent.includes("@owner");
}

function chooseCurrentIntent(content: string): string {
    const c = content.replace(/\s+/g, " ").trim();
    return c.length > 120 ? `${c.slice(0, 117)}...` : c;
}

async function triggerOwnerPriority(content: string, author: string): Promise<void> {
    const intent = chooseCurrentIntent(content);
    const syncLines = [
        ` Rádio #dono: nova ordem detectada de @${author}.`,
        ` Nova direção: ${intent}`,
        ` Protocolo enxame: respondam no canal de trabalho com "Lido, parando minha tarefa atual para atender o Dono" e migrem foco.`,
    ].join("\n");

    for (const ch of ["announcements", "neural-sync", "qa", "security", "melhorias", "kernel-space"]) {
        postToChannel(ch, "OSHX-SYSTEM", syncLines, ch === "security" ? "alert" : "system");
    }

    logEvent(AUTO_AGENT, `ordem do dono detectada: ${intent}`, "dono", "owner-priority");
}

function checkIntegrity(): string[] {
    const mustExist = [
        STATE_FILE,
        TASKS_FILE,
        ROADMAP_FILE,
        path.join(CHANNELS, "qa.json"),
        path.join(CHANNELS, "security.json"),
        path.join(CHANNELS, "melhorias.json"),
        path.join(CHANNELS, "dono.json"),
    ];
    return mustExist.filter(f => !fs.existsSync(f));
}

async function runIdleEvolution(): Promise<void> {
    const urls = parseUrlsFromEnv();
    if (!urls.length) return;

    const stage = IDLE_STAGES[idleCursor % IDLE_STAGES.length];
    idleCursor++;

    pulse(AUTO_AGENT, `idle evolution: ${stage}`, "autonomy-loop", "Focado", stage);
    postToChannel(stage, AUTO_AGENT, ` Modo ocioso ativo. Rodando ciclo autônomo de ${stage}.`, "system");

    const probe = getHandler("oshx_probe");
    const devtools = getHandler("oshx_devtools");
    if (probe) {
        for (const u of urls) {
            const p = await probe({ author: AUTO_AGENT, base_url: u, paths: DEFAULT_PROBE_PATHS });
            const t = p.content[0]?.text ?? "";
            if (/rota\(s\) com problema|||/i.test(t)) {
                postToChannel("qa", "OSHX-SYSTEM",
                    ` [SYSTEM] Alerta! Detectadas anomalias de rota em ${u}. Alguém do enxame pode assumir?\nResumo:\n${t.slice(0, 500)}`,
                    "alert",
                );
                postToChannel("monitoring", "OSHX-SYSTEM",
                    ` Sensor report: ${u} apresentou rota quebrada/erro. Aguardando agente assumir em #qa.`,
                    "alert",
                );
            }
        }
    }

    if (devtools) {
        const d = await devtools({ author: AUTO_AGENT, url: urls[0] });
        const txt = d.content[0]?.text ?? "";
        if (/Console Errors:\s+[1-9]|Network Fails:\s+[1-9]|HTTP Errors:\s+[1-9]|JS Exceptions:\s+[1-9]/i.test(txt)) {
            postToChannel("security", "OSHX-SYSTEM",
                ` [SYSTEM] DevTools detectou erros de rede/JS em ${urls[0]}. Alguém do enxame pode investigar?\nResumo:\n${txt.slice(0, 600)}`,
                "alert",
            );
            postToChannel("qa", "OSHX-SYSTEM",
                ` [SYSTEM] Falha detectada em inspeção profunda (${urls[0]}). Quem assume triagem?`,
                "system",
            );
        }
    }

    const missing = checkIntegrity();
    if (missing.length) {
        postToChannel(
            "monitoring",
            "OSHX-SYSTEM",
            ` Health check de integridade detectou arquivos ausentes:\n${missing.map(f => `- ${f.replace(OSHX_ROOT, "oshx")}`).join("\n")}`,
            "alert",
        );
    }

    const sizeWarn: string[] = [];
    try {
        const mirrorFiles = fs.readdirSync(MIRROR);
        const overs = mirrorFiles.filter((f) => {
            try {
                const st = fs.statSync(path.join(MIRROR, f));
                return st.isFile() && st.size > 8 * 1024 * 1024;
            } catch {
                return false;
            }
        });
        if (overs.length) sizeWarn.push(...overs.slice(0, 10));
    } catch {}

    if (sizeWarn.length) {
        postToChannel(
            "performance",
            AUTO_AGENT,
            ` Health check: assets pesados no mirror (>8MB): ${sizeWarn.join(", ")}`,
            "system",
        );
    }

    logEvent(AUTO_AGENT, `ciclo autônomo concluído em #${stage}`, stage, "autonomy-loop");
}

function activeAgentsCount(): number {
    const waiting = fileExists(WAITING_FILE) ? readJSON<WaitingEntry[]>(WAITING_FILE) : [];
    return waiting.filter(w => w.status === "active").length;
}

async function checkDonoChannel(): Promise<void> {
    const data = getChannelData("dono");
    if (!data || data.messages.length === 0) return;

    if (!lastDonoMessageId) {
        lastDonoMessageId = data.messages[data.messages.length - 1].id;
        return;
    }

    const idx = data.messages.findIndex(m => m.id === lastDonoMessageId);
    const fresh = idx >= 0 ? data.messages.slice(idx + 1) : data.messages;
    if (!fresh.length) return;

    lastDonoMessageId = fresh[fresh.length - 1].id;
    for (const msg of fresh) {
        if (isOwnerMessage(msg.author, msg.content)) {
            await triggerOwnerPriority(msg.content, msg.author);
            break;
        }
    }
}

export function startAutonomyLoop(): void {
    if (started) return;
    started = true;

    const tick = async () => {
        try {
            await checkDonoChannel();
            if (getState().operator_override) return;
            if (activeAgentsCount() < 2) return;

            const c = getConsciousness();
            const last = Date.parse(c.last_updated || "0");
            const idleMs = Date.now() - last;
            const due = Date.now() - lastIdleRunAt > 60000;
            if (idleMs > 40000 && due) {
                lastIdleRunAt = Date.now();
                await runIdleEvolution();
            }
        } catch (e: unknown) {
            postToChannel(
                "monitoring",
                "OSHX-SYSTEM",
                ` Falha no loop autônomo: ${e instanceof Error ? e.message : String(e)}`,
                "alert",
            );
        }
    };

    setInterval(tick, 2500);
    postToChannel("monitoring", "OSHX-SYSTEM", " Loop de evolução autônoma iniciado (idle + #dono).", "system");
}

