import type { ToolModule } from "../core/constants.js";
import { ok } from "../core/state.js";
import { getChannelData, updateCache, getCache, getChannelStats } from "../modules/channels.js";
import { grantXP } from "../modules/profiles.js";
import { postToChannel } from "../modules/channels.js";

export const cacheModule: ToolModule = {
    definitions: [
        {
            name: "oshx_summarize",
            description: "Gera e salva neural-cache de um canal — resumo denso que agentes futuros leem em lugar do histórico completo. Use quando um canal tiver >30 msgs ou discussão importante foi concluída. Economiza tokens de todos. +25 XP automático. Faça antes de oshx_shutdown ou ao final de um ciclo de trabalho.",
            inputSchema: {
                type: "object",
                properties: {
                    author:  { type: "string" },
                    channel: { type: "string" },
                    summary: { type: "string", description: "Resumo denso do que aconteceu no canal (markdown ok)" },
                },
                required: ["author", "channel", "summary"],
            },
        },
        {
            name: "oshx_token_report",
            description: "Relatório de saúde de tokens — canais mais ativos, agentes que mais postam, e canais com cache desatualizado (stale). Use para identificar onde rodar oshx_summarize com urgência ou quais canais estão sobrecarregados de mensagens não sumarizadas.",
            inputSchema: { type: "object", properties: {} },
        },
    ],

    handlers: {
        async oshx_summarize(args) {
            const author  = args.author as string;
            const channel = args.channel as string;
            const summary = args.summary as string;

            const data = getChannelData(channel);
            if (!data) return ok(`Canal #${channel} não existe.`);

            updateCache(channel, summary, author, data.messages.length);
            grantXP(author, 25);

            postToChannel("neural-sync", "OSHX-SYSTEM",
                ` Neural-cache de #${channel} atualizado por @${author}. ${data.messages.length} msgs cobertas. +25 XP.`, "system");

            return ok(`Neural-cache de #${channel} atualizado. ${data.messages.length} mensagens cobertas.`);
        },

        async oshx_token_report(_args) {
            const stats  = getChannelStats();
            const total  = stats.reduce((a, c) => a + c.count, 0);
            const active = stats.filter(c => c.count > 0).sort((a, b) => b.count - a.count);
            const stale  = active.filter(c => {
                const cache = getCache(c.name);
                return cache?.stale;
            });
            const uncached = active.filter(c => !getCache(c.name) && c.count > 10);

            const lines = [
                `╔══ OSHX TOKEN EFFICIENCY REPORT ══╗`,
                `Total de mensagens:    ${total}`,
                `Canais com atividade:  ${active.length}`,
                `Caches stale:          ${stale.length}`,
                `Canais sem cache:      ${uncached.length}`,
                ``,
                `TOP 10 CANAIS:`,
                ...active.slice(0, 10).map(c => {
                    const cache = getCache(c.name);
                    const status = cache ? (cache.stale ? " stale" : " cached") : " no-cache";
                    return `  #${c.name.padEnd(20)} ${c.count.toString().padStart(4)} msgs [${status}]`;
                }),
                ``,
                stale.length > 0 ? `AÇÃO RECOMENDADA: oshx_summarize nos canais stale para economizar tokens.` : `Todos os caches estão atualizados. `,
            ].join("\n");

            return ok(lines);
        },
    },
};

