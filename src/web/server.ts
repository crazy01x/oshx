import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { getConsciousness } from "../core/consciousness.js";
import { MIRROR, WEB_PORT } from "../core/constants.js";
import { oshxBus } from "../core/events.js";
import { getState, setOperatorOverride } from "../core/state.js";
import { getChannelData, getChannelStats, postToChannel } from "../modules/channels.js";
import { getLocks } from "../modules/moderation.js";
import { getAllProfiles, getProfile } from "../modules/profiles.js";
import { getProposals } from "../modules/voting.js";

declare const Bun: {
    serve(options: { port: number; fetch(req: Request): Response | Promise<Response> }): unknown;
};

type SseSender = (payload: string) => void;

let started = false;
const sseClients = new Set<SseSender>();

function broadcast(event: string, data: unknown) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const send of sseClients) { try { send(payload); } catch { sseClients.delete(send); } }
}
oshxBus.on("message",       (d) => broadcast("message",       d));
oshxBus.on("profile",       (d) => broadcast("profile",       d));
oshxBus.on("lock",          (d) => broadcast("lock",          d));
oshxBus.on("release",       (d) => broadcast("release",       d));
oshxBus.on("award",         (d) => broadcast("award",         d));
oshxBus.on("task",          (d) => broadcast("task",          d));
oshxBus.on("consciousness", (d) => broadcast("consciousness", d));

