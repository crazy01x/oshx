import { expect, test, describe } from "bun:test";
import { shellModule } from "../src/tools/shell-tools.js";
import { parseResult } from "./helpers.js";

describe("oshx_shell", () => {
    test("runs a command and returns stdout", async () => {
        const raw = await shellModule.handlers.oshx_shell({ cmd: "echo hello_oshx" });
        const r = parseResult(raw);
        expect(r.success).toBe(true);
        const data = r.data as { stdout: string; exit_code: number };
        expect(data.stdout).toContain("hello_oshx");
        expect(data.exit_code).toBe(0);
    });

    test("returns exit_code and stderr for failing command", async () => {
        const raw = await shellModule.handlers.oshx_shell({ cmd: "exit 1", cwd: process.cwd() });
        const r = parseResult(raw);
        // success is still true (tool succeeded), but exit_code is non-zero
        expect(r.success).toBe(true);
        const data = r.data as { exit_code: number };
        expect(data.exit_code).not.toBe(0);
    });

    test("uses custom cwd", async () => {
        const raw = await shellModule.handlers.oshx_shell({ cmd: "pwd", cwd: "/tmp" });
        const r = parseResult(raw);
        const data = r.data as { stdout: string };
        expect(r.success).toBe(true);
        expect(typeof data.stdout).toBe("string");
    });
});
