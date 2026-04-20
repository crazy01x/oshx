import fs from "fs";
import path from "path";
import type { ToolModule } from "../core/constants.js";
import { MIRROR } from "../core/constants.js";
import { jsonOk, jsonErr } from "../core/state.js";
import {
    sessionOpen, sessionNavigate, sessionClick, sessionType,
    sessionRead, sessionScreenshot, sessionEval, sessionWait,
    sessionClose, sessionList,
} from "../core/browser-session.js";

export const browserSessionModule: ToolModule = {
    definitions: [
        {
            name: "oshx_browser",
            description: "Controla um browser persistente dentro do MCP. O browser fica vivo entre chamadas — use session_id para continuar a mesma sessão. Actions: open (abre/confirma sessão), navigate (vai para URL), click (clica em seletor CSS ou texto), type (preenche campo), read (lê texto da página), screenshot (captura imagem), eval (executa JS), wait (aguarda seletor aparecer), close (fecha sessão), list (lista sessões ativas). Requires Playwright.",
            inputSchema: {
                type: "object",
                properties: {
                    action: {
                        type: "string",
                        enum: ["open", "navigate", "click", "type", "read", "screenshot", "eval", "wait", "close", "list"],
                        description: "Ação a executar",
                    },
                    session_id: {
                        type: "string",
                        description: "ID da sessão (ex: 'minha-sessao'). Omitido = 'default'.",
                    },
                    url: { type: "string", description: "URL para navigate" },
                    selector: { type: "string", description: "Seletor CSS ou texto para click/type/wait" },
                    text: { type: "string", description: "Texto para type" },
                    expression: { type: "string", description: "Expressão JS para eval" },
                },
                required: ["action"],
            },
        },
    ],

    handlers: {
        async oshx_browser(args) {
            const action = args.action as string;
            const sid = (args.session_id as string | undefined) || "default";

            try {
                switch (action) {
                    case "open": {
                        await sessionOpen(sid);
                        return jsonOk({ session_id: sid, status: "open" });
                    }

                    case "navigate": {
                        const url = args.url as string;
                        if (!url) return jsonErr("url é obrigatório para action:navigate");
                        const finalUrl = await sessionNavigate(sid, url);
                        return jsonOk({ session_id: sid, url: finalUrl });
                    }

                    case "click": {
                        const selector = args.selector as string;
                        if (!selector) return jsonErr("selector é obrigatório para action:click");
                        await sessionClick(sid, selector);
                        return jsonOk({ session_id: sid, clicked: selector });
                    }

                    case "type": {
                        const selector = args.selector as string;
                        const text = args.text as string;
                        if (!selector) return jsonErr("selector é obrigatório para action:type");
                        if (text === undefined) return jsonErr("text é obrigatório para action:type");
                        await sessionType(sid, selector, text);
                        return jsonOk({ session_id: sid, typed: text.length });
                    }

                    case "read": {
                        const content = await sessionRead(sid);
                        return jsonOk({ session_id: sid, content, length: content.length });
                    }

                    case "screenshot": {
                        const buf = await sessionScreenshot(sid);
                        if (!fs.existsSync(MIRROR)) fs.mkdirSync(MIRROR, { recursive: true });
                        const filePath = path.join(MIRROR, `browser_session_${sid}_${Date.now()}.png`);
                        fs.writeFileSync(filePath, buf);
                        return jsonOk({ session_id: sid, file: filePath, bytes: buf.length });
                    }

                    case "eval": {
                        const expression = args.expression as string;
                        if (!expression) return jsonErr("expression é obrigatório para action:eval");
                        const result = await sessionEval(sid, expression);
                        return jsonOk({ session_id: sid, result });
                    }

                    case "wait": {
                        const selector = args.selector as string;
                        if (!selector) return jsonErr("selector é obrigatório para action:wait");
                        await sessionWait(sid, selector);
                        return jsonOk({ session_id: sid, found: selector });
                    }

                    case "close": {
                        await sessionClose(sid);
                        return jsonOk({ session_id: sid, status: "closed" });
                    }

                    case "list": {
                        const list = sessionList();
                        return jsonOk({ sessions: list, count: list.length });
                    }

                    default:
                        return jsonErr(`action inválida: ${action}`);
                }
            } catch (e) {
                return jsonErr((e as Error).message);
            }
        },
    },
};
