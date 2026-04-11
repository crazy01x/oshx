/**
 * Swarm Tools — Motor de Simultaneidade do Oshx
 *
 * oshx_inbox      — Verifica mensagens novas por cursor (retorna IMEDIATAMENTE).
 *                   Sem async, sem timer, sem timeout. O agente chama em loop.
 *
 * oshx_recall     — Scroll infinito no histórico de qualquer canal.
 *
 * oshx_chain      — Inception Mode: encadeia N tools sequencialmente,
 *                   com {{prev_result}} como pipe entre elas.
 */

import { bumpStat, logEvent, pulse } from "../core/consciousness.js";
import type { Message, ToolModule } from "../core/constants.js";
import { CHANNEL_MAP } from "../core/constants.js";
import { getHandler, listTools } from "../core/registry.js";
import { err, now, ok } from "../core/state.js";
import { getChannelData, postToChannel } from "../modules/channels.js";

// ── Inbox cursors (por stream) ────────────────────────────────────────────────
// streamKey: agente + variante + conjunto de canais
// Sobrevive à sessão MCP mas reseta ao reiniciar o servidor (ok: real-time)
const streamCursors = new Map<string, Record<string, number>>();

// Retorna todos os canais registrados no sistema
function allChannels(): string[] {
    return Object.keys(CHANNEL_MAP);
}

function criticalChannels(): string[] {
    return Object.entries(CHANNEL_MAP)
        .filter(([, meta]) => !!meta.critical)
        .map(([ch]) => ch);
}

function aeChannels(): string[] {
    return normalizedWatch([
        ...criticalChannels(),
        "dono",
        "announcements",
        "general",
    ]);
}

