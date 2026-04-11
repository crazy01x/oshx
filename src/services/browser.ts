import { OSHX_ROOT } from "../core/constants.js";
import { postToChannel } from "../modules/channels.js";

/**
 * Browser service — headless web interactions.
 * oshx_screenshot + oshx_devtools require playwright.
 * oshx_crawl, oshx_research, oshx_probe use native fetch.
 */

function normalizeUrl(raw: string): string {
    const value = (raw ?? "").trim();
    if (!value) throw new Error("URL vazia.");
    if (/^https?:\/\//i.test(value)) return value;
    if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(value)) return `http://${value}`;
    return `https://${value}`;
}

async function loadChromium() {
    const mod = await import("playwright").catch(() => {
        throw new Error("Playwright não instalado. Run: bun add playwright && bunx playwright install chromium");
    });
    return mod.chromium;
}

function errText(e: unknown, fallback: string): string {
    return e instanceof Error ? e.message : fallback;
}

// ── Screenshot ────────────────────────────────────────────────────────────────
export async function screenshot(url: string, author: string): Promise<string> {
    const startedAt = Date.now();
    try {
        const target = normalizeUrl(url);
        const chromium = await loadChromium();
        const browser = await chromium.launch({ headless: true });
        const page    = await browser.newPage();
        await page.goto(target, { waitUntil: "domcontentloaded", timeout: 30000 });

        await page.setViewportSize({ width: 390, height: 844 });
        const mobileShot = await page.screenshot({ type: "png" });

        await page.setViewportSize({ width: 1440, height: 900 });
        const desktopShot = await page.screenshot({ type: "png" });

        await browser.close();

        const ts = Date.now();
        const { MIRROR } = await import("../core/constants.js");
        const { writeFileSync, mkdirSync, existsSync } = await import("fs");
        if (!existsSync(MIRROR)) mkdirSync(MIRROR, { recursive: true });

        const mobileFile  = `${MIRROR}/screen_mobile_${ts}.png`;
        const desktopFile = `${MIRROR}/screen_desktop_${ts}.png`;
        writeFileSync(mobileFile, mobileShot);
        writeFileSync(desktopFile, desktopShot);

        postToChannel("browser-vision", author,
            ` Screenshot de ${target}\n Mobile: ${mobileFile}\n  Desktop: ${desktopFile}`);

        return `Screenshots salvas:\n  Mobile:  ${mobileFile}\n  Desktop: ${desktopFile}\n⏱ ${Date.now() - startedAt}ms`;
    } catch (e: unknown) {
        return errText(e, "Erro ao tirar screenshot.");
    }
}

// ── Crawl a URL ───────────────────────────────────────────────────────────────
export async function crawl(url: string, author: string): Promise<string> {
    try {
        const target = normalizeUrl(url);
        const res  = await fetch(target, { headers: { "User-Agent": "Oshx-Crawler/1.0" }, signal: AbortSignal.timeout(10000) });
        if (!res.ok) {
            return `Falha no crawl: HTTP ${res.status} em ${target}`;
        }
        const html = await res.text();

        const text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 3000);

        postToChannel("browser-vision", author,
            `  Crawl de ${target} (${text.length} chars)\n${text.slice(0, 300)}…`);
        return `Crawl de ${target}:\n\n${text}`;
    } catch (e: unknown) {
        return errText(e, "Erro ao crawlear URL.");
    }
}