function html() {
        return `<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OSHX Dashboard</title>
    <style>
        :root {
            color-scheme: dark;
            --bg: #07090f;
            --panel: #0f1320;
            --line: #232a3f;
            --muted: #93a0b8;
            --text: #edf1ff;
            --accent: #8b9bff;
            --ok: #16a34a;
            --danger: #ef4444;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: "Inter", "Segoe UI", Roboto, Arial, sans-serif;
            letter-spacing: .01em;
            background:
                radial-gradient(1000px 500px at 20% -10%, rgba(83,104,255,.20) 0%, rgba(7,9,15,0) 55%),
                linear-gradient(180deg, #090c14 0%, var(--bg) 100%);
            color: var(--text);
        }
        .wrap { max-width: 1240px; margin: 0 auto; padding: 26px; }
        .top {
            display: flex; align-items: center; justify-content: space-between; gap: 12px;
            margin-bottom: 16px;
        }
        .title { font-weight: 700; font-size: 18px; letter-spacing: .02em; }
        .pill {
            border: 1px solid var(--line);
            border-radius: 999px;
            padding: 7px 11px;
            font-size: 12px;
            color: var(--muted);
            background: rgba(14,18,30,.7);
        }
        .grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 16px; }
        .panel {
            background: linear-gradient(180deg, rgba(16,20,33,.96), rgba(12,16,28,.96));
            border: 1px solid var(--line);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 26px rgba(0,0,0,.28);
        }
        .ph {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 13px;
            border-bottom: 1px solid var(--line);
            font-size: 13px;
            font-weight: 600;
        }
        .pc { padding: 12px 14px; }
        .feed { height: 520px; overflow: auto; font-size: 12px; line-height: 1.45; }
        .codeFeed { height: 260px; overflow: auto; font-size: 12px; line-height: 1.4; }
        .msg {
            margin-bottom: 7px;
            padding: 8px 10px;
            border-radius: 8px;
            background: rgba(10,14,24,.85);
            border: 1px solid #202946;
            white-space: pre-wrap;
            word-break: break-word;
        }
        .muted { color: var(--muted); }
        .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        button {
            border: 1px solid #2b3550;
            background: linear-gradient(180deg, #18223a, #121a2b);
            color: var(--text);
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 650;
            font-size: 12px;
        }
        button:hover { border-color: #435384; }
        button.danger { border-color: #7d2e3a; background: linear-gradient(180deg, #3a1621, #291018); color: #ffd6df; }
        .kvs { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; }
        .kv {
            border: 1px solid var(--line);
            border-radius: 8px;
            padding: 10px;
            background: #0d1220;
            font-size: 12px;
        }
        .kv .k { color: var(--muted); display: block; margin-bottom: 4px; }
        .badge { padding: 2px 8px; border-radius: 999px; font-size: 11px; border: 1px solid; }
        .ok { color: #86efac; border-color: #14532d; background: #052e16; }
        .dangerBadge { color: #fecaca; border-color: #7f1d1d; background: #450a0a; }
        .list { max-height: 220px; overflow: auto; font-size: 12px; }
        .list div { padding: 7px 0; border-bottom: 1px dashed #28304a; }
        .chan {
            width: 100%;
            text-align: left;
            border: 1px solid transparent;
            border-radius: 8px;
            padding: 7px 8px;
            background: transparent;
            color: var(--muted);
            font-weight: 500;
            cursor: pointer;
        }
        .chan:hover { background: rgba(139,155,255,.10); color: #dce4ff; border-color: #30406b; }
        .chan.active { background: rgba(139,155,255,.18); color: #f2f5ff; border-color: #43538a; }
        .sep { height: 10px; border-bottom: 1px dashed #27314a; margin: 8px 0 10px; }
        .codeCard {
            margin-bottom: 8px;
            border: 1px solid #273150;
            border-radius: 8px;
            overflow: hidden;
            background: #0b1020;
        }
        .codeHead {
            padding: 6px 9px;
            font-size: 11px;
            color: #cdd6f9;
            border-bottom: 1px solid #273150;
            background: #10172b;
        }
        .codeBlock {
            margin: 0;
            padding: 8px 10px;
            font-size: 11px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
        }
        .line-add { color: #86efac; background: rgba(22,163,74,.12); display:block; }
        .line-del { color: #fca5a5; background: rgba(239,68,68,.12); display:block; }
        .line-meta { color: #fcd34d; background: rgba(245,158,11,.10); display:block; }
        .tok-tag { color: #93c5fd; }
        .tok-attr { color: #f9a8d4; }
        .tok-str { color: #86efac; }
        .tok-cmd { color: #c4b5fd; }
        .tok-key { color: #fca5a5; }
        .tok-num { color: #fdba74; }
        @media (max-width: 980px) {
            .grid { grid-template-columns: 1fr; }
            .feed { height: 290px; }
            .codeFeed { height: 210px; }
        }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="top">
            <div class="title">OSHX · Operational Dashboard</div>
            <div class="row">
                <span class="pill">localhost:${WEB_PORT}</span>
                <span id="overridePill" class="pill">Override: OFF</span>
            </div>
        </div>

        <div class="grid">
            <section class="panel">
                <div class="ph">
                    <span id="feedTitle">Live Feed • SSE • #general</span>
                    <div class="row">
                        <button id="pauseBtn" class="danger">Operator Override</button>
                        <button id="resumeBtn">Retomar IA</button>
                        <button id="clearFeedBtn">Limpar feed</button>
                    </div>
                </div>
                <div class="pc feed" id="feed"></div>
                <div class="pc">
                    <div class="sep"></div>
                    <div class="ph" style="padding:8px 0;border:none">
                        <span>Coding Activity (diff / html / latex / rtf)</span>
                    </div>
                    <div class="codeFeed" id="codeFeed"></div>
                </div>
            </section>

            <section class="panel">
                <div class="ph">System Snapshot</div>
                <div class="pc">
                    <div class="kvs" id="stats"></div>
                    <div style="height:10px"></div>
                    <div class="row" style="justify-content:space-between">
                        <span class="muted">Canal #dono</span>
                    </div>
                    <div class="row">
                        <input id="donoAuthor" placeholder="autor (perfil Oshx)" style="width:180px;background:#0d1220;border:1px solid #2b3550;color:#eef2f8;padding:9px 10px;border-radius:10px;font-size:12px" />
                        <input id="donoInput" placeholder="Digite ordem do dono..." style="flex:1;min-width:0;background:#0d1220;border:1px solid #2b3550;color:#eef2f8;padding:9px 10px;border-radius:10px;font-size:12px" />
                        <button id="sendDonoBtn" class="danger">Enviar</button>
                    </div>

                    <div style="height:10px"></div>
                    <div class="row" style="justify-content:space-between">
                        <span class="muted">Canais mais ativos</span>
                        <button id="refreshBtn">Atualizar</button>
                    </div>
                    <div class="list" id="channels"></div>

                    <div style="height:10px"></div>
                    <div class="row" style="justify-content:space-between">
                        <span class="muted">Agentes ativos (consciousness)</span>
                    </div>
                    <div class="list" id="agents"></div>
                </div>
            </section>
        </div>
    </div>

    <script>
        const feed = document.getElementById('feed');
        const stats = document.getElementById('stats');
        const channels = document.getElementById('channels');
        const agents = document.getElementById('agents');
        const codeFeed = document.getElementById('codeFeed');
        const feedTitle = document.getElementById('feedTitle');
        const overridePill = document.getElementById('overridePill');
        const donoAuthor = document.getElementById('donoAuthor');
        const donoInput = document.getElementById('donoInput');
        let selectedChannel = 'general';

        function line(text, tone = 'muted') {
            const d = document.createElement('div');
            d.className = 'msg';
            const b = document.createElement('b');
            b.textContent = new Date().toLocaleTimeString('pt-BR');
            const sep = document.createTextNode(' · ');
            const s = document.createElement('span');
            s.className = tone;
            s.textContent = text;
            d.appendChild(b);
            d.appendChild(sep);
            d.appendChild(s);
            feed.prepend(d);
            while (feed.childNodes.length > 240) feed.removeChild(feed.lastChild);
        }

        function setSelectedChannel(name) {
            selectedChannel = name;
            feedTitle.textContent = 'Live Feed • SSE • #' + name;
            for (const el of channels.querySelectorAll('.chan')) {
                el.classList.toggle('active', el.getAttribute('data-channel') === name);
            }
        }

        async function loadChannelHistory(name) {
            const res = await fetch('/api/channel?name=' + encodeURIComponent(name) + '&limit=80');
            if (!res.ok) return;
            const data = await res.json();
            const msgs = data.messages || [];
            feed.innerHTML = '';
            for (const m of msgs.slice().reverse()) {
                const d = document.createElement('div');
                d.className = 'msg';
                const b = document.createElement('b');
                b.textContent = (m.timestamp || '').slice(11, 19) || new Date().toLocaleTimeString('pt-BR');
                const sep = document.createTextNode(' · ');
                const s = document.createElement('span');
                s.className = 'muted';
                s.textContent = '#' + name + ' · @' + (m.author || '-') + ': ' + (m.content || '');
                d.appendChild(b); d.appendChild(sep); d.appendChild(s);
                feed.appendChild(d);
            }
        }

        function esc(s) {
            return String(s)
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;');
        }

        function highlightHtml(src) {
            let out = esc(src);
            out = out.replace(/(&lt;\/?)([a-zA-Z0-9:-]+)/g, '$1<span class="tok-tag">$2</span>');
            out = out.replace(/([a-zA-Z-:]+)=(&quot;.*?&quot;|".*?"|'.*?')/g, '<span class="tok-attr">$1</span>=<span class="tok-str">$2</span>');
            return out;
        }

        function highlightLatex(src) {
            let out = esc(src);
            out = out.replace(/(\\[a-zA-Z]+\*?)/g, '<span class="tok-cmd">$1</span>');
            out = out.replace(/(\$\$?|\\\(|\\\))/g, '<span class="tok-key">$1</span>');
            out = out.replace(/([0-9]+(?:\.[0-9]+)?)/g, '<span class="tok-num">$1</span>');
            return out;
        }

        function highlightRtf(src) {
            let out = esc(src);
            out = out.replace(/(\\[a-z]+[0-9-]*)/gi, '<span class="tok-cmd">$1</span>');
            out = out.replace(/(\{\}|\{|\})/g, '<span class="tok-key">$1</span>');
            return out;
        }

        function highlightDiff(src) {
            const lines = String(src).split('\n').map((ln) => {
                const e = esc(ln);
                if (ln.startsWith('+')) return '<span class="line-add">' + e + '</span>';
                if (ln.startsWith('-')) return '<span class="line-del">' + e + '</span>';
                if (ln.startsWith('@@') || ln.startsWith('diff ') || ln.startsWith('index ')) return '<span class="line-meta">' + e + '</span>';
                return e;
            });
            return lines.join('\n');
        }

        function renderCodeBlock(lang, code) {
            const l = (lang || '').toLowerCase();
            if (l === 'diff' || l === 'patch') return highlightDiff(code);
            if (l === 'html' || l === 'xml') return highlightHtml(code);
            if (l === 'latex' || l === 'tex' || l === 'katex') return highlightLatex(code);
            if (l === 'rtf') return highlightRtf(code);
            return esc(code);
        }

        function appendCodeActivity(author, channel, content) {
            const text = String(content || '');
            const fence = String.fromCharCode(96).repeat(3);
            const blockRegex = new RegExp(fence + '([a-zA-Z0-9_-]+)?\\n([\\s\\S]*?)' + fence, 'g');
            const blocks = [...text.matchAll(blockRegex)];
            if (!blocks.length && !text.includes('@@') && !/^[+-].+/m.test(text)) return;

            const card = document.createElement('div');
            card.className = 'codeCard';
            const head = document.createElement('div');
            head.className = 'codeHead';
            head.textContent = '@' + author + ' • #' + channel + ' • ' + new Date().toLocaleTimeString('pt-BR');
            card.appendChild(head);

            if (blocks.length) {
                for (const b of blocks.slice(0, 3)) {
                    const lang = b[1] || 'text';
                    const code = b[2] || '';
                    const pre = document.createElement('pre');
                    pre.className = 'codeBlock';
                    pre.innerHTML = renderCodeBlock(lang, code);
                    card.appendChild(pre);
                }
            } else {
                const pre = document.createElement('pre');
                pre.className = 'codeBlock';
                pre.innerHTML = highlightDiff(text);
                card.appendChild(pre);
            }

            codeFeed.prepend(card);
            while (codeFeed.childNodes.length > 80) codeFeed.removeChild(codeFeed.lastChild);
        }

        async function fetchSnapshot() {
            const res = await fetch('/api/snapshot');
            const data = await res.json();

            const state = data.state || {};
            const consciousness = data.consciousness || { active_agents: {}, session_stats: {} };
            const locks = data.locks || [];
            const proposals = data.proposals || [];

            overridePill.textContent = 'Override: ' + (state.operator_override ? 'ON' : 'OFF');
            overridePill.style.color = state.operator_override ? '#fecaca' : '#9aa4b2';

            stats.innerHTML = [
                ['Mensagens', state.total_messages || 0],
                ['Boot Count', state.boot_count || 0],
                ['Lockdown', state.lockdown ? '<span class="badge dangerBadge">ON</span>' : '<span class="badge ok">OFF</span>'],
                ['Override', state.operator_override ? '<span class="badge dangerBadge">ON</span>' : '<span class="badge ok">OFF</span>'],
                ['Locks', locks.length],
                ['Proposals', proposals.length],
                ['Agents Ativos', Object.keys(consciousness.active_agents || {}).length],
                ['Chains', consciousness.session_stats?.chains_executed || 0],
            ].map(([k,v]) => '<div class="kv"><span class="k">' + k + '</span>' + v + '</div>').join('');

            channels.innerHTML = (data.channels || [])
                .sort((a,b) => b.count - a.count)
                .map(c => '<button class="chan ' + (c.name === selectedChannel ? 'active' : '') + '" data-channel="' + c.name + '">#' + c.name + ' · <b>' + c.count + '</b> <span class="muted">(' + c.category + ')</span></button>')
                .join('') || '<div class="muted">Sem dados.</div>';

            const activeAgents = consciousness.active_agents || {};
            agents.innerHTML = Object.entries(activeAgents)
                .map(([name, v]) => '<div>@' + name + ' · <b>' + (v.current_task || '-') + '</b><br/><span class="muted">tool: ' + (v.last_tool || '-') + ' · canal: #' + (v.channel || '-') + '</span></div>')
                .join('') || '<div class="muted">Nenhum agente ativo.</div>';
        }

        document.getElementById('refreshBtn').onclick = fetchSnapshot;
        document.getElementById('clearFeedBtn').onclick = () => { feed.innerHTML = ''; };
        channels.addEventListener('click', (ev) => {
            const btn = ev.target.closest('.chan');
            if (!btn) return;
            const name = btn.getAttribute('data-channel');
            if (!name) return;
            setSelectedChannel(name);
            loadChannelHistory(name);
        });
        document.getElementById('sendDonoBtn').onclick = async () => {
            const content = (donoInput.value || '').trim();
            const author = (donoAuthor.value || '').trim();
            if (!content) return;
            if (!author) { line('Informe o autor (perfil Oshx) para postar em #dono.', 'dangerBadge'); return; }
            await fetch('/api/dono', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ author, content })
            });
            donoInput.value = '';
            line('Mensagem enviada para #dono por @' + author + ': ' + content, 'dangerBadge');
        };
        donoInput.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') document.getElementById('sendDonoBtn').click();
        });

        document.getElementById('pauseBtn').onclick = async () => {
            await fetch('/api/override', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ active: true, by: 'operator' })
            });
            line('Operator override ativado. IA pausada.', 'dangerBadge');
            fetchSnapshot();
        };

        document.getElementById('resumeBtn').onclick = async () => {
            await fetch('/api/override', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ active: false, by: 'operator' })
            });
            line('Operator override desativado. IA retomada.', 'ok');
            fetchSnapshot();
        };

        const es = new EventSource('/api/stream');
        es.addEventListener('message', (e) => {
            try {
                const d = JSON.parse(e.data);
                if (!selectedChannel || d.channel === selectedChannel) {
                    line('#' + d.channel + ' · @' + d.message.author + ': ' + d.message.content);
                }
                appendCodeActivity(d.message.author, d.channel, d.message.content);
            } catch {}
        });
        es.addEventListener('lock', (e) => line('Novo lock detectado: ' + e.data, 'dangerBadge'));
        es.addEventListener('release', (e) => line('Lock liberado: ' + e.data, 'ok'));
        es.addEventListener('consciousness', () => fetchSnapshot());

        fetchSnapshot();
        loadChannelHistory(selectedChannel);
        setInterval(fetchSnapshot, 10000);
    </script>
</body>
</html>`;
}

