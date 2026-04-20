import { execSync } from "child_process";
import type { ToolModule } from "../core/constants.js";
import { jsonOk } from "../core/state.js";

export const shellModule: ToolModule = {
    definitions: [
        {
            name: "oshx_shell",
            description: "Executa um comando shell e retorna stdout, stderr e exit_code. Timeout padrão: 30s. Retorna sucesso mesmo com exit_code != 0 — verifique exit_code para saber se o comando falhou. Evite comandos interativos ou que lêem stdin. Use cwd para definir diretório de trabalho.",
            inputSchema: {
                type: "object",
                properties: {
                    cmd: { type: "string", description: "Comando a executar" },
                    cwd: { type: "string", description: "Diretório de trabalho (opcional, padrão: process.cwd())" },
                    timeout: { type: "number", description: "Timeout em ms (padrão: 30000)" },
                },
                required: ["cmd"],
            },
        },
    ],

    handlers: {
        async oshx_shell(args) {
            const cmd = args.cmd as string;
            const cwd = (args.cwd as string | undefined) || process.cwd();
            const timeout = (args.timeout as number | undefined) ?? 30000;

            try {
                const stdout = execSync(cmd, {
                    cwd,
                    timeout,
                    encoding: "utf-8",
                    stdio: ["pipe", "pipe", "pipe"],
                });
                return jsonOk({ cmd, cwd, exit_code: 0, stdout: stdout.trim(), stderr: "" });
            } catch (e: unknown) {
                const error = e as {
                    stdout?: string;
                    stderr?: string;
                    status?: number;
                    message: string;
                };
                return jsonOk({
                    cmd,
                    cwd,
                    exit_code: error.status ?? 1,
                    stdout: (error.stdout ?? "").trim(),
                    stderr: (error.stderr ?? error.message).trim(),
                });
            }
        },
    },
};
