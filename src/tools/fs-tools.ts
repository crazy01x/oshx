import fs from "fs";
import path from "path";
import type { ToolModule } from "../core/constants.js";
import { jsonOk, jsonErr } from "../core/state.js";

export const fsModule: ToolModule = {
    definitions: [
        {
            name: "oshx_fs_read",
            description: "Lê o conteúdo de um arquivo do sistema. Retorna texto UTF-8. Use para inspecionar arquivos antes de editar, ler configs, ou carregar código existente. path pode ser absoluto ou relativo ao cwd do processo.",
            inputSchema: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Caminho do arquivo" },
                },
                required: ["path"],
            },
        },
        {
            name: "oshx_fs_write",
            description: "Escreve conteúdo completo em um arquivo. Cria o arquivo e diretórios necessários se não existirem. CUIDADO: sobrescreve o arquivo completamente. Para edições pontuais, use oshx_fs_edit.",
            inputSchema: {
                type: "object",
                properties: {
                    path: { type: "string" },
                    content: { type: "string" },
                },
                required: ["path", "content"],
            },
        },
        {
            name: "oshx_fs_edit",
            description: "Substituição exata de texto dentro de um arquivo. Falha se old_str não for encontrado ou aparecer mais de uma vez no arquivo. Use oshx_fs_read antes para confirmar o trecho exato.",
            inputSchema: {
                type: "object",
                properties: {
                    path: { type: "string" },
                    old_str: { type: "string", description: "Texto exato a substituir (deve aparecer exatamente 1 vez)" },
                    new_str: { type: "string", description: "Texto de substituição" },
                },
                required: ["path", "old_str", "new_str"],
            },
        },
    ],

    handlers: {
        async oshx_fs_read(args) {
            const filePath = args.path as string;
            try {
                const content = fs.readFileSync(filePath, "utf-8");
                return jsonOk({ path: filePath, content, size: content.length });
            } catch (e) {
                return jsonErr(`Não foi possível ler ${filePath}: ${(e as Error).message}`);
            }
        },

        async oshx_fs_write(args) {
            const filePath = args.path as string;
            const content = args.content as string;
            try {
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                fs.writeFileSync(filePath, content, "utf-8");
                return jsonOk({ path: filePath, bytes_written: Buffer.byteLength(content, "utf-8") });
            } catch (e) {
                return jsonErr(`Não foi possível escrever ${filePath}: ${(e as Error).message}`);
            }
        },

        async oshx_fs_edit(args) {
            const filePath = args.path as string;
            const oldStr = args.old_str as string;
            const newStr = args.new_str as string;
            try {
                const content = fs.readFileSync(filePath, "utf-8");
                const count = content.split(oldStr).length - 1;
                if (count === 0) return jsonErr(`old_str não encontrado em ${filePath}`);
                if (count > 1) return jsonErr(`old_str encontrado ${count} vezes em ${filePath} — precisa ser único`);
                const updated = content.replace(oldStr, newStr);
                fs.writeFileSync(filePath, updated, "utf-8");
                return jsonOk({ path: filePath, replaced: true });
            } catch (e) {
                return jsonErr(`Erro em oshx_fs_edit: ${(e as Error).message}`);
            }
        },
    },
};
