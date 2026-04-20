import type { ToolModule } from "../core/constants.js";
import { jsonOk, jsonErr, parseJsonResult, uid } from "../core/state.js";
import { getHandler } from "../core/registry.js";

interface Step {
    tool: string;
    args: Record<string, unknown>;
}

export const orchestratorModule: ToolModule = {
    definitions: [
        {
            name: "oshx_run",
            description: "Executa uma sequência de tools do MCP em ordem, passando contexto acumulado entre elas. Use para encadear múltiplas operações sem sair do MCP. Cada step especifica tool + args. stop_on_error (padrão: true) para na primeira falha. task_id é opcional para rastreamento. Retorna results[] com o resultado de cada step.",
            inputSchema: {
                type: "object",
                properties: {
                    steps: {
                        type: "array",
                        description: "Sequência de {tool, args} a executar em ordem",
                        items: {
                            type: "object",
                            properties: {
                                tool: { type: "string", description: "Nome da tool a chamar" },
                                args: { type: "object", description: "Argumentos da tool" },
                            },
                            required: ["tool", "args"],
                        },
                    },
                    stop_on_error: {
                        type: "boolean",
                        description: "Para na primeira falha. Padrão: true.",
                    },
                    task_id: {
                        type: "string",
                        description: "ID para rastreamento (gerado automaticamente se omitido)",
                    },
                },
                required: ["steps"],
            },
        },
    ],

    handlers: {
        async oshx_run(args) {
            const steps = args.steps as Step[];
            const stopOnError = args.stop_on_error !== false;
            const taskId = (args.task_id as string | undefined) || uid();

            if (!Array.isArray(steps) || steps.length === 0) {
                return jsonErr("steps deve ser um array não-vazio de {tool, args}");
            }

            const results: Array<{
                step: number;
                tool: string;
                success: boolean;
                data: unknown;
                error?: string;
            }> = [];

            for (let i = 0; i < steps.length; i++) {
                const { tool, args: stepArgs } = steps[i];
                const handler = getHandler(tool);

                if (!handler) {
                    const r = { step: i, tool, success: false, data: null, error: `Tool não encontrada: ${tool}` };
                    results.push(r);
                    if (stopOnError) break;
                    continue;
                }

                try {
                    const raw = await handler(stepArgs);
                    const text = raw.content[0]?.text ?? "{}";
                    const parsed = parseJsonResult(text);
                    results.push({
                        step: i,
                        tool,
                        success: parsed.success,
                        data: parsed.data ?? null,
                        error: parsed.error,
                    });
                    if (!parsed.success && stopOnError) break;
                } catch (e) {
                    results.push({ step: i, tool, success: false, data: null, error: (e as Error).message });
                    if (stopOnError) break;
                }
            }

            const allOk = results.length === steps.length && results.every(r => r.success);
            return jsonOk({
                task_id: taskId,
                success: allOk,
                steps_executed: results.length,
                steps_total: steps.length,
                results,
            });
        },
    },
};
