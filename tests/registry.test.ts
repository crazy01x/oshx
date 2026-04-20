import { expect, test, describe } from "bun:test";
import { registerAll, listByCategory, getCategory, listTools } from "../src/core/registry.js";

describe("registry categories", () => {
    test("registerAll with category assigns category to all tools in the map", () => {
        registerAll({ test_fs_tool: async () => ({ content: [] }) }, "filesystem");
        expect(getCategory("test_fs_tool")).toBe("filesystem");
    });

    test("listByCategory returns only tools in that category", () => {
        registerAll({ test_shell_tool: async () => ({ content: [] }) }, "terminal");
        const fsList = listByCategory("filesystem");
        expect(fsList).toContain("test_fs_tool");
        expect(fsList).not.toContain("test_shell_tool");
    });

    test("registerAll without category does not set category", () => {
        registerAll({ test_no_cat: async () => ({ content: [] }) });
        expect(getCategory("test_no_cat")).toBeUndefined();
    });
});
