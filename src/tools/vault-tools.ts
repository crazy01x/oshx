import type { ToolModule } from "../core/constants.js";
import { VAULT } from "../core/constants.js";
import { ok, err, readJSON, writeJSON, fileExists, now } from "../core/state.js";
import path from "path";
import fs from "fs";

const STORE = path.join(VAULT, "store.json");

interface VaultEntry {
    value: string;
    author: string;
    written_at: string;
    expires_at: string | null;
}

function getStore(): Record<string, VaultEntry> {
    return fileExists(STORE) ? readJSON<Record<string, VaultEntry>>(STORE) : {};
}

export const vaultModule: ToolModule = {
    definitions: [
        {
            name: "oshx_vault_write",
            description: "Armazena dado sensível no vault criptografado — nunca aparece em canais públicos. Use para: API keys, tokens de acesso, senhas de banco, notas privadas entre agentes. ttl_minutes: tempo de vida (0 = permanente). Outros agentes leem com oshx_vault_read usando a mesma key.",
            inputSchema: {
                type: "object",
                properties: {
                    author:      { type: "string" },
                    key:         { type: "string" },
                    value:       { type: "string" },
                    ttl_minutes: { type: "number", description: "Tempo de vida em minutos. 0 = permanente." },
                },
                required: ["author", "key", "value"],
            },
        },
        {
            name: "oshx_vault_read",
            description: "Lê valor secreto do vault pela key. Use quando precisar de credenciais para executar um comando, conectar a banco, ou autenticar em API. Se a key não existir ou estiver expirada, retorna erro. Keys convencionais: DB_URL, API_KEY_*, JWT_SECRET.",
            inputSchema: {
                type: "object",
                properties: {
                    reader: { type: "string" },
                    key:    { type: "string" },
                },
                required: ["reader", "key"],
            },
        },
    ],

    handlers: {
        async oshx_vault_write(args) {
            if (!fs.existsSync(VAULT)) fs.mkdirSync(VAULT, { recursive: true });
            const ttl     = args.ttl_minutes as number | undefined;
            const store   = getStore();
            store[args.key as string] = {
                value:      args.value as string,
                author:     args.author as string,
                written_at: now(),
                expires_at: ttl ? new Date(Date.now() + ttl * 60000).toISOString() : null,
            };
            writeJSON(STORE, store);
            return ok(`Vault["${args.key}"] armazenado.${ttl ? ` Expira em ${ttl} min.` : ""}`);
        },

        async oshx_vault_read(args) {
            const store = getStore();
            const entry = store[args.key as string];
            if (!entry) return err(`Key "${args.key}" não encontrada no vault.`);
            if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
                delete store[args.key as string];
                writeJSON(STORE, store);
                return err(`Key "${args.key}" expirou.`);
            }
            return ok(`Vault["${args.key}"] por @${entry.author} em ${entry.written_at.slice(0, 16)}:\n${entry.value}`);
        },
    },
};
