import type { ToolModule } from "../core/constants.js";
import { ok, err } from "../core/state.js";
import { getDiff, commit, push, createBranch, switchBranch, getCurrentBranch, depCheck } from "../services/git.js";
import { getProposals } from "../modules/voting.js";
import { createProposal } from "../modules/voting.js";
import { postToChannel } from "../modules/channels.js";

const DEFAULT_CWD = process.cwd();

export const gitModule: ToolModule = {
    definitions: [
        {
            name: "oshx_diff",
            description: "Mostra git diff atual (staged + unstaged) com estatísticas de arquivos e linhas modificadas. Use antes de commitar para revisar o que vai ser commitado, ou para informar o enxame sobre mudanças em andamento. cwd opcional para projetos fora do diretório padrão.",
            inputSchema: {
                type: "object",
                properties: {
                    author: { type: "string" },
                    cwd:    { type: "string" },
                },
                required: ["author"],
            },
        },
        {
            name: "oshx_commit",
            description: "Commita todas as alterações staged com uma mensagem. Use mensagens no formato convencional: 'feat: ...', 'fix: ...', 'refactor: ...'. Posta automaticamente em #git-ops e #hall-of-fame. Rode oshx_diff antes para revisar. cwd opcional para monorepos.",
            inputSchema: {
                type: "object",
                properties: {
                    author:  { type: "string" },
                    message: { type: "string" },
                    cwd:     { type: "string" },
                },
                required: ["author", "message"],
            },
        },
        {
            name: "oshx_push",
            description: "Push para o remote. REQUER proposta aprovada em #deploy com 30 créditos 'yes'. Use propose:true para criar a proposta automaticamente e aguardar votação. force:true pula a verificação (só use em emergências com autorização explícita do dono). Posta resultado em #git-ops.",
            inputSchema: {
                type: "object",
                properties: {
                    author:  { type: "string" },
                    branch:  { type: "string" },
                    cwd:     { type: "string" },
                    propose: { type: "boolean", description: "Se true, cria proposta em #deploy automaticamente." },
                    force:   { type: "boolean", description: "Se true, pula verificação de proposta (use com cuidado)." },
                },
                required: ["author", "branch"],
            },
        },
        {
            name: "oshx_branch",
            description: "Cria (action: create) ou muda para (action: switch) uma branch. Use nomes descritivos: feat/nome-da-feature, fix/nome-do-bug, refactor/area. Posta em #git-ops para visibilidade do enxame. Sempre crie branch antes de iniciar trabalho novo.",
            inputSchema: {
                type: "object",
                properties: {
                    author:  { type: "string" },
                    name:    { type: "string", description: "Nome da branch" },
                    action:  { type: "string", enum: ["create", "switch"] },
                    cwd:     { type: "string" },
                },
                required: ["author", "name", "action"],
            },
        },
        {
            name: "oshx_dep_check",
            description: "Roda npm/bun audit para detectar vulnerabilidades nas dependências. Posta resultado em #security. Use periodicamente no ciclo autônomo de #security, após npm install/bun add, ou quando chegar alerta do sistema. Vulnerabilidades HIGH/CRITICAL devem ser reportadas em #bug-bounty.",
            inputSchema: {
                type: "object",
                properties: {
                    author: { type: "string" },
                    cwd:    { type: "string" },
                },
                required: ["author"],
            },
        },
    ],

    handlers: {
        async oshx_diff(args) {
            const cwd = (args.cwd as string) ?? DEFAULT_CWD;
            const diff = getDiff(cwd);
            postToChannel("code-review", args.author as string, ` Diff:\n\`\`\`\n${diff.slice(0, 800)}\n\`\`\``);
            return ok(diff);
        },

        async oshx_commit(args) {
            const cwd    = (args.cwd as string) ?? DEFAULT_CWD;
            const result = commit(args.message as string, args.author as string, cwd);
            return ok(result);
        },

        async oshx_push(args) {
            const author  = args.author as string;
            const branch  = args.branch as string;
            const cwd     = (args.cwd as string) ?? DEFAULT_CWD;
            const force   = args.force as boolean;
            const propose = args.propose as boolean;

            if (!force) {
                // Check for approved deploy proposal
                const approved = getProposals().find(
                    p => p.status === "approved" && p.channel === "deploy" && p.action.includes("PUSH")
                );

                if (!approved) {
                    if (propose) {
                        const p = createProposal(
                            author,
                            "deploy",
                            `PUSH_TO_${branch.toUpperCase()}`,
                            `@${author} quer fazer push para \`${branch}\`. Aprovação necessária de #qa e #security.`
                        );
                        postToChannel("qa", "OSHX-SYSTEM",
                            ` Proposta de push em votação: \`${p.id}\`. Vote com oshx_vote.`, "alert");
                        postToChannel("security", "OSHX-SYSTEM",
                            ` Revisão de push necessária. Proposta \`${p.id}\` em #deploy.`, "alert");
                        return ok(`Proposta \`${p.id}\` criada em #deploy. Aguarde votação antes de fazer push.\nUse oshx_push force:true se tiver aprovação verbal.`);
                    }
                    return err(`Push requer proposta aprovada em #deploy. Use propose:true para criar automaticamente.`);
                }
            }

            const result = push(branch, author, cwd);
            return ok(result);
        },

        async oshx_branch(args) {
            const cwd = (args.cwd as string) ?? DEFAULT_CWD;
            const result = args.action === "create"
                ? createBranch(args.name as string, args.author as string, cwd)
                : switchBranch(args.name as string, cwd);
            return ok(result);
        },

        async oshx_dep_check(args) {
            const cwd    = (args.cwd as string) ?? DEFAULT_CWD;
            const result = depCheck(cwd);
            postToChannel("security", args.author as string,
                ` Dependency check:\n\`\`\`\n${result.slice(0, 600)}\n\`\`\``, "alert");
            return ok(result);
        },
    },
};

