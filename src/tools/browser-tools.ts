import type { ToolModule } from "../core/constants.js";
import { ok } from "../core/state.js";
import { postToChannel } from "../modules/channels.js";
import { awardAchievement } from "../modules/profiles.js";
import { crawl, devtools, dynamicPentest, pentest, probe, research, resilience, screenshot } from "../services/browser.js";

export const browserModule: ToolModule = {
    definitions: [
        {
            name: "oshx_screenshot",
            description: "Captura screenshot headless da URL em viewport mobile E desktop via Playwright. Use para validar UI após mudanças de layout, reportar bug visual, ou documentar estado atual do frontend. Salva em filesystem-mirror/ e posta em #browser-vision. Requer Playwright instalado.",
            inputSchema: {
                type: "object",
                properties: {
                    author: { type: "string" },
                    url:    { type: "string", description: "URL a capturar (ex: http://localhost:3000)" },
                },
                required: ["author", "url"],
            },
        },
        {
            name: "oshx_crawl",
            description: "Extrai o conteúdo textual de uma URL via crawl headless. Use para ler documentação online, verificar conteúdo de página, ou coletar dados de uma URL sem processar HTML manualmente. Para pesquisa por termo, prefira oshx_research.",
            inputSchema: {
                type: "object",
                properties: {
                    author: { type: "string" },
                    url:    { type: "string" },
                },
                required: ["author", "url"],
            },
        },
        {
            name: "oshx_research",
            description: "Pesquisa um termo via DuckDuckGo Instant Answer API e retorna resposta direta + links relevantes. Use para: buscar solução de erro, verificar best practice, entender uma lib, ou responder dúvida técnica sem sair do fluxo do enxame. Resultado postado em #browser-vision.",
            inputSchema: {
                type: "object",
                properties: {
                    author: { type: "string" },
                    query:  { type: "string" },
                },
                required: ["author", "query"],
            },
        },
        {
            name: "oshx_probe",
            description: "Testa múltiplas rotas em uma base URL e reporta 404/500/erros de asset. Use no ciclo autônomo de #qa para validar integridade do frontend. paths: lista de rotas a testar, ex: [\"/\", \"/login\", \"/api/health\"]. Alertas automáticos postados em #qa e #monitoring se encontrar falhas.",
            inputSchema: {
                type: "object",
                properties: {
                    author:   { type: "string" },
                    base_url: { type: "string", description: "Base URL (ex: http://localhost:5173)" },
                    paths: {
                        type: "array",
                        items: { type: "string" },
                        description: "Rotas a testar (ex: [\"/\",\"/home\",\"/search?q='\"])",
                    },
                },
                required: ["author", "base_url", "paths"],
            },
        },
        {
            name: "oshx_devtools",
            description: "Inspeção profunda via Playwright — captura erros de console JS, falhas de rede, HTTP 4xx/5xx, e JS exceptions durante carregamento da página. Use quando oshx_probe detectar anomalia ou quando suspeitar de erro silencioso no frontend. Tira screenshot do estado com erro. Alertas postados em #security e #qa.",
            inputSchema: {
                type: "object",
                properties: {
                    author: { type: "string" },
                    url:    { type: "string" },
                },
                required: ["author", "url"],
            },
        },
        {
            name: "oshx_dynamic_pentest",
            description: "Pentest dinâmico via Playwright — injeta payloads XSS em query params e formulários da URL alvo. Se vazio, usa suite padrão de payloads. Use no ciclo autônomo de #security ou ao suspeitar de input não sanitizado. Resultados postados em #pentest. Positivos reportados em #bug-bounty com XP.",
            inputSchema: {
                type: "object",
                properties: {
                    author:   { type: "string" },
                    url:      { type: "string" },
                    payloads: {
                        type: "array",
                        items: { type: "string" },
                        description: "Payloads opcionais. Se vazio, usa suite padrão.",
                    },
                },
                required: ["author", "url"],
            },
        },
        {
            name: "oshx_resilience_test",
            description: "Simula condições adversas no frontend: latência de rede aumentada (180ms) + burst de cliques simultâneos. Detecta race conditions, UI que trava sob carga, e elementos não responsivos. Use no ciclo de #qa após deploy ou mudança de componentes interativos.",
            inputSchema: {
                type: "object",
                properties: {
                    author: { type: "string" },
                    url:    { type: "string" },
                },
                required: ["author", "url"],
            },
        },
        {
            name: "oshx_pentest",
            description: "Escaneia diretório de código-fonte buscando: XSS (innerHTML, dangerouslySetInnerHTML), SQLi (queries concatenadas), secrets expostos (API keys hardcoded), uso de eval/Function. Use target_dir: './src' ou '.' para scan completo. Vulnerabilidades HIGH rendem XP e são postadas em #bug-bounty.",
            inputSchema: {
                type: "object",
                properties: {
                    author:     { type: "string" },
                    target_dir: { type: "string", description: "Diretório a escanear (ex: ./src ou .)" },
                },
                required: ["author", "target_dir"],
            },
        },
    ],

    handlers: {
        async oshx_screenshot(args) {
            const result = await screenshot(args.url as string, args.author as string);
            return ok(result);
        },

        async oshx_crawl(args) {
            const result = await crawl(args.url as string, args.author as string);
            return ok(result);
        },

        async oshx_research(args) {
            const result = await research(args.query as string, args.author as string);
            return ok(result);
        },

        async oshx_probe(args) {
            const result = await probe(
                args.base_url as string,
                args.paths as string[],
                args.author as string,
            );
            return ok(result);
        },

        async oshx_devtools(args) {
            const result = await devtools(args.url as string, args.author as string);
            return ok(result);
        },

        async oshx_dynamic_pentest(args) {
            const result = await dynamicPentest(
                args.url as string,
                args.author as string,
                args.payloads as string[] | undefined,
            );
            return ok(result);
        },

        async oshx_resilience_test(args) {
            const result = await resilience(args.url as string, args.author as string);
            return ok(result);
        },

        async oshx_pentest(args) {
            const author = args.author as string;
            const dir    = ((args.target_dir as string | undefined) ?? ".").trim() || ".";
            const result = await pentest(dir, author);

            // Auto-award if HIGH findings found
            if (result.includes("[HIGH]")) {
                const { unlocked } = awardAchievement(author, "Security Hawk", 200);
                if (unlocked) {
                    postToChannel("bug-bounty", "OSHX-SYSTEM",
                        ` @${author} encontrou vulnerabilidades HIGH em pentest! +200 XP — "Security Hawk" desbloqueado.`, "achievement");
                }
            }

            return ok(result);
        },
    },
};

