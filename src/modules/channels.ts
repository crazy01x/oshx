import fs from "fs";
import path from "path";
import { CHANNELS, NCACHE, CHANNEL_MAP } from "../core/constants.js";
import type { ChannelData, Message, MessageType, NeuralCache } from "../core/constants.js";
import { readJSON, writeJSON, fileExists, uid, now, bumpMessages } from "../core/state.js";
import { oshxBus } from "../core/events.js";

// ── Internal helpers ──────────────────────────────────────────────────────────
function channelPath(ch: string): string {
    return path.join(CHANNELS, `${ch}.json`);
}

function cachePath(ch: string): string {
    return path.join(NCACHE, `${ch}.json`);
}

// ── Read ──────────────────────────────────────────────────────────────────────
export function getChannelData(channel: string): ChannelData | null {
    const f = channelPath(channel);
    if (!fileExists(f)) return null;
    return readJSON<ChannelData>(f);
}

export function getCache(channel: string): NeuralCache | null {
    const f = cachePath(channel);
    return fileExists(f) ? readJSON<NeuralCache>(f) : null;
}

// ── Write ─────────────────────────────────────────────────────────────────────
export function postToChannel(
    channel: string,
    author: string,
    content: string,
    type: MessageType = "message"
): Message {
    const data = getChannelData(channel);
    if (!data) throw new Error(`Canal #${channel} não existe.`);

    const msg: Message = {
        id: uid(),
        author,
        content,
        timestamp: now(),
        type,
        reactions: {},
        channel,
    };

    data.messages.push(msg);
    writeJSON(channelPath(channel), data);
    bumpMessages();

    // Invalidate cache if channel grew significantly
    const cache = getCache(channel);
    if (cache && data.messages.length > cache.messages_covered + 10) {
        cache.stale = true;
        writeJSON(cachePath(channel), cache);
    }

    // Emit for web dashboard SSE
    oshxBus.emit("message", { channel, message: msg });

    return msg;
}

export function pinMessage(channel: string, messageId: string): boolean {
    const data = getChannelData(channel);
    if (!data) return false;
    const msg = data.messages.find(m => m.id === messageId);
    if (!msg) return false;
    msg.pinned = true;
    if (!data.pinned_messages.includes(messageId)) data.pinned_messages.push(messageId);
    writeJSON(channelPath(channel), data);
    return true;
}

export function addReaction(channel: string, messageId: string, emoji: string, agent: string): string {
    const data = getChannelData(channel);
    if (!data) return "Canal não encontrado.";
    const msg = data.messages.find(m => m.id === messageId);
    if (!msg) return "Mensagem não encontrada.";
    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
    const already = msg.reactions[emoji].includes(agent);
    if (already) {
        msg.reactions[emoji] = msg.reactions[emoji].filter(a => a !== agent);
    } else {
        msg.reactions[emoji].push(agent);
    }
    writeJSON(channelPath(channel), data);
    return already ? `Reação ${emoji} removida.` : `Reação ${emoji} adicionada.`;
}

export function updateCache(channel: string, summary: string, author: string, msgCount: number): void {
    writeJSON(cachePath(channel), {
        channel,
        summary,
        last_summarized: now(),
        messages_covered: msgCount,
        stale: false,
        author,
    } as NeuralCache);
}

// ── Smart read ────────────────────────────────────────────────────────────────
export function smartRead(channel: string, full = false): string {
    const data = getChannelData(channel);
    if (!data) return `Canal #${channel} não existe.`;

    const msgs = data.messages;
    const cache = getCache(channel);
    const THRESHOLD = 20;

    const pinned = msgs.filter(m => m.pinned);
    let out = `╔ #${channel} — ${data.description}\n`;
    if (data.shadow_qa) out += ` SHADOW QA ATIVO — agente revisando em tempo real\n`;
    if (pinned.length) {
        out += ` PINNED:\n${pinned.map(m => `  @${m.author}: ${m.content}`).join("\n")}\n`;
    }

    if (!full && msgs.length > THRESHOLD && cache && !cache.stale) {
        const recent = msgs.slice(-8);
        out += `║ NEURAL-CACHE (${cache.messages_covered} msgs resumidas · ${cache.last_summarized.slice(0, 10)}):\n`;
        out += `║ ${cache.summary}\n`;
        out += `╠═ ÚLTIMAS ${recent.length} ═══\n`;
        out += recent.map(m => formatMsg(m)).join("\n");
    } else {
        if (cache?.stale) {
            out += `  Cache stale — ${msgs.length - cache.messages_covered} novas msgs. Use oshx_summarize.\n`;
        }
        const toShow = full ? msgs : msgs.slice(-20);
        out += `╠═ ${msgs.length} MENSAGENS TOTAIS ═══\n`;
        out += toShow.map(m => formatMsg(m)).join("\n");
        if (!full && msgs.length > 20) out += `\n… (${msgs.length - 20} anteriores omitidas. full:true para ver todas)`;
    }
    return out;
}

function formatMsg(m: Message): string {
    const reactions = Object.entries(m.reactions)
        .map(([e, agents]) => `${e}×${agents.length}`).join(" ");
    const reactionStr = reactions ? ` [${reactions}]` : "";
    const pin = m.pinned ? " " : "";
    const typeTag = m.type !== "message" ? `[${m.type.toUpperCase()}] ` : "";
    return `${pin}[${m.timestamp.slice(11, 16)}] ${typeTag}@${m.author}: ${m.content}${reactionStr}`;
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export function getChannelStats(): Array<{ name: string; count: number; category: string; critical: boolean }> {
    return Object.entries(CHANNEL_MAP).map(([ch, meta]) => {
        const data = getChannelData(ch);
        return { name: ch, count: data?.messages.length ?? 0, category: meta.category, critical: !!meta.critical };
    });
}

