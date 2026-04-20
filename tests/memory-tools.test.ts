import { expect, test, describe, afterEach } from "bun:test";
import { memoryModule } from "../src/tools/memory-tools.js";
import { memClear } from "../src/core/memory.js";
import { parseResult } from "./helpers.js";

afterEach(() => {
    memClear("test_key", "session");
    memClear("test_persist", "persistent");
});

describe("oshx_memory set + get (session)", () => {
    test("stores and retrieves a value in session", async () => {
        await memoryModule.handlers.oshx_memory({ op: "set", key: "test_key", value: { x: 1 }, level: "session" });
        const raw = await memoryModule.handlers.oshx_memory({ op: "get", key: "test_key", level: "session" });
        const r = parseResult(raw);
        expect(r.success).toBe(true);
        expect((r.data as { value: { x: number }; found: boolean }).value).toEqual({ x: 1 });
        expect((r.data as { found: boolean }).found).toBe(true);
    });

    test("returns found:false for missing key", async () => {
        const raw = await memoryModule.handlers.oshx_memory({ op: "get", key: "missing_key_xyz", level: "session" });
        const r = parseResult(raw);
        expect((r.data as { found: boolean }).found).toBe(false);
    });
});

describe("oshx_memory clear", () => {
    test("clears a stored key", async () => {
        await memoryModule.handlers.oshx_memory({ op: "set", key: "test_key", value: 42, level: "session" });
        await memoryModule.handlers.oshx_memory({ op: "clear", key: "test_key", level: "session" });
        const raw = await memoryModule.handlers.oshx_memory({ op: "get", key: "test_key", level: "session" });
        const r = parseResult(raw);
        expect((r.data as { found: boolean }).found).toBe(false);
    });
});

describe("oshx_memory set error cases", () => {
    test("returns error when value is missing for set op", async () => {
        const raw = await memoryModule.handlers.oshx_memory({ op: "set", key: "test_key" });
        const r = parseResult(raw);
        expect(r.success).toBe(false);
        expect(r.error).toContain("value");
    });
});
