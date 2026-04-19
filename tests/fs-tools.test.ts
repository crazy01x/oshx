import { expect, test, describe, afterEach } from "bun:test";
import fs from "fs";
import path from "path";
import { fsModule } from "../src/tools/fs-tools.js";
import { parseResult } from "./helpers.js";

const TMP = path.join(import.meta.dir, "__tmp_fs_test__");

afterEach(() => {
    if (fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true });
});

describe("oshx_fs_read", () => {
    test("reads an existing file", async () => {
        fs.mkdirSync(TMP, { recursive: true });
        fs.writeFileSync(path.join(TMP, "hello.txt"), "hello world", "utf-8");

        const raw = await fsModule.handlers.oshx_fs_read({ path: path.join(TMP, "hello.txt") });
        const r = parseResult(raw);
        expect(r.success).toBe(true);
        expect((r.data as { content: string }).content).toBe("hello world");
    });

    test("returns error for missing file", async () => {
        const raw = await fsModule.handlers.oshx_fs_read({ path: "/nonexistent/file.txt" });
        const r = parseResult(raw);
        expect(r.success).toBe(false);
        expect(r.error).toContain("nonexistent");
    });
});

describe("oshx_fs_write", () => {
    test("creates file and directories", async () => {
        const filePath = path.join(TMP, "nested", "dir", "file.txt");
        const raw = await fsModule.handlers.oshx_fs_write({ path: filePath, content: "written!" });
        const r = parseResult(raw);
        expect(r.success).toBe(true);
        expect(fs.readFileSync(filePath, "utf-8")).toBe("written!");
    });
});

describe("oshx_fs_edit", () => {
    test("replaces unique string in file", async () => {
        fs.mkdirSync(TMP, { recursive: true });
        const filePath = path.join(TMP, "edit.txt");
        fs.writeFileSync(filePath, "hello world\n", "utf-8");

        const raw = await fsModule.handlers.oshx_fs_edit({
            path: filePath,
            old_str: "hello world",
            new_str: "goodbye world",
        });
        const r = parseResult(raw);
        expect(r.success).toBe(true);
        expect(fs.readFileSync(filePath, "utf-8")).toBe("goodbye world\n");
    });

    test("returns error if old_str not found", async () => {
        fs.mkdirSync(TMP, { recursive: true });
        const filePath = path.join(TMP, "edit2.txt");
        fs.writeFileSync(filePath, "hello world\n", "utf-8");

        const raw = await fsModule.handlers.oshx_fs_edit({
            path: filePath,
            old_str: "does not exist",
            new_str: "anything",
        });
        const r = parseResult(raw);
        expect(r.success).toBe(false);
    });

    test("returns error if old_str appears multiple times", async () => {
        fs.mkdirSync(TMP, { recursive: true });
        const filePath = path.join(TMP, "edit3.txt");
        fs.writeFileSync(filePath, "abc abc abc\n", "utf-8");

        const raw = await fsModule.handlers.oshx_fs_edit({
            path: filePath,
            old_str: "abc",
            new_str: "xyz",
        });
        const r = parseResult(raw);
        expect(r.success).toBe(false);
        expect(r.error).toContain("3 vezes");
    });
});