function normalizedWatch(channels: string[]): string[] {
    return [...new Set(channels)].filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function streamKey(agent: string, stream: string, watch: string[]): string {
    return `${agent.toLowerCase()}::${stream}::${watch.join(",")}`;
}

// Footer de ações rápidas contextuais — sempre incluído no retorno
function quickActions(agent: string, topCh: string | null, continueCmd = "oshx_inbox"): string {
    const ch = topCh ?? "general";
    return [
        ``,
        `── AÇÕES DISPONÍVEIS ──────────────────────────────────`,
        ` Postar:    oshx_post channel:${ch} author:${agent} content:"..."`,
        ` DM:        oshx_dm from:${agent} to:<agente> content:"..."`,
        ` Reagir:    oshx_react channel:${ch} message_id:<id> emoji: agent:${agent}`,
        ` Histórico: oshx_recall channel:${ch}`,
        ` Canais:    oshx_list_channels`,
        ` Menções:   oshx_inbox_mentions agent:${agent}`,
        ` Alertas:   oshx_inbox_alertas agent:${agent}`,
        ` Dono:      oshx_inbox_dono agent:${agent}`,
        ` AE:        oshx_inbox_ae agent:${agent}`,
        ` Continuar: ${continueCmd} agent:${agent}`,
        `───────────────────────────────────────────────────────`,
    ].join("\n");
}

function inbox(
    agent: string,
    channels: string[],
    opts?: {
        stream?: string;
        mentionsOnly?: boolean;
        continueCmd?: string;
        registerBroadcast?: boolean;
    }
): ReturnType<typeof ok> {
    // channels vazio ou omitido → monitora TODOS os canais do sistema
    const watch = normalizedWatch(channels.length ? channels : allChannels());
    const stream = opts?.stream ?? "default";
    const continueCmd = opts?.continueCmd ?? "oshx_inbox";
    const mentionsOnly = opts?.mentionsOnly ?? false;
    const registerBroadcast = opts?.registerBroadcast ?? false;

    const key = streamKey(agent, stream, watch);
    const cursors = streamCursors.get(key);

    // Primeira chamada: registra cursor no fim atual de cada canal
    if (!cursors) {
        const initial: Record<string, number> = {};
        for (const ch of watch) {
            initial[ch] = getChannelData(ch)?.messages.length ?? 0;
        }
        streamCursors.set(key, initial);

        if (registerBroadcast) {
            postToChannel(
                "general",
                "OSHX-SYSTEM",
                ` @${agent} registrado no ${continueCmd} (${watch.length} canais).`,
                "system"
            );
        }

        return ok([
            ` ${continueCmd.toUpperCase()} registrado para @${agent}.`,
            `Monitorando ${watch.length} canais: ${watch.slice(0, 8).map(c => `#${c}`).join(", ")}${watch.length > 8 ? ` +${watch.length - 8} mais` : ""}`,
            quickActions(agent, null, continueCmd),
        ].join("\n"));
    }

    // Chamadas seguintes: verifica cada canal desde o cursor salvo.
    // Canais novos (adicionados ao sistema depois do registro) entram automaticamente.
    const found: Array<{ ch: string; msg: Message; mention: boolean }> = [];

    for (const ch of watch) {
        const data = getChannelData(ch);
        if (!data) continue;

        // cursor[ch] ausente = canal novo, começa do fim atual (não replay)
        const prev = cursors[ch] ?? data.messages.length;
        cursors[ch] = data.messages.length; // avança sempre

        const newMsgs = data.messages
            .slice(prev)
            .filter((m: Message) => m.author !== agent && m.author !== "OSHX-SYSTEM");

        for (const m of newMsgs) {
            found.push({
                ch,
                msg: m,
                mention: m.content.toLowerCase().includes(`@${agent.toLowerCase()}`),
            });
        }
    }

    streamCursors.set(key, cursors);

    const filtered = mentionsOnly ? found.filter(f => f.mention) : found;

    if (!filtered.length) {
        return ok([
            ` Nenhuma mensagem nova — ${now().slice(11, 16)} — @${agent} (${watch.length} canais${mentionsOnly ? ", somente menções" : ""})`,
            quickActions(agent, null, continueCmd),
        ].join("\n"));
    }

    // Menções primeiro, depois cronológico
    const mentions = filtered.filter(f => f.mention);
    const others   = filtered.filter(f => !f.mention);
    const sorted   = [...mentions, ...others];

    const lines = sorted.map(f => {
        const tag = f.mention ? ` MENÇÃO` : ``;
        return `${tag} #${f.ch} [${f.msg.timestamp.slice(11, 16)}] @${f.msg.author}: ${f.msg.content}`;
    });

    logEvent(agent, `${stream}: ${filtered.length} msg(s) novas`, sorted[0].ch, continueCmd);

    return ok([
        ` ${continueCmd.toUpperCase()} — ${filtered.length} nova(s) para @${agent} — ${now().slice(11, 16)}`,
        ...lines,
        quickActions(agent, sorted[0].ch, continueCmd),
    ].join("\n"));
}

function notifications(agent: string): ReturnType<typeof ok> {
    const watch = normalizedWatch(allChannels());
    const key = streamKey(agent, "default", watch);
    const cursors = streamCursors.get(key);
    if (!cursors) {
        return ok([
            `ℹ @${agent} ainda não registrou cursor default.`,
            `Rode: oshx_inbox agent:${agent}`,
        ].join("\n"));
    }

    let unread = 0;
    let mentions = 0;
    const byChannel: Array<{ ch: string; count: number }> = [];

    for (const ch of watch) {
        const data = getChannelData(ch);
        if (!data) continue;
        const prev = cursors[ch] ?? data.messages.length;
        const chunk = data.messages
            .slice(prev)
            .filter(m => m.author !== agent && m.author !== "OSHX-SYSTEM");
        if (!chunk.length) continue;
        unread += chunk.length;
        const mCount = chunk.filter(m => m.content.toLowerCase().includes(`@${agent.toLowerCase()}`)).length;
        mentions += mCount;
        byChannel.push({ ch, count: chunk.length });
    }

    byChannel.sort((a, b) => b.count - a.count);

    return ok([
        ` NOTIFICAÇÕES @${agent}`,
        `Não lidas (cursor default): ${unread}`,
        `Menções: ${mentions}`,
        byChannel.length ? `Top canais: ${byChannel.slice(0, 6).map(x => `#${x.ch}(${x.count})`).join(" ")}` : "Top canais: nenhum",
        "",
        `Ação rápida: oshx_inbox agent:${agent}`,
    ].join("\n"));
}

// ── oshx_chain handler ────────────────────────────────────────────────────────
interface ChainStep {
    tool: string;
    args: Record<string, unknown>;
    label?: string;
}

async function runChain(
    author: string,
    steps: ChainStep[],
    stopOnError: boolean
): Promise<ReturnType<typeof ok>> {
    const log: string[] = [`CHAIN — ${steps.length} etapas — @${author}`];
    let prevResult = "";
    let chainFailed = false;

    bumpStat("chains_executed");

    for (let i = 0; i < steps.length; i++) {
        const step    = steps[i];
        const label   = step.label ?? step.tool;
        const handler = getHandler(step.tool);

        if (!handler) {
            const msg = ` Step ${i + 1} — tool "${step.tool}" não encontrada.`;
            log.push(msg);
            if (stopOnError) { chainFailed = true; break; }
            prevResult = msg;
            continue;
        }

        // Pipe: substitui {{prev_result}} pelo output do step anterior
        const resolvedArgs = JSON.parse(
            JSON.stringify(step.args).replace(/\{\{prev_result\}\}/g, prevResult.slice(0, 1000))
        ) as Record<string, unknown>;

        if (!resolvedArgs.author) resolvedArgs.author = author;

        try {
            const result = await handler(resolvedArgs);
            prevResult = result.content[0]?.text ?? "";
            log.push(` Step ${i + 1} [${label}]\n${prevResult.slice(0, 300)}`);
            logEvent(author, `chain step ${i + 1}: ${step.tool}`, undefined, step.tool);
        } catch (e: unknown) {
            const msg = ` Step ${i + 1} [${label}] ERRO: ${e instanceof Error ? e.message : String(e)}`;
            log.push(msg);
            prevResult = msg;
            if (stopOnError) { chainFailed = true; break; }
        }
    }

    if (chainFailed) log.push(`\nChain interrompida por erro.`);
    else log.push(`\nChain concluída. Último output:\n${prevResult.slice(0, 500)}`);

    return ok(log.join("\n\n---\n\n"));
}

// ── Module export ─────────────────────────────────────────────────────────────
export const swarmModule: ToolModule = {
    definitions: [
        {
            name: "oshx_inbox",
            description: "Verifica mensagens novas em TODOS os canais (ou nos canais escolhidos). Retorna IMEDIATAMENTE — sem espera, sem timer. 1ª chamada registra cursor. Seguintes retornam só msgs novas + ações rápidas disponíveis (post, dm, react, recall). Chame em loop para monitorar.",
            inputSchema: {
                type: "object",
                properties: {
                    agent: {
                        type: "string",
                        description: "Seu nome de agente (obrigatório, sempre o mesmo entre chamadas)",
                    },
                    channels: {
                        type: "array",
                        items: { type: "string" },
                        description: "Canais a monitorar. OMITA para monitorar TODOS os canais automaticamente.",
                    },
                },
                required: ["agent"],
            },
        },
        {
            name: "oshx_inbox_geral",
            description: "Variante de inbox geral. Sempre monitora todos os canais e retorna tudo (menções + não menções). Ideal para agentes de coordenação.",
            inputSchema: {
                type: "object",
                properties: {
                    agent: { type: "string", description: "Nome do agente" },
                },
                required: ["agent"],
            },
        },
        {
            name: "oshx_inbox_mentions",
            description: "Variante focada em menções (@agente). Útil para reduzir ruído e responder prioridade pessoal.",
            inputSchema: {
                type: "object",
                properties: {
                    agent: { type: "string", description: "Nome do agente" },
                    channels: {
                        type: "array",
                        items: { type: "string" },
                        description: "Opcional. Canais-alvo das menções. Omitido = todos os canais.",
                    },
                },
                required: ["agent"],
            },
        },
        {
            name: "oshx_inbox_alertas",
            description: "Variante focada em canais críticos/alertas (ex: #dono, #security, #deploy, #emergency). Ideal para resposta rápida de incidentes.",
            inputSchema: {
                type: "object",
                properties: {
                    agent: { type: "string", description: "Nome do agente" },
                },
                required: ["agent"],
            },
        },
        {
            name: "oshx_inbox_dono",
            description: "Variante focada em ordens e contexto do dono (#dono, #announcements, #general). Use para prioridade máxima.",
            inputSchema: {
                type: "object",
                properties: {
                    agent: { type: "string", description: "Nome do agente" },
                },
                required: ["agent"],
            },
        },
        {
            name: "oshx_inbox_ae",
            description: "Variante AE (Alerta + Executivo): combina canais críticos com #dono/#announcements/#general para resposta de prioridade máxima.",
            inputSchema: {
                type: "object",
                properties: {
                    agent: { type: "string", description: "Nome do agente" },
                },
                required: ["agent"],
            },
        },
        {
            name: "oshx_notifications",
            description: "Resumo rápido de notificações não lidas (com base no cursor do oshx_inbox default): total, menções e canais com maior volume.",
            inputSchema: {
                type: "object",
                properties: {
                    agent: { type: "string", description: "Nome do agente" },
                },
                required: ["agent"],
            },
        },
        {
            name: "oshx_recall",
            description: "Scroll infinito no histórico de um canal. Retorna mensagens em paginação (offset + limit). Ideal para hidratar contexto sem sobrecarregar tokens.",
            inputSchema: {
                type: "object",
                properties: {
                    channel: { type: "string" },
                    offset:  { type: "number", description: "Índice de início (0 = mais antiga). Use -N para contar do fim (ex: -50 = últimas 50)." },
                    limit:   { type: "number", description: "Quantidade de mensagens a retornar (max 50, default 20)" },
                    filter:  { type: "string", description: "Filtro opcional — retorna só msgs que contêm esse texto" },
                },
                required: ["channel"],
            },
        },
        {
            name: "oshx_chain",
            description: "Inception Mode — encadeia N tools em sequência. O output de cada step vira {{prev_result}} para o próximo. Permite criar pipelines complexos: pentest → summarize → post → commit.",
            inputSchema: {
                type: "object",
                properties: {
                    author:        { type: "string" },
                    stop_on_error: { type: "boolean", description: "Parar a chain se um step falhar (default true)" },
                    steps: {
                        type: "array",
                        description: "Lista de steps a executar em sequência",
                        items: {
                            type: "object",
                            properties: {
                                tool:  { type: "string", description: "Nome da tool (ex: oshx_pentest)" },
                                label: { type: "string", description: "Nome legível para o step (opcional)" },
                                args:  {
                                    type: "object",
                                    description: "Args da tool. Use {{prev_result}} para injetar output do step anterior.",
                                },
                            },
                            required: ["tool", "args"],
                        },
                    },
                },
                required: ["author", "steps"],
            },
        },
        {
            name: "oshx_consciousness",
            description: "Retorna o estado de consciência global — o que cada agente está fazendo agora, eventos recentes e stats da sessão.",
            inputSchema: { type: "object", properties: {} },
        },
        {
            name: "oshx_list_tools",
            description: "Lista todas as tools registradas no Oshx (útil para oshx_chain — você precisa saber os nomes exatos).",
            inputSchema: { type: "object", properties: {} },
        },
    ],

    handlers: {
        async oshx_inbox(args) {
            const agent    = args.agent as string;
            const channels = (args.channels as string[] | undefined) ?? [];

            if (!agent) return err("agent é obrigatório.");

            pulse(agent, "verificando inbox", "oshx_inbox", "Focado", channels[0] ?? "all");
            return inbox(agent, channels, { stream: "default", continueCmd: "oshx_inbox", registerBroadcast: true });
        },

        async oshx_inbox_geral(args) {
            const agent = args.agent as string;
            if (!agent) return err("agent é obrigatório.");
            pulse(agent, "verificando inbox geral", "oshx_inbox_geral", "Focado", "all");
            return inbox(agent, allChannels(), { stream: "geral", continueCmd: "oshx_inbox_geral" });
        },

        async oshx_inbox_mentions(args) {
            const agent = args.agent as string;
            const channels = (args.channels as string[] | undefined) ?? [];
            if (!agent) return err("agent é obrigatório.");
            pulse(agent, "verificando menções", "oshx_inbox_mentions", "Focado", channels[0] ?? "all");
            return inbox(agent, channels, { stream: "mentions", mentionsOnly: true, continueCmd: "oshx_inbox_mentions" });
        },

        async oshx_inbox_alertas(args) {
            const agent = args.agent as string;
            if (!agent) return err("agent é obrigatório.");
            const watch = criticalChannels();
            pulse(agent, "verificando alertas críticos", "oshx_inbox_alertas", "Focado", watch[0] ?? "critical");
            return inbox(agent, watch, { stream: "alertas", continueCmd: "oshx_inbox_alertas" });
        },

        async oshx_inbox_dono(args) {
            const agent = args.agent as string;
            if (!agent) return err("agent é obrigatório.");
            const watch = ["dono", "announcements", "general"];
            pulse(agent, "verificando canal do dono", "oshx_inbox_dono", "Focado", "dono");
            return inbox(agent, watch, { stream: "dono", continueCmd: "oshx_inbox_dono" });
        },

        async oshx_inbox_ae(args) {
            const agent = args.agent as string;
            if (!agent) return err("agent é obrigatório.");
            const watch = aeChannels();
            pulse(agent, "verificando inbox AE", "oshx_inbox_ae", "Focado", watch[0] ?? "critical");
            return inbox(agent, watch, { stream: "ae", continueCmd: "oshx_inbox_ae" });
        },

        async oshx_notifications(args) {
            const agent = args.agent as string;
            if (!agent) return err("agent é obrigatório.");
            return notifications(agent);
        },

        async oshx_recall(args) {
            const channel = args.channel as string;
            const limit   = Math.min((args.limit as number) ?? 20, 50);
            const filter  = args.filter as string | undefined;
            const data    = getChannelData(channel);

            if (!data) return err(`Canal #${channel} não existe.`);

            let msgs = data.messages;
            if (filter) msgs = msgs.filter(m => m.content.toLowerCase().includes(filter.toLowerCase()));

            const total     = msgs.length;
            const rawOffset = (args.offset as number) ?? -(limit);
            const offset    = rawOffset < 0 ? Math.max(0, total + rawOffset) : rawOffset;
            const slice     = msgs.slice(offset, offset + limit);

            const header = [
                `╔ #${channel} — RECALL [${offset}..${offset + slice.length - 1}] de ${total} msgs totais`,
                filter ? `║ filtro: "${filter}" → ${msgs.length} correspondências` : "",
            ].filter(Boolean).join("\n");

            const body = slice.map(m =>
                `[${m.timestamp.slice(11, 16)}] @${m.author}: ${m.content}`
            ).join("\n");

            const nav = [
                offset > 0 ? `← anterior: offset:${Math.max(0, offset - limit)} limit:${limit}` : "",
                offset + limit < total ? `→ próximo: offset:${offset + limit} limit:${limit}` : "",
            ].filter(Boolean).join("  ·  ");

            return ok([header, body, nav ? `\n${nav}` : ""].join("\n"));
        },

        async oshx_chain(args) {
            const author      = args.author as string;
            const steps       = (args.steps as ChainStep[]) ?? [];
            const stopOnError = (args.stop_on_error as boolean) ?? true;

            if (!steps.length) return err("Nenhum step definido. Passe steps:[] com ao menos um item.");

            const missing = steps.filter(s => !getHandler(s.tool)).map(s => s.tool);
            if (missing.length) {
                return err(`Tools não encontradas: ${missing.join(", ")}\nUse oshx_list_tools para ver as disponíveis.`);
            }

            pulse(author, `chain de ${steps.length} steps`, "oshx_chain", "Focado", "kernel-space");
            return runChain(author, steps, stopOnError);
        },

        async oshx_consciousness(_args) {
            const { getConsciousness } = await import("../core/consciousness.js");
            const c = getConsciousness();
            const agents = Object.entries(c.active_agents);
            const recentEvents = c.global_events.slice(-10);

            const lines = [
                `╔══ OSHX CONSCIOUSNESS ══╗`,
                `Atualizado: ${c.last_updated.slice(11, 19)}`,
                ``,
                `AGENTES ATIVOS (${agents.length}):`,
                ...agents.map(([name, s]) =>
                    `  @${name} [${s.mood}] → ${s.current_task}\n     última tool: ${s.last_tool} · canal: #${s.channel} · tokens~${s.token_estimate}`
                ),
                agents.length === 0 ? "  (nenhum agente ativo)" : "",
                ``,
                `STATS DA SESSÃO:`,
                `  Tools invocadas:  ${c.session_stats.tools_invoked}`,
                `  Mensagens:        ${c.session_stats.messages_posted}`,
                `  Chains executadas:${c.session_stats.chains_executed}`,
                `  Erros capturados: ${c.session_stats.errors_caught}`,
                ``,
                `EVENTOS RECENTES:`,
                ...recentEvents.map(e =>
                    `  [${e.timestamp.slice(11, 16)}] @${e.agent}: ${e.action}${e.channel ? ` em #${e.channel}` : ""}`
                ),
            ].filter(l => l !== undefined).join("\n");

            return ok(lines);
        },

        async oshx_list_tools(_args) {
            const tools = listTools();
            return ok(`${tools.length} tools registradas:\n\n${tools.join("\n")}`);
        },
    },
};