function json(data: unknown, status = 200) {
        return new Response(JSON.stringify(data), {
                status,
                headers: { "content-type": "application/json; charset=utf-8" },
        });
}

function safeMirrorFile(urlPath: string): string | null {
        const rel = urlPath.replace(/^\/mirror\//, "").trim();
        if (!rel) return null;
        const full = path.resolve(MIRROR, rel);
        if (!full.startsWith(path.resolve(MIRROR))) return null;
        return full;
}

export function startWebServer() {
        if (started) return;

    const killProcessOnPort = (port: number): boolean => {
        try {
            if (process.platform === "win32") {
                const out = execSync(`netstat -ano -p tcp | findstr :${port}`, { encoding: "utf-8" });
                const pids = Array.from(new Set(
                    out.split(/\r?\n/)
                        .map(l => l.trim())
                        .filter(Boolean)
                        .map(l => l.split(/\s+/).at(-1) ?? "")
                        .filter(v => /^\d+$/.test(v) && Number(v) !== process.pid)
                ));
                for (const pid of pids) {
                    try { execSync(`taskkill /PID ${pid} /F`); } catch {}
                }
                return pids.length > 0;
            }
            const out = execSync(`lsof -ti tcp:${port}`, { encoding: "utf-8" });
            const pids = out.split(/\r?\n/).map(v => v.trim()).filter(Boolean);
            for (const pid of pids) {
                if (Number(pid) !== process.pid) {
                    try { execSync(`kill -9 ${pid}`); } catch {}
                }
            }
            return pids.length > 0;
        } catch {
            return false;
        }
    };

    const launchServer = () => Bun.serve({
        port: WEB_PORT,
        async fetch(req: Request) {
            const url = new URL(req.url);

            if (url.pathname === "/") {
                return new Response(html(), {
                    headers: { "content-type": "text/html; charset=utf-8" },
                });
            }

            if (url.pathname === "/api/stream") {
                const stream = new ReadableStream({
                    start(controller) {
                        const send: SseSender = (payload) => controller.enqueue(payload);
                        sseClients.add(send);

                        const hb = setInterval(() => {
                            try { controller.enqueue(`event: ping\ndata: ${Date.now()}\n\n`); } catch {}
                        }, 15000);

                        controller.enqueue(`event: hello\ndata: ${JSON.stringify({ ok: true, ts: Date.now() })}\n\n`);

                        req.signal.addEventListener("abort", () => {
                            clearInterval(hb);
                            sseClients.delete(send);
                            try { controller.close(); } catch {}
                        });
                    },
                });

                return new Response(stream, {
                    headers: {
                        "content-type": "text/event-stream",
                        "cache-control": "no-cache, no-transform",
                        "connection": "keep-alive",
                    },
                });
            }

            if (url.pathname === "/api/snapshot") {
                return json({
                    state: getState(),
                    channels: getChannelStats(),
                    profiles: getAllProfiles(),
                    locks: getLocks(),
                    proposals: getProposals(),
                    consciousness: getConsciousness(),
                });
            }

            if (url.pathname === "/api/channel" && req.method === "GET") {
                const name = (url.searchParams.get("name") || "").trim();
                const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") || "80")));
                if (!name) return json({ ok: false, error: "missing-name" }, 400);
                const ch = getChannelData(name);
                if (!ch) return json({ ok: false, error: "not-found" }, 404);
                return json({ ok: true, channel: name, messages: ch.messages.slice(-limit) });
            }

            if (url.pathname === "/api/override" && req.method === "POST") {
                const body = (await req.json().catch(() => ({}))) as { active?: boolean; by?: string };
                const active = !!body.active;
                const by = body.by || "operator";

                setOperatorOverride(active, by);
                postToChannel(
                    "kernel-space",
                    "OSHX-SYSTEM",
                    active
                        ? `⏸ OPERATOR OVERRIDE ativado por @${by}. Execução de IA pausada.`
                        : `▶️ OPERATOR OVERRIDE desativado por @${by}. Execução de IA retomada.`,
                    active ? "alert" : "system",
                );

                broadcast("override", { active, by, at: Date.now() });
                return json({ ok: true, active, by });
            }

            if (url.pathname === "/api/dono" && req.method === "POST") {
                const body = (await req.json().catch(() => ({}))) as { author?: string; content?: string };
                const author = (body.author || "").trim();
                const content = (body.content || "").trim();
                if (!author) return json({ ok: false, error: "missing-author" }, 400);
                if (!content) return json({ ok: false, error: "empty-content" }, 400);
                if (!getProfile(author)) {
                    return json({ ok: false, error: "profile-not-found", message: "Autor sem perfil. Use oshx_boot primeiro." }, 400);
                }

                const msg = postToChannel("dono", author, content, "message");
                broadcast("dono", { id: msg.id, author, content, at: Date.now() });
                return json({ ok: true, id: msg.id });
            }

            if (url.pathname.startsWith("/mirror/")) {
                const f = safeMirrorFile(url.pathname);
                if (!f || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
                    return new Response("Not found", { status: 404 });
                }
                const mime = f.endsWith(".png") ? "image/png"
                    : f.endsWith(".jpg") || f.endsWith(".jpeg") ? "image/jpeg"
                    : f.endsWith(".webp") ? "image/webp"
                    : "application/octet-stream";
                return new Response(fs.readFileSync(f), { headers: { "content-type": mime } });
            }

            return new Response("Not found", { status: 404 });
        },
    });

    try {
        launchServer();

                started = true;
                console.error(`[OSHX-WEB] Dashboard online em http://localhost:${WEB_PORT}`);
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                if (/EADDRINUSE|port\s+3000|in use/i.test(msg)) {
            const killed = killProcessOnPort(WEB_PORT);
            if (killed) {
                try {
                    launchServer();
                    started = true;
                    console.error(`[OSHX-WEB] Porta ${WEB_PORT} tomada. Dashboard reiniciado neste processo.`);
                    return;
                } catch (retryErr: unknown) {
                    const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
                    console.error(`[OSHX-WEB] Falha no takeover da porta ${WEB_PORT}: ${retryMsg}. MCP segue ativo sem dashboard.`);
                    return;
                }
            }
            console.error(`[OSHX-WEB] Porta ${WEB_PORT} já está em uso e não foi possível encerrar o processo dono. MCP segue ativo sem dashboard.`);
            return;
                }
                throw e;
            }
}
