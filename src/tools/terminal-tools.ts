import type { ToolModule } from "../core/constants.js";
import { ok } from "../core/state.js";
import { startProcess, sendInput, killSession, listSessions } from "../services/terminal.js";

export const terminalModule: ToolModule = {
    definitions: [
        {
            name: "oshx_exec",
            description: "Executa comando shell no projeto. OBRIGATÓRIO para qualquer terminal — nunca use shell externo para tarefas do enxame. Verifica locks ativos antes de executar (bloqueia se houver tackle). Output postado em #terminal. Retorna session_id para processos interativos (use oshx_send_input). Watchdog de 30s mata processos travados. Path lockdown: só permite cwd dentro do projeto.",
            inputSchema: {
                type: "object",
                properties: {
                    author:  { type: "string" },
                    command: { type: "string" },
                    cwd:     { type: "string", description: "Working directory (opcional)" },
                },
                required: ["author", "command"],
            },
        },
        {
            name: "oshx_send_input",
            description: "Envia texto para um processo interativo em execução (ex: REPL, prompt de confirmação, CLI interativa). Use o session_id retornado por oshx_exec. Escapes: \\n = Enter, \\u0003 = Ctrl+C, \\u001b[A = seta cima, \\u001b[B = seta baixo. Use para responder prompts como 'Are you sure? (y/n)'.",
            inputSchema: {
                type: "object",
                properties: {
                    session_id: { type: "string" },
                    input:      { type: "string" },
                },
                required: ["session_id", "input"],
            },
        },
        {
            name: "oshx_kill_session",
            description: "Mata um processo de terminal em execução pelo session_id. Use quando um processo travar, demorar demais, ou precisar ser reiniciado. O watchdog de 30s já mata automaticamente — use esta tool para matar antes disso ou para limpeza explícita.",
            inputSchema: {
                type: "object",
                properties: {
                    session_id: { type: "string" },
                    author:     { type: "string" },
                },
                required: ["session_id", "author"],
            },
        },
    ],

    handlers: {
        async oshx_exec(args) {
            const result = await startProcess(
                args.author as string,
                args.command as string,
                args.cwd as string | undefined
            );
            const tag = result.interactive ? `[INTERATIVO — session:${result.session_id}]` : `[EXIT — session:${result.session_id}]`;
            return ok(`${tag}\n\n${result.output}`);
        },

        async oshx_send_input(args) {
            const out = await sendInput(args.session_id as string, args.input as string);
            return ok(out);
        },

        async oshx_kill_session(args) {
            const out = killSession(args.session_id as string, args.author as string);
            return ok(out);
        },
    },
};
