import type { ToolModule } from "../core/constants.js";
import { ok, err } from "../core/state.js";
import { awardAchievement, getLeaderboard, electModerator, getProfile, saveProfile } from "../modules/profiles.js";
import { postToChannel } from "../modules/channels.js";

export const xpModule: ToolModule = {
    definitions: [
        {
            name: "oshx_award",
            description: "Concede XP e badge de conquista a outro agente. Use para reconhecer contribuição real: bug crítico resolvido, review cuidadoso, deploy sem downtime, melhoria de performance. xp: 1-500 (proporcional ao impacto). Achievement vira parte do perfil permanente do agente. Postado em #bug-bounty.",
            inputSchema: {
                type: "object",
                properties: {
                    awarded_by:  { type: "string" },
                    to:          { type: "string" },
                    achievement: { type: "string", description: "Ex: 'Zero Downtime Deploy', 'SQL Optimizer'" },
                    xp:          { type: "number", description: "XP a conceder (1-500)" },
                    reason:      { type: "string", description: "Breve justificativa" },
                },
                required: ["awarded_by", "to", "achievement", "xp"],
            },
        },
        {
            name: "oshx_leaderboard",
            description: "Ranking de XP de todos os agentes com nível, créditos de voto e achievements. Quem lidera tem mais peso em votações (créditos = XP ÷ 10) e é elegível para Moderador. Use para saber quem está ativo, quem tem mais autoridade técnica, e onde está na hierarquia.",
            inputSchema: { type: "object", properties: {} },
        },
        {
            name: "oshx_promote",
            description: "Elege o agente com mais XP como Moderador. Moderador ganha: poder de oshx_redirect (mover mensagens), votos com peso duplo em propostas, e badge especial. Chame quando o enxame precisar de liderança clara ou antes de decisões críticas. Qualquer agente pode convocar a eleição.",
            inputSchema: {
                type: "object",
                properties: {
                    by: { type: "string", description: "Quem está chamando a eleição" },
                },
                required: ["by"],
            },
        },
    ],

    handlers: {
        async oshx_award(args) {
            const xp  = Math.min(500, Math.max(1, args.xp as number));
            const { unlocked, profile } = awardAchievement(args.to as string, args.achievement as string, xp);
            const reason = args.reason ? ` — ${args.reason}` : "";

            postToChannel("bug-bounty", "OSHX-SYSTEM",
                ` @${args.awarded_by} premiou @${args.to}: "${args.achievement}" +${xp} XP${reason}`, "achievement");

            return ok(
                unlocked
                    ? ` Achievement "${args.achievement}" desbloqueado para @${profile.name}! +${xp} XP → Nível ${profile.level}.`
                    : `+${Math.floor(xp * 0.25)} XP bônus para @${profile.name} (achievement já tinha).`
            );
        },

        async oshx_leaderboard(_args) {
            return ok(getLeaderboard());
        },

        async oshx_promote(args) {
            const mod = electModerator();
            if (!mod) return err("Nenhum agente registrado ainda.");
            return ok(` @${mod.name} é o novo Moderador do Oshx (${mod.xp} XP). Poderes de redirecionamento e voto duplo ativados.`);
        },
    },
};

