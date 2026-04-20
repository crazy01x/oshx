import type { ToolModule } from "../core/constants.js";
import { jsonOk, jsonErr } from "../core/state.js";
import { memGet, memSet, memClear } from "../core/memory.js";

export const memoryModule: ToolModule = {
    definitions: [
        {
            name: "oshx_memory",
            description: "Armazena e recupera contexto entre chamadas ao MCP. Use para passar informações entre tools sem precisar sair do MCP. Nível 'session' existe enquanto o processo MCP estiver rodando. Nível 'persistent' sobrevive a reinicializações (salvo em .oshx/memory/). Ops: get, set, clear.",
            inputSchema: {
                type: "object",
                properties: {
                    op: { type: "string", enum: ["get", "set", "clear"] },
                    key: { type: "string", description: "Identificador da memória" },
                    value: { description: "Valor a armazenar (qualquer tipo JSON) — obrigatório para op: set" },
                    level: { type: "string", enum: ["session", "persistent"], description: "Nível de persistência (padrão: session)" },
                },
                required: ["op", "key"],
            },
        },
    ],

    handlers: {
        async oshx_memory(args) {
            const op = args.op as "get" | "set" | "clear";
            const key = args.key as string;
            const level = (args.level as "session" | "persistent") || "session";

            if (op === "get") {
                const value = memGet(key, level);
                return jsonOk({ key, level, value, found: value !== undefined });
            }

            if (op === "set") {
                if (args.value === undefined) return jsonErr("value é obrigatório para op: set");
                memSet(key, args.value, level);
                return jsonOk({ key, level, stored: true });
            }

            if (op === "clear") {
                memClear(key, level);
                return jsonOk({ key, level, cleared: true });
            }

            return jsonErr(`op inválida: ${String(op)}. Use: get, set, clear`);
        },
    },
};
