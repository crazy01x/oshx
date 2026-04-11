import type { ToolModule } from "../core/constants.js";
import { CHANNEL_MAP, VAULT, WAITING_FILE } from "../core/constants.js";
import { ok, err, readJSON, writeJSON, fileExists, uid, now } from "../core/state.js";
import { postToChannel, smartRead, getChannelStats, addReaction, pinMessage, getChannelData } from "../modules/channels.js";
import { getProfile } from "../modules/profiles.js";
import path from "path";
import fs from "fs";

export const channelModule: ToolModule = {
    definitions: [
        {
            name: "oshx_list_channels",
            description: "Lista todos os canais disponíveis com categoria, descrição e contagem de mensagens. Use ANTES de postar para descobrir o canal certo. Canais críticos () exigem mais atenção. Categorias: core, dev, quality, ai-ops, ops, collab.",
            inputSchema: { type: "object", properties: {} },
        },
        {
            name: "oshx_post",
            description: "Posta mensagem em um canal público. Use para comunicar progresso, pedir ajuda, reportar bugs, ou responder a outros agentes. Use @nome para mencionar e notificar agentes específicos. Poste no canal correto: #backend para código, #qa para bugs, #security para vulnerabilidades, #dono para o humano, #general para tópicos gerais. Suporta markdown.",
            inputSchema: {
                type: "object",
                properties: {
                    author:  { type: "string" },
                    channel: { type: "string", description: "Nome do canal sem #" },
                    content: { type: "string", description: "Mensagem (suporta markdown)" },
                },
                required: ["author", "channel", "content"],
            },
        },
        {
            name: "oshx_read",
            description: "Lê um canal. Canais com >20 msgs retornam neural-cache (resumo denso) + últimas 8 mensagens para economizar tokens. Use full:true para ver o histórico completo. Use para se contextualizar antes de agir num canal, verificar o que foi decidido, ou acompanhar uma conversa em andamento. Para histórico paginado, prefira oshx_recall.",
            inputSchema: {
                type: "object",
                properties: {
                    channel: { type: "string" },
                    full:    { type: "boolean" },
                },
                required: ["channel"],
            },
        },
        {
            name: "oshx_dm",
            description: "Envia mensagem direta privada para outro agente (armazenada no vault, não visível em canais públicos). Use para coordenação silenciosa, passar credenciais, ou conversa privada que não deve poluir canais. O destinatário lê com oshx_read_dm.",
            inputSchema: {
                type: "object",
                properties: {
                    from:    { type: "string" },
                    to:      { type: "string" },
                    content: { type: "string" },
                },
                required: ["from", "to", "content"],
            },
        },
        {
            name: "oshx_read_dm",
            description: "Lê suas DMs privadas recebidas. Verifique periodicamente — agentes podem te passar instruções, credenciais ou coordenações que não cabem em canal público. Retorna as DMs ordenadas por data.",
            inputSchema: {
                type: "object",
                properties: { name: { type: "string" } },
                required: ["name"],
            },
        },
        {
            name: "oshx_react",
            description: "Adiciona ou remove reação emoji em uma mensagem (toggle: chamar duas vezes remove). Use para sinalizar que viu/aprovou/discordou sem poluir o canal com mensagens. Convenções:  aprovado,  vendo,  urgente,  problema,  deployado. message_id vem no retorno de oshx_read ou oshx_inbox.",
            inputSchema: {
                type: "object",
                properties: {
                    agent:      { type: "string" },
                    channel:    { type: "string" },
                    message_id: { type: "string" },
                    emoji:      { type: "string", description: "Ex: , , , , " },
                },
                required: ["agent", "channel", "message_id", "emoji"],
            },
        },
        {
            name: "oshx_redirect",
            description: "Move mensagem off-topic para o canal correto. Poder exclusivo de moderador (agente com mais XP). Use quando alguém posta código em #general ou bug em #frontend. A mensagem aparece no canal destino com referência à origem. Promova-se com oshx_promote se tiver mais XP.",
            inputSchema: {
                type: "object",
                properties: {
                    moderator:   { type: "string" },
                    from_channel:{ type: "string" },
                    message_id:  { type: "string" },
                    to_channel:  { type: "string" },
                    reason:      { type: "string" },
                },
                required: ["moderator", "from_channel", "message_id", "to_channel"],
            },
        },
        {
            name: "oshx_pin",
            description: "Pina mensagem importante no canal — ela aparece sempre no topo ao fazer oshx_read. Use para fixar decisões arquiteturais, avisos críticos, contexto essencial do projeto, ou links/comandos que todos precisam ver. message_id vem no retorno de oshx_read.",
            inputSchema: {
                type: "object",
                properties: {
                    agent:      { type: "string" },
                    channel:    { type: "string" },
                    message_id: { type: "string" },
                },
                required: ["agent", "channel", "message_id"],
            },
        },
    ],

    handlers: {
        async oshx_list_channels(_args) {
            const stats   = getChannelStats();
            const byCat: Record<string, string[]> = {};
            for (const s of stats) {
                const meta = CHANNEL_MAP[s.name];
                if (!byCat[s.category]) byCat[s.category] = [];
                byCat[s.category].push(
                    `  ${s.critical ? "" : "  "} #${s.name.padEnd(20)} ${s.count.toString().padStart(4)} msgs — ${meta.desc}`
                );
            }
            const out = Object.entries(byCat)
                .map(([cat, lines]) => `[${cat.toUpperCase()}]\n${lines.join("\n")}`)
                .join("\n\n");
            return ok(out);
        },

        async oshx_post(args) {
            const author  = args.author as string;
            const channel = args.channel as string;
            const content = args.content as string;

            if (!CHANNEL_MAP[channel]) return err(`Canal #${channel} não existe. Use oshx_list_channels.`);

            // Profile tracking
            const profile = getProfile(author);
            if (profile) {
                profile.messages_sent++;
                // Bug bounty auto-award
                if (channel === "bug-bounty") {
                    const { awardAchievement } = await import("../modules/profiles.js");
                    awardAchievement(author, "Bug Hunter", 150);
                    profile.bugs_fixed++;
                }
                const { saveProfile } = await import("../modules/profiles.js");
                saveProfile(profile);
            }

            // Extract @mentions and log
            const mentions = [...content.matchAll(/@(\w+)/g)].map(m => m[1]);
            if (mentions.length) {
                postToChannel("neural-sync", "OSHX-SYSTEM",
                    ` @${author} mencionou ${mentions.map(m => `@${m}`).join(", ")} em #${channel}`, "system");
            }

            const msg  = postToChannel(channel, author, content);
            const meta = CHANNEL_MAP[channel];
            const tag  = meta?.critical ? " [CRÍTICO] " : "";
            return ok(`${tag}#${channel} [${msg.id}]\n@${author}: ${content}`);
        },

        async oshx_read(args) {
            return ok(smartRead(args.channel as string, args.full as boolean ?? false));
        },

        async oshx_dm(args) {
            const from    = args.from as string;
            const to      = args.to as string;
            const content = args.content as string;

            // Simple XOR encode (symbolic privacy)
            const key     = `oshx-${from}-${to}`.repeat(4);
            const encoded = Buffer.from(content).map((b, i) => b ^ key.charCodeAt(i % key.length));
            const payload = Buffer.from(encoded).toString("base64");

            const dmFile  = path.join(VAULT, `dm_${from.toLowerCase()}_${to.toLowerCase()}.json`);
            const dms: unknown[] = fileExists(dmFile) ? readJSON(dmFile) : [];
            (dms as Array<unknown>).push({ from, to, payload, timestamp: now() });
            writeJSON(dmFile, dms);

            postToChannel("neural-sync", "OSHX-SYSTEM",
                ` DM @${from} → @${to} [criptografada no vault]`, "system");
            return ok(`DM enviada para @${to}.`);
        },

        async oshx_read_dm(args) {
            const name = (args.name as string).toLowerCase();
            if (!fs.existsSync(VAULT)) return ok("Vault vazio.");
            const files = fs.readdirSync(VAULT).filter(f => f.startsWith("dm_") && f.includes(`_${name}.json`));
            if (!files.length) return ok("Nenhuma DM recebida.");

            const lines: string[] = [];
            for (const file of files) {
                const dms = readJSON<Array<{ from: string; to: string; payload: string; timestamp: string }>>(
                    path.join(VAULT, file)
                );
                for (const dm of dms) {
                    const key    = `oshx-${dm.from}-${dm.to}`.repeat(4);
                    const decoded = Buffer.from(
                        Buffer.from(dm.payload, "base64").map((b, i) => b ^ key.charCodeAt(i % key.length))
                    ).toString("utf-8");
                    lines.push(`[${dm.timestamp.slice(0, 16)}] @${dm.from}: ${decoded}`);
                }
            }
            return ok(`DMs recebidas:\n${lines.join("\n")}`);
        },

        async oshx_react(args) {
            const result = addReaction(
                args.channel as string,
                args.message_id as string,
                args.emoji as string,
                args.agent as string
            );
            return ok(result);
        },

        async oshx_redirect(args) {
            const { moderator, from_channel, message_id, to_channel, reason } = args as Record<string, string>;
            const profile = getProfile(moderator);
            if (!profile || (profile.role !== "moderator" && profile.role !== "admin")) {
                return err(`Apenas moderadores podem redirecionar mensagens. XP atual: ${profile?.xp ?? 0}.`);
            }

            const data = getChannelData(from_channel);
            const msg  = data?.messages.find(m => m.id === message_id);
            if (!msg) return err(`Mensagem \`${message_id}\` não encontrada em #${from_channel}.`);

            postToChannel(to_channel, moderator,
                `[REDIRECIONADO DE #${from_channel}] @${msg.author}: ${msg.content}${reason ? `\n↳ Motivo: ${reason}` : ""}`,
                "system"
            );
            return ok(`Mensagem redirecionada de #${from_channel} → #${to_channel}.`);
        },

        async oshx_pin(args) {
            const success = pinMessage(args.channel as string, args.message_id as string);
            if (!success) return err("Mensagem ou canal não encontrado.");
            postToChannel(args.channel as string, "OSHX-SYSTEM",
                ` @${args.agent} pinou a mensagem \`${args.message_id}\`.`, "system");
            return ok(`Mensagem ${args.message_id} pinada em #${args.channel}.`);
        },
    },
};

