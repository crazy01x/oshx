import type { Browser, Page } from "playwright";

interface Session {
    browser: Browser;
    page: Page;
    created_at: string;
    last_used: string;
    url: string;
}

const sessions = new Map<string, Session>();

async function loadChromium() {
    const mod = await import("playwright").catch(() => {
        throw new Error("Playwright não instalado. Run: bun add playwright && bunx playwright install chromium");
    });
    return mod.chromium;
}

export async function sessionOpen(sessionId: string): Promise<void> {
    if (sessions.has(sessionId)) return; // already open
    const chromium = await loadChromium();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const now = new Date().toISOString();
    sessions.set(sessionId, { browser, page, created_at: now, last_used: now, url: "about:blank" });
}

export async function sessionNavigate(sessionId: string, url: string): Promise<string> {
    const s = sessions.get(sessionId);
    if (!s) throw new Error(`Sessão ${sessionId} não encontrada. Use action:open primeiro.`);
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    await s.page.goto(normalized, { waitUntil: "domcontentloaded", timeout: 30000 });
    s.url = s.page.url();
    s.last_used = new Date().toISOString();
    return s.url;
}

export async function sessionClick(sessionId: string, selector: string): Promise<void> {
    const s = sessions.get(sessionId);
    if (!s) throw new Error(`Sessão ${sessionId} não encontrada.`);
    await s.page.click(selector, { timeout: 10000 });
    s.last_used = new Date().toISOString();
}

export async function sessionType(sessionId: string, selector: string, text: string): Promise<void> {
    const s = sessions.get(sessionId);
    if (!s) throw new Error(`Sessão ${sessionId} não encontrada.`);
    await s.page.fill(selector, text, { timeout: 10000 });
    s.last_used = new Date().toISOString();
}

export async function sessionRead(sessionId: string): Promise<string> {
    const s = sessions.get(sessionId);
    if (!s) throw new Error(`Sessão ${sessionId} não encontrada.`);
    const html = await s.page.content();
    const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 4000);
    s.last_used = new Date().toISOString();
    return text;
}

export async function sessionScreenshot(sessionId: string): Promise<Buffer> {
    const s = sessions.get(sessionId);
    if (!s) throw new Error(`Sessão ${sessionId} não encontrada.`);
    s.last_used = new Date().toISOString();
    return s.page.screenshot({ type: "png" });
}

export async function sessionEval(sessionId: string, expression: string): Promise<unknown> {
    const s = sessions.get(sessionId);
    if (!s) throw new Error(`Sessão ${sessionId} não encontrada.`);
    s.last_used = new Date().toISOString();
    return s.page.evaluate(expression);
}

export async function sessionWait(sessionId: string, selector: string): Promise<void> {
    const s = sessions.get(sessionId);
    if (!s) throw new Error(`Sessão ${sessionId} não encontrada.`);
    await s.page.waitForSelector(selector, { timeout: 15000 });
    s.last_used = new Date().toISOString();
}

export async function sessionClose(sessionId: string): Promise<void> {
    const s = sessions.get(sessionId);
    if (!s) return;
    await s.browser.close().catch(() => undefined);
    sessions.delete(sessionId);
}

export function sessionList(): Array<{ id: string; url: string; created_at: string; last_used: string }> {
    return Array.from(sessions.entries()).map(([id, s]) => ({
        id,
        url: s.url,
        created_at: s.created_at,
        last_used: s.last_used,
    }));
}
