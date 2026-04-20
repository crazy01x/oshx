import { expect, test, describe } from "bun:test";
import { registerAll } from "../src/core/registry.js";
import { jsonOk, jsonErr } from "../src/core/state.js";
import { orchestratorModule } from "../src/tools/orchestrator-tools.js";
import { parseResult } from "./helpers.js";

// Register mock tools for testing
registerAll({
    mock_echo: async (args) => jsonOk({ echoed: args.msg }),
    mock_fail: async () => jsonErr("intentional failure"),
    mock_add:  async (args) => jsonOk({ sum: (args.a as number) + (args.b as number) }),
});

describe("oshx_run", () => {
    test("executes a single step and returns its result", async () => {
        const raw = await orchestratorModule.handlers.oshx_run({
            steps: [{ tool: "mock_echo", args: { msg: "hello" } }],
        });
        const r = parseResult(raw);
        expect(r.success).toBe(true);
        const data = r.data as { success: boolean; steps_executed: number; results: Array<{ data: { echoed: string } }> };
        expect(data.success).toBe(true);
        expect(data.steps_executed).toBe(1);
        expect(data.results[0].data.echoed).toBe("hello");
    });

    test("executes multiple steps in sequence", async () => {
        const raw = await orchestratorModule.handlers.oshx_run({
            steps: [
                { tool: "mock_echo", args: { msg: "step1" } },
                { tool: "mock_add",  args: { a: 2, b: 3 } },
            ],
        });
        const r = parseResult(raw);
        const data = r.data as { steps_executed: number; results: Array<{ data: unknown }> };
        expect(data.steps_executed).toBe(2);
        expect((data.results[1].data as { sum: number }).sum).toBe(5);
    });

    test("stops on first error when stop_on_error is true (default)", async () => {
        const raw = await orchestratorModule.handlers.oshx_run({
            steps: [
                { tool: "mock_fail",  args: {} },
                { tool: "mock_echo", args: { msg: "should not run" } },
            ],
        });
        const r = parseResult(raw);
        const data = r.data as { steps_executed: number; success: boolean };
        expect(data.steps_executed).toBe(1);
        expect(data.success).toBe(false);
    });

    test("continues on error when stop_on_error is false", async () => {
        const raw = await orchestratorModule.handlers.oshx_run({
            steps: [
                { tool: "mock_fail",  args: {} },
                { tool: "mock_echo", args: { msg: "still runs" } },
            ],
            stop_on_error: false,
        });
        const r = parseResult(raw);
        const data = r.data as { steps_executed: number };
        expect(data.steps_executed).toBe(2);
    });

    test("returns error for unknown tool", async () => {
        const raw = await orchestratorModule.handlers.oshx_run({
            steps: [{ tool: "nonexistent_tool_xyz", args: {} }],
        });
        const r = parseResult(raw);
        const data = r.data as { results: Array<{ error: string }> };
        expect(data.results[0].error).toContain("nonexistent_tool_xyz");
    });

    test("returns error for empty steps array", async () => {
        const raw = await orchestratorModule.handlers.oshx_run({ steps: [] });
        const r = parseResult(raw);
        expect(r.success).toBe(false);
    });
});
