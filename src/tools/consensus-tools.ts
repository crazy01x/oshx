import type { ToolModule } from "../core/constants.js";
import { ok, err } from "../core/state.js";
import { createProposal, getProposals, castVote } from "../modules/voting.js";
import { postToChannel } from "../modules/channels.js";

export const consensusModule: ToolModule = {
    definitions: [
        {
            name: "oshx_propose",
            description: "Cria proposta formal que requer votação do enxame antes de executar. OBRIGATÓRIO para: deploy/push (oshx_push), drop de tabela, remoção de dependência, mudança de arquitetura. Precisa de 30 créditos em 'yes' para aprovar. Créditos = XP ÷ 10. Após criar, notifique o enxame em #general para votar.",
            inputSchema: {
                type: "object",
                properties: {
                    proposer:    { type: "string" },
                    channel:     { type: "string" },
                    action:      { type: "string", description: "Ex: DEPLOY_TO_PRODUCTION, DROP_TABLE_users" },
                    description: { type: "string" },
                },
                required: ["proposer", "channel", "action", "description"],
            },
        },
        {
            name: "oshx_vote",
            description: "Vota 'yes' ou 'no' em uma proposta aberta. Peso do voto = seus créditos (XP ÷ 10). Use oshx_list_proposals para ver as propostas abertas e seus IDs. Após votar, o sistema calcula automaticamente se atingiu 30 créditos em 'yes' para aprovar.",
            inputSchema: {
                type: "object",
                properties: {
                    proposal_id: { type: "string" },
                    voter:       { type: "string" },
                    vote:        { type: "string", enum: ["yes", "no"] },
                },
                required: ["proposal_id", "voter", "vote"],
            },
        },
        {
            name: "oshx_list_proposals",
            description: "Lista propostas abertas aguardando votação, com ID, ação, proponente e placar atual. Verifique periodicamente — se há proposta aberta, vote com oshx_vote. Propostas que acumulam 30 créditos em 'yes' são aprovadas automaticamente.",
            inputSchema: { type: "object", properties: {} },
        },
        {
            name: "oshx_resolve",
            description: "Registra decisão técnica em impasse entre dois caminhos. Use quando o enxame está travado entre opção_a e opção_b — você analisa, escolhe e documenta o raciocínio. A decisão fica registrada em #architecture como referência permanente. Ideal para: escolha de lib, padrão de API, estrutura de banco, estratégia de auth.",
            inputSchema: {
                type: "object",
                properties: {
                    resolver:    { type: "string" },
                    question:    { type: "string", description: "Pergunta técnica em disputa" },
                    option_a:    { type: "string" },
                    option_b:    { type: "string" },
                    reasoning:   { type: "string", description: "Raciocínio e decisão final" },
                    chosen:      { type: "string", enum: ["a", "b"] },
                },
                required: ["resolver", "question", "option_a", "option_b", "reasoning", "chosen"],
            },
        },
    ],

    handlers: {
        async oshx_propose(args) {
            const p = createProposal(
                args.proposer as string,
                args.channel as string,
                args.action as string,
                args.description as string
            );
            return ok(`Proposta \`${p.id}\` criada em #${p.channel}.\nVote: oshx_vote proposal_id:${p.id}`);
        },

        async oshx_vote(args) {
            const { result } = castVote(
                args.proposal_id as string,
                args.voter as string,
                args.vote as "yes" | "no"
            );
            return ok(result);
        },

        async oshx_list_proposals(_args) {
            const open = getProposals().filter(p => p.status === "open");
            if (!open.length) return ok("Nenhuma proposta aberta.");
            const out = open.map(p => {
                const yesW = Object.values(p.votes).filter(v => v.vote === "yes").reduce((a, v) => a + v.weight, 0);
                const noW  = Object.values(p.votes).filter(v => v.vote === "no").reduce((a, v) => a + v.weight, 0);
                return `[\`${p.id}\`] **${p.action}** — @${p.proposer} em #${p.channel}\n${p.description}\nYES ${yesW}/${p.required_weight} · NO ${noW}`;
            }).join("\n\n");
            return ok(out);
        },

        async oshx_resolve(args) {
            const { resolver, question, option_a, option_b, reasoning, chosen } = args as Record<string, string>;
            const decision = chosen === "a" ? option_a : option_b;
            const content  = [
                ` **DECISÃO TÉCNICA** por @${resolver}`,
                `**Questão:** ${question}`,
                `**Opção A:** ${option_a}`,
                `**Opção B:** ${option_b}`,
                `**Escolhida:** ${chosen.toUpperCase()} — ${decision}`,
                `**Raciocínio:** ${reasoning}`,
            ].join("\n");

            postToChannel("architecture", resolver, content);
            return ok(`Decisão registrada em #architecture:\n${content}`);
        },
    },
};

