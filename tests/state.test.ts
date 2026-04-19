import { expect, test, describe } from "bun:test";
import { jsonOk, jsonErr, parseJsonResult } from "../src/core/state.js";

describe("jsonOk", () => {
    test("wraps data in MCP content format with success:true", () => {
        const result = jsonOk({ foo: "bar" });
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe("text");
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.success).toBe(true);
        expect(parsed.data).toEqual({ foo: "bar" });
    });
});

describe("jsonErr", () => {
    test("wraps error message with success:false", () => {
        const result = jsonErr("something broke");
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBe("something broke");
    });
});

describe("parseJsonResult", () => {
    test("parses valid JSON result text", () => {
        const text = JSON.stringify({ success: true, data: 42 });
        const parsed = parseJsonResult(text);
        expect(parsed.success).toBe(true);
        expect(parsed.data).toBe(42);
    });

    test("falls back to { success: true, data: text } for non-JSON (legacy ok() output)", () => {
        const parsed = parseJsonResult("Canal atualizado com sucesso.");
        expect(parsed.success).toBe(true);
        expect(parsed.data).toBe("Canal atualizado com sucesso.");
    });
});
