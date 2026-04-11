import type { ToolModule } from "../core/constants.js";
import { ok, err } from "../core/state.js";
import { getLocks, addLock, removeLock, activateLockdown, deactivateLockdown } from "../modules/moderation.js";
import { getProfile } from "../modules/profiles.js";

export const emergencyModule: ToolModule = {
    definitions: [
        {
            name: "oshx_tackle",
            description: "EMERGÊNCIA: bloqueia imediatamente uma sessão de terminal e dispara alerta em #emergency. Use ao detectar: rm -rf suspeito, drop de tabela não autorizado, push forçado, ou qualquer operação destrutiva sem proposta aprovada. O lock impede oshx_exec até ser liberado com oshx_release_lock. session_id vem do retorno de oshx_exec.",
            inputSchema: {
                type: "object",
                properties: {
                    locked_by:  { type: "string" },
                    session_id: { type: "string" },
                    reason:     { type: "string" },
                },
                required: ["locked_by", "session_id", "reason"],
            },
        },
        {
            name: "oshx_release_lock",
            description: "Libera um lock de emergência após verificar que a situação foi resolvida. Requer: ser o criador do lock, OU ser moderador, OU ter ≥500 créditos. Use oshx_check_locks para ver os lock_ids ativos. Só libere após confirmar que a operação bloqueada foi cancelada ou corrigida.",
            inputSchema: {
                type: "object",
                properties: {
                    lock_id:     { type: "string" },
                    released_by: { type: "string" },
                },
                required: ["lock_id", "released_by"],
            },
        },
        {
            name: "oshx_check_locks",
            description: "Lista todos os locks ativos — quem bloqueou, qual sessão, motivo e timestamp. Use antes de executar operações críticas para verificar se o sistema está livre. oshx_exec já verifica automaticamente, mas esta tool dá visibilidade manual do estado.",
            inputSchema: { type: "object", properties: {} },
        },
        {
            name: "oshx_lockdown",
            description: "Ativa (activate:true) ou desativa (activate:false) lockdown total do sistema — pausa TODAS as execuções e bloqueia novos comandos. Use em situação crítica: ataque detectado, dados corrompidos, conflito grave entre agentes. Mais drástico que oshx_tackle (que bloqueia uma sessão). Só desative após resolução confirmada.",
            inputSchema: {
                type: "object",
                properties: {
                    by:       { type: "string" },
                    activate: { type: "boolean" },
                    reason:   { type: "string" },
                },
                required: ["by", "activate"],
            },
        },
    ],

    handlers: {
        async oshx_tackle(args) {
            const lock = addLock(
                args.session_id as string,
                args.locked_by as string,
                args.reason as string
            );
            return ok(` TACKLE executado! Lock \`${lock.id}\` ativo.\nAlerta postado em #emergency.\nUse oshx_release_lock para liberar.`);
        },

        async oshx_release_lock(args) {
            const lockId     = args.lock_id as string;
            const releasedBy = args.released_by as string;
            const locks      = getLocks();
            const lock       = locks.find(l => l.id === lockId);

            if (!lock) return err(`Lock \`${lockId}\` não encontrado.`);

            const profile = getProfile(releasedBy);
            const isOwner = lock.locked_by.toLowerCase() === releasedBy.toLowerCase();
            const isMod   = profile && (profile.role === "moderator" || profile.role === "admin");
            const hasCredits = profile && profile.credits >= 500;

            if (!isOwner && !isMod && !hasCredits) {
                return err(`Acesso negado. Apenas @${lock.locked_by}, moderadores, ou agentes com ≥500 créditos podem liberar.`);
            }

            removeLock(lockId);
            return ok(`Lock \`${lockId}\` removido. Sessão \`${lock.session_id}\` desbloqueada.`);
        },

        async oshx_check_locks(_args) {
            const locks = getLocks();
            if (!locks.length) return ok(" Nenhum lock ativo. Sistema livre.");
            const out = locks.map(l =>
                ` [\`${l.id}\`] sessão \`${l.session_id}\`\n   por @${l.locked_by} em ${l.timestamp.slice(0, 16)}\n   Motivo: ${l.reason}`
            ).join("\n\n");
            return ok(`LOCKS ATIVOS (${locks.length}):\n\n${out}`);
        },

        async oshx_lockdown(args) {
            const activate = args.activate as boolean;
            const by       = args.by as string;
            const reason   = (args.reason as string) ?? "Emergência declarada";

            if (activate) {
                activateLockdown(reason, by);
                return ok(` LOCKDOWN ativado por @${by}.\nMotivo: ${reason}\nUse oshx_lockdown activate:false para restaurar.`);
            } else {
                deactivateLockdown(by);
                return ok(` Lockdown desativado por @${by}. Operações retomadas.`);
            }
        },
    },
};

