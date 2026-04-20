import path from "path";
import fs from "fs";
import type { ToolModule } from "../core/constants.js";
import { VAULT } from "../core/constants.js";
import { jsonOk, jsonErr, uid, now, readJSON, writeJSON, fileExists } from "../core/state.js";

// ── DM vault helpers ──────────────────────────────────────────────────────────

interface AgentDmEntry {
    id: string;
    from: string;
    to: string;
    content: string;
    request_id?: string;
    is_response: boolean;
    timestamp: string;
}

function dmFilePath(from: string, to: string): string {
    // Normalized alphabetically so the same file is used regardless of direction
    const sorted = [from.toLowerCase(), to.toLowerCase()].sort();
    return path.join(VAULT, `agent_dm_${sorted[0]}_${sorted[1]}.json`);
}

function readDmThread(filePath: string): AgentDmEntry[] {
    return fileExists(filePath) ? readJSON<AgentDmEntry[]>(filePath) : [];
}

function appendDmEntry(filePath: string, entry: AgentDmEntry): void {
    const entries = readDmThread(filePath);
    entries.push(entry);
    writeJSON(filePath, entries);
}

// ── Module ────────────────────────────────────────────────────────────────────

export const agentModule: ToolModule = {
    definitions: [
        {
            name: "oshx_agent_dm",
            description: "Envia uma mensagem direta (DM) para outro agente com suporte a request_id para coordenação agente-agente. Armazenada no vault (privado). O agente destinatário pode ler com oshx_read_dm. Para responder a uma oshx_agent_call, inclua o mesmo request_id — o agente chamador detectará automaticamente. Use para comunicação direta agente-agente sem precisar de canais públicos.",
            inputSchema: {
                type: "object",
                properties: {
                    from: { type: "string", description: "Seu nome de agente" },
                    to: { type: "string", description: "Nome do agente destinatário" },
                    content: { type: "string", description: "Conteúdo da mensagem ou resposta" },
                    request_id: { type: "string", description: "ID da request (obrigatório para responder a oshx_agent_call)" },
                },
                required: ["from", "to", "content"],
            },
        },
        {
            name: "oshx_agent_call",
            description: "Chama outro agente e aguarda sua resposta dentro do MCP (sem escapar do loop). Posta um task request no vault DM do agente alvo com um request_id único. Fica em loop interno aguardando a resposta (até timeout_ms). O agente chamado usa oshx_agent_dm com o mesmo request_id para responder. timeout_ms padrão: 30000 (30s). Intervalo de polling: 500ms.",
            inputSchema: {
                type: "object",
                properties: {
                    from: { type: "string", description: "Seu nome de agente" },
                    to: { type: "string", description: "Nome do agente a chamar" },
                    task: { type: "string", description: "Tarefa/pergunta para o agente" },
                    timeout_ms: { type: "number", description: "Timeout em ms (padrão: 30000)" },
                },
                required: ["from", "to", "task"],
            },
        },
    ],

    handlers: {
        async oshx_agent_dm(args) {
            const from = args.from as string;
            const to = args.to as string;
            const content = args.content as string;
            const requestId = args.request_id as string | undefined;

            if (!fs.existsSync(VAULT)) {
                fs.mkdirSync(VAULT, { recursive: true });
            }

            const filePath = dmFilePath(from, to);
            const entry: AgentDmEntry = {
                id: uid(),
                from,
                to,
                content,
                request_id: requestId,
                is_response: !!requestId,
                timestamp: now(),
            };

            try {
                appendDmEntry(filePath, entry);
                return jsonOk({
                    from,
                    to,
                    sent: true,
                    request_id: requestId,
                    message_id: entry.id,
                    at: entry.timestamp,
                });
            } catch (e) {
                return jsonErr(`Falha ao enviar DM: ${(e as Error).message}`);
            }
        },

        async oshx_agent_call(args) {
            const from = args.from as string;
            const to = args.to as string;
            const task = args.task as string;
            const timeoutMs = (args.timeout_ms as number | undefined) ?? 30000;

            const requestId = uid();
            const filePath = dmFilePath(from, to);
            const startedAt = Date.now();

            if (!fs.existsSync(VAULT)) {
                fs.mkdirSync(VAULT, { recursive: true });
            }

            // Post the task request
            const taskEntry: AgentDmEntry = {
                id: uid(),
                from,
                to,
                content: task,
                request_id: requestId,
                is_response: false,
                timestamp: now(),
            };

            try {
                appendDmEntry(filePath, taskEntry);
            } catch (e) {
                return jsonErr(`Falha ao postar task: ${(e as Error).message}`);
            }

            // Poll for response
            const pollInterval = 500;

            while (Date.now() - startedAt < timeoutMs) {
                await new Promise(r => setTimeout(r, pollInterval));

                const entries = readDmThread(filePath);
                const response = entries.find(
                    e => e.request_id === requestId && e.is_response && e.from === to
                );

                if (response) {
                    return jsonOk({
                        request_id: requestId,
                        from,
                        to,
                        task,
                        response: response.content,
                        elapsed_ms: Date.now() - startedAt,
                    });
                }
            }

            return jsonErr(`Timeout: @${to} não respondeu em ${timeoutMs}ms (request_id: ${requestId})`);
        },
    },
};