// ── Web research (DuckDuckGo instant answer API) ──────────────────────────────
export async function research(query: string, author: string): Promise<string> {
    try {
        const encoded = encodeURIComponent(query);
        const res  = await fetch(`https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1`, {
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) {
            return `Pesquisa indisponível agora (HTTP ${res.status}).`;
        }
        const data = await res.json() as Record<string, unknown>;
        const abstract = (data.AbstractText as string) || "";
        const relatedRaw = (data.RelatedTopics as Array<{ Text?: string; Topics?: Array<{ Text?: string }> }> | undefined) ?? [];
        const flatRelated = relatedRaw.flatMap((r) => {
            const direct = r.Text ? [r.Text] : [];
            const nested = Array.isArray(r.Topics) ? r.Topics.map(t => t.Text ?? "").filter(Boolean) : [];
            return [...direct, ...nested];
        });
        const results  = flatRelated.slice(0, 5);

        const output = [
            abstract ? `**Resumo:** ${abstract}` : "",
            results.length ? `**Relacionados:**\n${results.map(r => `- ${r}`).join("\n")}` : "",
        ].filter(Boolean).join("\n\n") || "Sem resultados para esta query.";

        postToChannel("browser-vision", author, ` Pesquisa: "${query}"\n${output.slice(0, 500)}`);
        return output;
    } catch (e: unknown) {
        return errText(e, "Erro na pesquisa.");
    }
}

// ── URL Probe — test multiple paths for broken routes ────────────────────────
export async function probe(baseUrl: string, paths: string[], author: string): Promise<string> {
    const root = normalizeUrl(baseUrl).replace(/\/$/, "");
    const testedPaths = (paths ?? []).map(p => p.startsWith("/") ? p : `/${p}`);
    const results: string[] = [` URL PROBE — ${root}`, ""];
    let broken = 0;

    const checks = await Promise.allSettled(
        testedPaths.map(async (p) => {
            const url = `${root}${p}`;
            try {
                const res = await fetch(url, {
                    method: "GET",
                    redirect: "follow",
                    signal: AbortSignal.timeout(8000),
                    headers: { "User-Agent": "Oshx-Probe/1.0" },
                });
                const icon = res.ok ? "" : res.status >= 500 ? "" : res.status === 404 ? "" : "";
                return { line: `${icon} ${res.status} ${p}`, broken: !res.ok };
            } catch (e: unknown) {
                return { line: ` ERR ${p} — ${errText(e, "timeout")}`, broken: true };
            }
        })
    );

    for (const c of checks) {
        if (c.status === "fulfilled") {
            results.push(c.value.line);
            if (c.value.broken) broken++;
            continue;
        }
        results.push(` ERR desconhecido`);
        broken++;
    }

    results.push("", `${broken} rota(s) com problema de ${testedPaths.length} testadas.`);
    const report = results.join("\n");
    postToChannel("browser-vision", author, report.slice(0, 1000));
    if (broken > 0) postToChannel("monitoring", "OSHX-SYSTEM", ` Probe detectou ${broken} rotas quebradas em ${root}`, "alert");
    return report;
}

// ── DevTools Deep Inspection (Playwright) ────────────────────────────────────
interface DevToolsReport {
    url: string;
    consoleErrors: string[];
    networkFailed: string[];
    httpErrors: string[];
    jsExceptions: string[];
    screenshot?: string;
}

export async function devtools(url: string, author: string): Promise<string> {
    try {
        const target = normalizeUrl(url);
        const chromium = await loadChromium();

        const report: DevToolsReport = { url: target, consoleErrors: [], networkFailed: [], httpErrors: [], jsExceptions: [] };
        const browser = await chromium.launch({ headless: true });
        const page    = await browser.newPage();

        // Capture console errors
        page.on("console", (msg) => {
            if (msg.type() === "error") {
                report.consoleErrors.push(`[console.error] ${msg.text()}`);
            }
        });

        // Capture JS exceptions
        page.on("pageerror", (err) => {
            report.jsExceptions.push(`[pageerror] ${err.message}`);
        });

        // Capture failed network requests
        page.on("requestfailed", (req) => {
            report.networkFailed.push(`[net:fail] ${req.method()} ${req.url()} — ${req.failure()?.errorText ?? "unknown"}`);
        });

        // Capture HTTP errors (404/500 etc)
        page.on("response", (res) => {
            if (res.status() >= 400) {
                report.httpErrors.push(`[http:${res.status()}] ${res.request().method()} ${res.url()}`);
            }
        });

        await page.goto(target, { waitUntil: "domcontentloaded", timeout: 30000 });

        // Screenshot of final state
        const ts = Date.now();
        const { MIRROR } = await import("../core/constants.js");
        const { writeFileSync, mkdirSync, existsSync } = await import("fs");
        if (!existsSync(MIRROR)) mkdirSync(MIRROR, { recursive: true });
        const shotFile = `${MIRROR}/devtools_${ts}.png`;
        const shotBuf  = await page.screenshot({ type: "png", fullPage: true });
        writeFileSync(shotFile, shotBuf);
        report.screenshot = shotFile;

        await browser.close();

        const allIssues = [...report.consoleErrors, ...report.networkFailed, ...report.httpErrors, ...report.jsExceptions];
        const lines = [
            ` DEVTOOLS INSPECTION — ${target}`,
            `Console Errors:  ${report.consoleErrors.length}`,
            `Network Fails:   ${report.networkFailed.length}`,
            `HTTP Errors:     ${report.httpErrors.length}`,
            `JS Exceptions:   ${report.jsExceptions.length}`,
            `Screenshot:      ${report.screenshot}`,
            "",
            ...allIssues.slice(0, 40),
            allIssues.length === 0 ? " Nenhum problema detectado." : "",
        ].filter(l => l !== undefined).join("\n");

        postToChannel("browser-vision", author, lines.slice(0, 1000));
        if (allIssues.length > 0) {
            postToChannel("monitoring", "OSHX-SYSTEM",
                ` DevTools: ${allIssues.length} issues em ${target}. Ver #browser-vision.`, "alert");
        }
        return lines;
    } catch (e: unknown) {
        return errText(e, "Erro no DevTools.");
    }
}

// ── Dynamic pentest (Playwright payload simulation) ─────────────────────────
export async function dynamicPentest(url: string, author: string, payloads?: string[]): Promise<string> {
    const samples = (payloads?.length ? payloads : [
        `<img src=x onerror=alert('xss')>`,
        `"><svg onload=alert('xss')>`,
        `<script>alert('xss')</script>`,
    ]).slice(0, 8);

    try {
        const target = normalizeUrl(url);
        const chromium = await loadChromium();

        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        const findings: string[] = [];
        const dialogs: string[] = [];

        page.on("dialog", async (d) => {
            dialogs.push(`${d.type()}: ${d.message()}`);
            try { await d.dismiss(); } catch {}
        });

        for (const p of samples) {
            const dialogsBefore = dialogs.length;
            const u = new URL(target);
            u.searchParams.set("q", p);

            const consoleErrors: string[] = [];
            const onConsole = (msg: { type(): string; text(): string }) => {
                if (msg.type() === "error") consoleErrors.push(msg.text());
            };
            page.on("console", onConsole as never);

            await page.goto(u.toString(), { waitUntil: "domcontentloaded", timeout: 15000 });

            const fields = page.locator("textarea, input:not([type='hidden']):not([type='checkbox']):not([type='radio'])");
            const fieldCount = Math.min(await fields.count(), 5);
            for (let i = 0; i < fieldCount; i++) {
                await fields.nth(i).fill(p, { timeout: 1000 }).catch(() => undefined);
            }
            const submit = page.locator("button[type='submit'], input[type='submit']");
            if (await submit.count()) {
                await submit.first().click({ timeout: 1200 }).catch(() => undefined);
            }

            await page.waitForTimeout(600);

            const newDialogs = dialogs.length - dialogsBefore;
            if (newDialogs > 0) {
                findings.push(` POSSÍVEL EXECUÇÃO JS com payload q=${JSON.stringify(p)} (dialog disparado)`);
            } else if (consoleErrors.some((e) => /script|xss|unsafe|violation|innerHTML/i.test(e))) {
                findings.push(` Sinal suspeito com payload q=${JSON.stringify(p)} (${consoleErrors[0]?.slice(0, 120)})`);
            } else {
                findings.push(` Sem execução aparente para q=${JSON.stringify(p)}`);
            }

            page.removeListener("console", onConsole as never);
        }

        await browser.close();

        const report = [
            ` DYNAMIC PENTEST — ${target}`,
            `Payloads testados: ${samples.length}`,
            `Dialogs capturados: ${dialogs.length}`,
            "",
            ...findings,
        ].join("\n");

        postToChannel("pentest", author, report.slice(0, 1500));
        if (findings.some((f) => f.startsWith(""))) {
            postToChannel("security", "OSHX-SYSTEM", ` Alerta de possível XSS em ${target}. Ver #pentest.`, "alert");
        }
        return report;
    } catch (e: unknown) {
        return errText(e, "Erro no dynamic pentest.");
    }
}

// ── Resilience Test (Shadow-QA) ─────────────────────────────────────────────
export async function resilience(url: string, author: string): Promise<string> {
    try {
        const target = normalizeUrl(url);
        const chromium = await loadChromium();

        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        const errors: string[] = [];
        const net: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
        page.on("requestfailed", (r) => net.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText ?? "fail"}`));

        // Simulate latency + lower throughput
        await page.route("**/*", async (route) => {
            await new Promise((r) => setTimeout(r, 180));
            await route.continue();
        });

        await page.goto(target, { waitUntil: "domcontentloaded", timeout: 30000 });

        // Concurrent click storm on interactive elements
        const clickable = page.locator("button, a, [role='button']");
        const clickCount = Math.min(await clickable.count(), 20);
        const clickTasks: Promise<void>[] = [];
        for (let i = 0; i < clickCount; i++) {
            for (let j = 0; j < 3; j++) {
                clickTasks.push(
                    clickable
                        .nth(i)
                        .click({ timeout: 1200 })
                        .then(() => undefined)
                        .catch(() => undefined),
                );
            }
        }
        await Promise.all(clickTasks);

        await page.waitForTimeout(1200);

        const ts = Date.now();
        const { MIRROR } = await import("../core/constants.js");
        const { writeFileSync, mkdirSync, existsSync } = await import("fs");
        if (!existsSync(MIRROR)) mkdirSync(MIRROR, { recursive: true });
        const shot = `${MIRROR}/resilience_${ts}.png`;
        writeFileSync(shot, await page.screenshot({ type: "png", fullPage: true }));

        await browser.close();

        const report = [
            ` SHADOW-QA RESILIENCE — ${target}`,
            `Elementos clicados em burst: ${clickCount}`,
            `Erros JS/console: ${errors.length}`,
            `Falhas de rede: ${net.length}`,
            `Screenshot: ${shot}`,
            "",
            ...errors.slice(0, 10).map((e) => ` ${e}`),
            ...net.slice(0, 10).map((n) => ` ${n}`),
            errors.length === 0 && net.length === 0 ? " Sem falhas detectadas sob estresse leve." : "",
        ].join("\n");

        postToChannel("qa", author, report.slice(0, 1600));
        if (errors.length || net.length) {
            postToChannel("monitoring", "OSHX-SYSTEM", ` Resilience test encontrou ${errors.length + net.length} incidentes em ${target}`, "alert");
        }
        return report;
    } catch (e: unknown) {
        return errText(e, "Erro no resilience test.");
    }
}

// ── Static pentest scanner ────────────────────────────────────────────────────
interface Finding { severity: "HIGH" | "MEDIUM" | "LOW"; file: string; line: number; issue: string; snippet: string }

export async function pentest(targetDir: string, author: string): Promise<string> {
    const { readdirSync, readFileSync, statSync } = await import("fs");
    const { join, extname, resolve, relative, isAbsolute } = await import("path");

    const PROJECT_ROOT = resolve(OSHX_ROOT, "../..");
    const requested = (targetDir ?? ".").trim() || ".";
    const resolvedTarget = isAbsolute(requested)
        ? resolve(requested)
        : resolve(PROJECT_ROOT, requested);

    const relToProject = relative(PROJECT_ROOT, resolvedTarget);
    if (relToProject.startsWith("..") || isAbsolute(relToProject)) {
        return `Diretório fora do projeto não permitido no pentest.\nPedido: ${resolvedTarget}\nPermitido: ${PROJECT_ROOT} e subdiretórios.`;
    }

    try {
        if (!statSync(resolvedTarget).isDirectory()) {
            return `Diretório inválido para pentest: ${resolvedTarget}`;
        }
    } catch {
        return `Diretório não encontrado para pentest: ${resolvedTarget}`;
    }

    const PATTERNS = [
        { regex: /eval\s*\(.*\)/g,                         severity: "HIGH"   as const, issue: "eval() uso — RCE risk" },
        { regex: /innerHTML\s*=/g,                         severity: "HIGH"   as const, issue: "innerHTML assignment — XSS risk" },
        { regex: /dangerouslySetInnerHTML/g,               severity: "MEDIUM" as const, issue: "dangerouslySetInnerHTML — XSS risk" },
        { regex: /(?:select|insert|update|delete)[\s\S]*\+\s*[A-Za-z_$][\w$]*/gi, severity: "HIGH" as const, issue: "SQL string concat — injection risk" },
        { regex: /console\.log\s*\([^)]*(secret|password|token)/gi, severity: "MEDIUM" as const, issue: "Secret em console.log" },
        { regex: /process\.env\.\w+\s*\|\|\s*['"][^'"]{8}/g, severity: "LOW" as const, issue: "Fallback hardcoded de env var" },
        { regex: /NEXTAUTH_SECRET\s*=\s*['"][^'"]+/g,     severity: "HIGH"   as const, issue: "Auth secret hardcoded" },
        { regex: /Math\.random\(\).*token|key|secret/gi,  severity: "MEDIUM" as const, issue: "Math.random() para gerar segredo — não criptográfico" },
        { regex: /cors\(\)/g,                              severity: "LOW"    as const, issue: "CORS wildcard sem config explícita" },
    ];

    const ALLOWED_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".py"]);
    const findings: Finding[] = [];

    function walk(dir: string, depth = 0): void {
        if (depth > 4) return;
        try {
            for (const entry of readdirSync(dir)) {
                if (entry.startsWith(".") || entry === "node_modules" || entry === "dist" || entry === ".next" || entry === "target") continue;
                const full = join(dir, entry);
                const stat = statSync(full);
                if (stat.isDirectory()) { walk(full, depth + 1); continue; }
                if (!ALLOWED_EXTS.has(extname(entry))) continue;
                const content = readFileSync(full, "utf-8");
                const lines   = content.split("\n");
                for (const { regex, severity, issue } of PATTERNS) {
                    for (let i = 0; i < lines.length; i++) {
                        if (regex.test(lines[i])) {
                            findings.push({ severity, file: relative(resolvedTarget, full) || full, line: i + 1, issue, snippet: lines[i].trim().slice(0, 80) });
                        }
                        regex.lastIndex = 0;
                    }
                }
            }
        } catch {}
    }

    walk(resolvedTarget);

    if (findings.length === 0) {
        postToChannel("pentest", author, ` Pentest em \`${resolvedTarget}\`: zero issues detectados.`);
        return "Nenhuma vulnerabilidade detectada nos padrões verificados.";
    }

    const dedup = new Map<string, Finding>();
    for (const f of findings) {
        const key = `${f.severity}|${f.file}|${f.line}|${f.issue}`;
        if (!dedup.has(key)) dedup.set(key, f);
    }
    const uniqueFindings = [...dedup.values()];
    const by = (sev: string) => uniqueFindings.filter(f => f.severity === sev);
    const report = [
        ` **PENTEST REPORT** — ${resolvedTarget}`,
        `Total: ${uniqueFindings.length} findings | HIGH: ${by("HIGH").length} | MED: ${by("MEDIUM").length} | LOW: ${by("LOW").length}`,
        "",
        ...uniqueFindings.map(f => `[${f.severity}] ${f.file}:${f.line} — ${f.issue}\n  ${f.snippet}`),
    ].join("\n");

    postToChannel("pentest", author, report.slice(0, 1000));
    if (by("HIGH").length > 0) {
        postToChannel("security", "OSHX-SYSTEM",
            ` ${by("HIGH").length} HIGH-severity findings em pentest. Ver #pentest para detalhes.`, "alert");
    }
    return report;
}

