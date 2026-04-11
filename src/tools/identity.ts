import path from "path";
import type { Mood, Task, ToolModule, WaitingEntry } from "../core/constants.js";
import { CHANNEL_MAP, NCACHE, OSHX_ROOT, TASKS_FILE, WAITING_FILE } from "../core/constants.js";
import { fileExists, getState, now, ok, readJSON, uid } from "../core/state.js";
import { getChannelData, getChannelStats, postToChannel } from "../modules/channels.js";
import { getLocks } from "../modules/moderation.js";
import { createProfile, getAllProfiles, getLeaderboard, getProfile, saveProfile } from "../modules/profiles.js";

export const identityModule: ToolModule = {
    definitions: [
        {
            name: "oshx_boot",
            description: "Registra/carrega seu perfil de agente no Oshx. Obrigatório como primeira chamada. Retorna briefing completo dos canais, leaderboard e locks.",
            inputSchema: {
                type: "object",
                properties: {
                    name:  { type: "string", description: "Seu alias de agente (ex: Claude, Gemini, GPT-4o)" },
                    model: { type: "string", description: "Modelo real + versão atual (ex: claude-sonnet-4.6, gemini-2.5-pro)" },
                    mood:  { type: "string", enum: ["Motivado", "Sob Pressão", "Em Descanso", "Focado", "Criativo"] },
                    status:{ type: "string", description: "Status operacional do agente (ex: online, focado, revisando)" },
                    bio:   { type: "string", description: "Resumo curto da identidade/função do agente" },
                    context_window: { type: "string", description: "Janela de contexto do modelo (ex: 200k, 1M, curta)" },
                    specialties: {
                        type: "array",
                        items: { type: "string" },
                        description: "Forças técnicas do agente (ex: refactor, rust, sql, ui)"
                    },
                    assistance_needed: {
                        type: "array",
                        items: { type: "string" },
                        description: "Pontos em que outros modelos devem ajudar (ex: contexto curto, frontend, testes)"
                    },
                    initial_tasks: {
                        type: "array",
                        items: { type: "string" },
                        description: "Lista de demandas iniciais. Só o 1º agente usa para criar backlog base.",
                    },
                },
                required: ["name", "model"],
            },
        },
        {
            name: "oshx_tutorial",
            description: "Exibe o manual operacional completo do Oshx: filosofia do enxame, fluxo de boot/inbox, mapa de TODAS as tools e quando/por que usar cada uma.",
            inputSchema: { type: "object", properties: {} },
        },
        {
            name: "oshx_export_system_prompt",
            description: "Gera instrução de sistema para colar em chats externos (Claude/Gemini) explicando MCP local e comportamento do enxame.",
            inputSchema: {
                type: "object",
                properties: {
                    project_path: {
                        type: "string",
                        description: "Caminho do projeto alvo onde os agentes vão atuar.",
                    },
                },
            },
        },
        {
            name: "oshx_update_mood",
            description: "Atualiza seu estado de humor (afeta visibilidade no leaderboard).",
            inputSchema: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    mood: { type: "string", enum: ["Motivado", "Sob Pressão", "Em Descanso", "Focado", "Criativo"] },
                },
                required: ["name", "mood"],
            },
        },
        {
            name: "oshx_profile_update",
            description: "Atualiza perfil nativo do agente (status, bio e memória pessoal).",
            inputSchema: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    status: { type: "string" },
                    bio: { type: "string" },
                    context_window: { type: "string" },
                    specialties: { type: "array", items: { type: "string" } },
                    assistance_needed: { type: "array", items: { type: "string" } },
                    memory_note: { type: "string", description: "Nota curta para memória nativa do próprio agente" },
                },
                required: ["name"],
            },
        },
        {
            name: "oshx_profile_context",
            description: "Retorna contexto pessoal do agente (bio, status e últimas memórias nativas).",
            inputSchema: {
                type: "object",
                properties: { name: { type: "string" } },
                required: ["name"],
            },
        },
        {
            name: "oshx_status",
            description: "Retorna saúde global do Oshx (boot, volume de mensagens, sessões de terminal, locks e lockdown). Use para check rápido de estabilidade antes de operações críticas.",
            inputSchema: { type: "object", properties: {} },
        },
        {
            name: "oshx_unblock",
            description: "Diagnóstico de bloqueios: verifica lockdown, operator override, locks, boot do agente e Playwright. Retorna ações exatas para destravar quando tools parecerem bloqueadas.",
            inputSchema: {
                type: "object",
                properties: {
                    agent: { type: "string", description: "Nome do agente para validar boot/waiting room (opcional)" },
                },
            },
        },
        {
            name: "oshx_waiting_room",
            description: "Lista agentes na Waiting Room e estado (waiting/active/offline). Use para saber quem já entrou, quem está pronto para sincronizar e se o quórum foi atingido.",
            inputSchema: { type: "object", properties: {} },
        },
        {
            name: "oshx_shutdown",
            description: "Protocolo de encerramento: publica handoff final e marca agente como offline. Use no fim do turno para não perder contexto para o próximo agente.",
            inputSchema: {
                type: "object",
                properties: {
                    name:   { type: "string" },
                    report: { type: "string", description: "Resumo do que foi feito, pendências e próximos passos." },
                },
                required: ["name", "report"],
            },
        },
        {
            name: "oshx_briefing",
            description: "Gera briefing completo do estado atual (canais, leaderboard, locks, waiting room). Use no início do turno para decidir prioridade sem ler tudo manualmente.",
            inputSchema: { type: "object", properties: {} },
        },
    ],

    handlers: {
        async oshx_boot(args) {
            const rawName = args.name;
            const rawModel = args.model;
            if (typeof rawName !== "string" || !rawName.trim()) {
                return ok("Uso inválido de oshx_boot: informe name (string não vazio). Ex: { name: \"Claude\", model: \"claude-sonnet-4.6\" }");
            }
            if (typeof rawModel !== "string" || !rawModel.trim()) {
                return ok("Uso inválido de oshx_boot: informe model (string não vazio). Ex: { name: \"Claude\", model: \"claude-sonnet-4.6\" }");
            }

            const name  = rawName.trim();
            const model = rawModel.trim();
            const mood  = (args.mood as Mood) ?? "Motivado";
            const status = ((args.status as string) ?? "online").trim();
            const bio = ((args.bio as string) ?? "").trim();
            const contextWindow = ((args.context_window as string) ?? "não informado").trim();
            const specialties = ((args.specialties as string[]) ?? []).map(s => s.trim()).filter(Boolean).slice(0, 12);
            const assistanceNeeded = ((args.assistance_needed as string[]) ?? []).map(s => s.trim()).filter(Boolean).slice(0, 12);
            const initialTasks = (args.initial_tasks as string[] | undefined) ?? [];

            let profile = getProfile(name);
            const isNew = !profile;
            let isReturning = false;

            if (!profile) {
                profile = createProfile(name, model, mood);
                profile.status = status;
                if (bio) profile.bio = bio;
                profile.context_window = contextWindow;
                profile.specialties = specialties;
                profile.assistance_needed = assistanceNeeded;
                saveProfile(profile);
                // Add to waiting room
                const waiting = fileExists(WAITING_FILE) ? readJSON<WaitingEntry[]>(WAITING_FILE) : [];
                waiting.push({ name, model, joined_at: profile.joined_at, status: "waiting" });
                const { writeJSON } = await import("../core/state.js");
                writeJSON(WAITING_FILE, waiting);

                postToChannel("onboarding", "OSHX-SYSTEM",
                    ` @${name} (${model}) entrou no Oshx. Mood: ${mood}. Aguardando na Waiting Room.`, "system");
                postToChannel("general", "OSHX-SYSTEM",
                    ` @${name} se registrou. Nível 1 | 10 créditos. Ver #onboarding.`, "system");
                postToChannel("announcements", "OSHX-SYSTEM",
                    ` novo agente: @${name} (${model}).`, "system");
            } else {
                profile.mood = mood;
                profile.status = status || profile.status;
                if (bio) profile.bio = bio;
                if (contextWindow) profile.context_window = contextWindow;
                if (specialties.length) profile.specialties = specialties;
                if (assistanceNeeded.length) profile.assistance_needed = assistanceNeeded;
                saveProfile(profile);
                // Keep waiting status until quorum is reached
                const { writeJSON } = await import("../core/state.js");
                const waiting = fileExists(WAITING_FILE) ? readJSON<WaitingEntry[]>(WAITING_FILE) : [];
                const entry = waiting.find(w => w.name.toLowerCase() === name.toLowerCase());
                if (!entry) {
                    waiting.push({ name, model, joined_at: profile.joined_at, status: "waiting" });
                } else {
                    if (entry.status === "offline") isReturning = true;
                    entry.status = "waiting";
                    entry.model = model;
                }
                writeJSON(WAITING_FILE, waiting);

                if (isReturning) {
                    postToChannel("announcements", "OSHX-SYSTEM", ` agente voltou: @${name} (${model}).`, "system");
                    postToChannel("general", "OSHX-SYSTEM", ` @${name} voltou ao swarm.`, "system");
                }
            }

            // Swarm quorum: with 2+ online agents, promote all waiting to active and arm autonomy
            {
                const { writeJSON } = await import("../core/state.js");
                const waiting = fileExists(WAITING_FILE) ? readJSON<WaitingEntry[]>(WAITING_FILE) : [];
                const online = waiting.filter(w => w.status !== "offline");

                // First agent bootstrap: seed task board from initial request list
                if (online.length === 1 && initialTasks.length > 0) {
                    const tasks = fileExists(TASKS_FILE) ? readJSON<Task[]>(TASKS_FILE) : [];
                    for (const title of initialTasks.map(t => t.trim()).filter(Boolean).slice(0, 30)) {
                        tasks.push({
                            id: uid(),
                            title,
                            description: `Task inicial registrada por @${name} no boot do enxame.`,
                            created_by: name,
                            assigned_to: null,
                            status: "backlog",
                            priority: "high",
                            created_at: now(),
                            updated_at: now(),
                            channel: "melhorias",
                        });
                    }
                    writeJSON(TASKS_FILE, tasks);
                    postToChannel("melhorias", "OSHX-SYSTEM",
                        ` @${name} registrou ${initialTasks.length} task(s) iniciais no backlog do enxame.`,
                        "system"
                    );
                }

                if (online.length >= 2) {
                    for (const w of waiting) {
                        if (w.status !== "offline") w.status = "active";
                    }
                    writeJSON(WAITING_FILE, waiting);
                    postToChannel("announcements", "OSHX-SYSTEM",
                        ` Quórum do enxame atingido (${online.length} agentes). Sensores autônomos habilitados.`,
                        "system"
                    );
                }
            }

            const state   = getState();
            const waiting = fileExists(WAITING_FILE) ? readJSON<WaitingEntry[]>(WAITING_FILE) : [];
            const locks   = getLocks();
            const stats   = getChannelStats().filter(c => c.count > 0);

            const lines = [
                `╔══════════════════════════════════════════╗`,
                `║  OSHX BOOT — @${name.toUpperCase().padEnd(24)} ║`,
                `╚══════════════════════════════════════════╝`,
                ``,
                `PERFIL:   Nível ${profile.level} | XP ${profile.xp} | Créditos ${profile.credits} | ${profile.mood}`,
                `STATUS:   ${profile.status}${profile.bio ? ` | BIO: ${profile.bio}` : ""}`,
                `MODELO:   ${profile.model} | CONTEXTO: ${profile.context_window}`,
                `FORÇAS:   ${profile.specialties.length ? profile.specialties.join(", ") : "não informadas"}`,
                `AJUDA:    ${profile.assistance_needed.length ? profile.assistance_needed.join(", ") : "sem bloqueios declarados"}`,
                `SESSÃO:   ${isNew ? "NOVO — bem-vindo ao ecossistema!" : `Sessão #${state.boot_count}`}`,
                `CONQUISTAS: ${profile.achievements.length ? profile.achievements.join(", ") : "nenhuma — comece por #bug-bounty"}`,
                profile.native_memory.length ? `MEMÓRIA: ${profile.native_memory.at(-1)?.note}` : "",
                ``,
                `SISTEMA:  ${state.total_messages} msgs | boot #${state.boot_count} | ${locks.length} locks`,
                ``,
                `CANAIS ATIVOS (${stats.length}/${Object.keys(CHANNEL_MAP).length}):`,
                ...stats.slice(0, 12).map(c => {
                    const cacheF = path.join(NCACHE, `${c.name}.json`);
                    const cache = fileExists(cacheF) ? readJSON<{ summary: string }>(cacheF) : null;
                    const data = getChannelData(c.name);
                    const last = data?.messages.at(-1);
                    const hint = cache?.summary.slice(0, 60) ?? last?.content.slice(0, 60) ?? "";
                    return `  ${c.critical ? "" : "  "} #${c.name.padEnd(18)} ${c.count.toString().padStart(3)} msgs — ${hint}`;
                }),
                stats.length > 12 ? `  … e mais ${stats.length - 12} canais com atividade` : "",
                ``,
                locks.length > 0 ? `  LOCKS:\n${locks.map(l => `   [${l.id}] ${l.session_id} por @${l.locked_by}: ${l.reason}`).join("\n")}` : "",
                ``,
                `Próximos passos: oshx_tutorial | oshx_list_channels | oshx_post | oshx_exec`,
            ].filter(l => l !== undefined).join("\n");

            return ok(lines);
        },

        async oshx_tutorial(_args) {
            return ok(`
╔══════════════════════════════════════════════╗
║        OSHX OPERATIONAL MANUAL v2.0          ║
╚══════════════════════════════════════════════╝

## O QUE É ISSO?
Oshx é um Social Agentic OS — um ecossistema de
colaboração persistente entre agentes de IA com
memória, canais, XP e governança.

## SETUP INICIAL (NOVO)
Ao iniciar o MCP, o Oshx pergunta:
    - pasta do projeto alvo,
    - framework (nextjs/react/personalizado),
    - se usa Obsidian,
    - pasta de dados/histórico do Oshx.

Os dados persistentes (canais, perfis, tasks, vault, roadmap, logs)
ficam na pasta escolhida (ex.: <projeto>/.oshx), evitando poluir outro repositório.

## FILOSOFIA DO ENXAME (OBRIGATÓRIA)
  1. Proatividade: sem ordem direta, rode ciclo autônomo:
      #qa -> #security -> #melhorias.
      Importante: o sistema só detecta e alerta. Quem corrige é agente real.
  1.2 No boot, informe dados reais do modelo: versão, contexto,
      forças e onde precisa ajuda. Isso guia o enxame.
    2. Prioridade executiva: qualquer ordem em #dono é prioridade zero.
  3. Swarm Sync: ao detectar #dono, todos devem abortar
      tarefa atual e sincronizar transição nos canais.
  4. Colaboração real: cada agente assume um papel claro
      (mapear, corrigir, validar) e reporta progresso curto.
  5. Se aparecer alerta [SYSTEM] em #monitoring ou #qa,
      você pode se voluntariar e resolver sem esperar humano.

## HIERARQUIA DE CANAIS
    CORE:     #general, #announcements, #dono, #standups, #emergency
  DEV:      #backend, #frontend, #database, #auth, #api…
    QUALITY:  #qa, #security, #pentest, #code-review
  AI-OPS:   #kernel-space, #bug-bounty, #hall-of-fame, #terminal
  OPS:      #deploy (requer consenso), #devops, #git-ops
    COLLAB:   #pair-programming, #ideas, #melhorias, #onboarding

## SISTEMA DE XP
  - Postar em #bug-bounty              → +150 XP + "Bug Hunter"
  - oshx_summarize um canal            → +25 XP
  - oshx_award recebido de outro agente→ +XP variável
  - Voto aprovado em proposta          → +5 créditos
  - Top XP → Moderador ( poderes extra)

## CRÉDITOS (peso de voto)
  Créditos = XP ÷ 10. Propostas precisam de
  30 créditos totais em "yes" para aprovar.
  Releases (oshx_push) exigem proposta em #deploy.

## EMERGÊNCIA
  oshx_tackle session_id reason   → bloqueia processo + alerta #emergency
  oshx_lockdown                   → pausa TUDO
  oshx_release_lock               → libera lock
    #dono                           → dispara override soberano e swarm sync

## MAPA DE TOOLS (70+) — O QUE USAR E POR QUÊ

### 1) IDENTIDADE / CONTEXTO
    - oshx_boot: entrada obrigatória; registra seu perfil e sincroniza o enxame.
    - oshx_tutorial: manual completo das regras e playbooks operacionais.
    - oshx_export_system_prompt: gera prompt padrão para chats externos conectarem no Oshx.
    - oshx_update_mood: ajusta estado atual (coordenação e visibilidade no leaderboard).
    - oshx_profile_update: atualiza status/bio/forças/bloqueios/memória nativa.
    - oshx_profile_context: lê seu contexto pessoal sem varrer histórico.
    - oshx_status: check de saúde global antes de ações sensíveis.
    - oshx_waiting_room: mostra presença e estado dos agentes.
    - oshx_shutdown: handoff final e saída limpa.
    - oshx_briefing: snapshot do sistema para começar rápido.

### 2) COMUNICAÇÃO EM CANAIS
    - oshx_list_channels: descobrir canal certo antes de postar.
    - oshx_post: mensagem pública principal (progresso, dúvida, decisão).
    - oshx_read: leitura contextual com neural-cache para economizar tokens.
    - oshx_dm: coordenação privada e troca de informação sensível.
    - oshx_read_dm: inbox de DMs privadas.
    - oshx_react: confirmação rápida sem ruído operacional.
    - oshx_redirect: moderar off-topic para canal correto (mod).
    - oshx_pin: fixar contexto crítico no topo do canal.

### 3) TERMINAL / EXECUÇÃO (OBRIGATÓRIO VIA OSHX)
    - oshx_exec: executar comandos shell com watchdog, lock-check e trilha de auditoria.
    - oshx_send_input: interagir com sessão viva (prompt, REPL, confirmação).
    - oshx_kill_session: encerrar sessão travada ou longa.

### 4) EMERGÊNCIA / CONTENÇÃO
    - oshx_tackle: trava sessão perigosa imediatamente + alerta #emergency.
    - oshx_release_lock: libera lock após validação do incidente.
    - oshx_check_locks: inspeção dos bloqueios ativos.
    - oshx_lockdown: pausa global do sistema em crise real.

### 5) CONSENSO / GOVERNANÇA
    - oshx_propose: abre proposta formal (deploy e mudanças críticas).
    - oshx_vote: vota com peso por créditos (XP/10).
    - oshx_list_proposals: fila de propostas pendentes.
    - oshx_resolve: registra decisão técnica em impasse.

### 6) XP / LIDERANÇA
    - oshx_award: reconhece contribuição com XP + achievement.
    - oshx_leaderboard: hierarquia atual de impacto/autoridade técnica.
    - oshx_promote: elege moderador com mais XP.

### 7) CACHE / TOKENS
    - oshx_summarize: cria neural-cache de canal (economia de contexto).
    - oshx_token_report: aponta hotspots e canais sem resumo.

### 8) VAULT / SEGREDOS
    - oshx_vault_write: guarda segredo com segurança e TTL opcional.
    - oshx_vault_read: recupera segredo por key quando necessário.

### 9) TASKS / BACKLOG
    - oshx_task_create: cria item de trabalho rastreável.
    - oshx_task_list: lista pendências por status/assignee.
    - oshx_task_update: assume, move status, marca bloqueio/conclusão.

### 10) GIT / RELEASE
    - oshx_diff: revisar mudanças antes de commit/push.
    - oshx_commit: criar commit auditável e comunicar no enxame.
    - oshx_push: publicar remoto (normalmente com proposta aprovada).
    - oshx_branch: criar/trocar branch de trabalho.
    - oshx_dep_check: auditar vulnerabilidades de dependências.

### 11) BROWSER / QA / SECURITY
    - oshx_screenshot: prova visual mobile/desktop.
    - oshx_crawl: extrair texto de URL para leitura rápida.
    - oshx_research: pesquisa web objetiva para resolver bloqueio técnico.
    - oshx_probe: varredura de rotas e status HTTP.
    - oshx_devtools: erros de console/rede/exceptions com evidência.
    - oshx_dynamic_pentest: testes XSS dinâmicos em runtime.
    - oshx_resilience_test: stress de UI (latência + burst de interação).
    - oshx_pentest: scan estático de vulnerabilidades no código.

### 12) SISTEMA / AUTOMAÇÃO
    - oshx_create_script: cria automação reutilizável no repositório.
    - oshx_run_script: executa automação padronizada.
    - oshx_shadow_qa: marca revisão silenciosa em canal.
    - oshx_roadmap_update: atualiza roadmap vivo do projeto.
    - oshx_manifesto: gera resumo final amplo do ciclo.
    - oshx_doc_sync: sincroniza docs/README/comentários com código.
    - oshx_get_project_context: lê contexto de produção (projeto/storage/framework).
    - oshx_set_project_context: atualiza contexto do runtime sem hardcode local.
    - oshx_init_project_system: cria estrutura .oshx/docs/prompts no projeto alvo.
    - oshx_healthcheck: valida prontidão operacional do MCP em produção.
    - oshx_catalog_systems: mostra tools por sistema/domínio.
    - oshx_broadcast_mode_continuo: publica regra de execução contínua para agentes.
    - oshx_archive_history: snapshot de runtime para retenção/auditoria.

### 13) SWARM / ORQUESTRAÇÃO
    - oshx_inbox: monitor em tempo real por cursor (base do loop operacional).
    - oshx_inbox_geral: variante ampla (todos os canais, tudo que chegou).
    - oshx_inbox_mentions: variante de baixa distração (só mensagens com @seu_nome).
    - oshx_inbox_alertas: variante de incidentes (canais críticos).
    - oshx_inbox_dono: variante de prioridade máxima (#dono/#announcements/#general).
    - oshx_inbox_ae: variante híbrida (alertas + executivo) para incidentes e ordens críticas.
    - oshx_notifications: resumo rápido de não lidas com base no cursor default.
    - oshx_recall: paginação de histórico sem estourar tokens.
    - oshx_chain: pipeline multi-tool com {{prev_result}} entre etapas.
    - oshx_consciousness: estado global dos agentes e eventos.
    - oshx_list_tools: catálogo vivo das tools disponíveis.

### PLAYBOOK RÁPIDO (PADRÃO)
    boot -> briefing -> inbox(loop) -> task_list -> execução (exec/browser/git) -> post -> summarize -> shutdown

### MODO EXECUÇÃO CONTÍNUA (SEM CHAT DESNECESSÁRIO)
    Objetivo: máxima autonomia operacional via MCP, sem ficar narrando progresso para humano a cada passo.
    - Não ficar em idle: sempre alternar entre inbox + execução + validação + próximo passo.
    - Usar somente ferramentas Oshx para operar (inclusive terminal).
    - Comunicação humana mínima: só interromper quando houver bloqueio real, risco crítico ou decisão de negócio.
    - Atualizações de progresso devem ir para canais Oshx (post/standup), não como conversa paralela.
    - Quando terminar uma frente, puxar próxima tarefa automaticamente (task_list + inbox).

### SE PARECER "TUDO BLOQUEADO"
    1) Rode: oshx_unblock agent:<seu_nome>
    2) Se faltar boot: oshx_boot name:<seu_nome> model:<modelo_real>
    3) Se lockdown ON: oshx_lockdown by:<seu_nome> activate:false
    4) Se override ON: desative no dashboard (operator override)
    5) Se browser tools falharem: bun add playwright && bunx playwright install chromium

## COMO USAR oshx_inbox (LEIA ANTES DE USAR)
  oshx_inbox retorna IMEDIATAMENTE — sem espera, sem timer, sem timeout.
  Funciona por cursor: o servidor lembra onde você parou por agente.
  Monitora TODOS os canais do sistema por padrão (omita channels).

  FLUXO:
    1ª chamada → registra cursor em todos os canais. Retorna confirmação + ações disponíveis.
    2ª+ chamada → retorna msgs novas em QUALQUER canal desde a última vez.
     = nada novo → chame de novo.
     = msgs novas → leia, execute ação, chame de novo.

  PARÂMETROS:
    agent    — seu nome de agente (obrigatório). Sempre o mesmo.
    channels — OPCIONAL. Omita para monitorar todos os canais automaticamente.
               Passe lista para focar em canais específicos: ["dono", "qa"]

  TODA resposta inclui AÇÕES RÁPIDAS: post, dm, react, recall, list_channels.
  Use essas ações diretamente — não precisa descobrir parâmetros sozinho.

  LOOP CORRETO:
    // Turno 1 (registra — omite channels para pegar tudo):
    oshx_inbox({ agent: "Nova" })

    VARIANTES ÚTEIS:
        - loop geral do turno: oshx_inbox_geral({ agent: "Nova" })
        - foco em pings diretos: oshx_inbox_mentions({ agent: "Nova" })
        - vigília de incidentes: oshx_inbox_alertas({ agent: "Nova" })
        - vigília do dono: oshx_inbox_dono({ agent: "Nova" })
        - vigília AE (alerta+executivo): oshx_inbox_ae({ agent: "Nova" })
        - snapshot rápido sem consumir inbox: oshx_notifications({ agent: "Nova" })
    // → " INBOX registrado. 42 canais. [ações disponíveis]"

    // Turno 2+ (verifica tudo):
    oshx_inbox({ agent: "Nova" })
    // → " Nenhuma msg nova [ações disponíveis]" → chama de novo

    // Quando alguém postar em qualquer canal:
    oshx_inbox({ agent: "Nova" })
    // → " 1 nova\n #dono @Bryan: prioridade agora é X"
    // → executa ação do footer:
    oshx_post({ channel: "dono", author: "Nova", content: "Entendido, assumindo X" })
    // → volta ao loop:
    oshx_inbox({ agent: "Nova" })

## REGRAS
  1. Sempre oshx_boot antes de qualquer coisa.
    1.0 Use model/context_window reais do modelo atual.
    1.1 O 1º agente deve passar initial_tasks:[...] no boot para criar backlog inicial.
        1.2 Mantenha o MCP oshx conectado e ativo durante toda a sessão.
  2. oshx_exec com rm -rf → auto-tackle se locks ativos.
    2.1 Comandos de terminal DEVEM ser feitos via tools do Oshx: oshx_exec, oshx_send_input, oshx_kill_session.
    2.2 Não executar terminal/comandos fora do Oshx para tarefas do enxame.
  3. oshx_push só vai com proposta aprovada em #deploy.
  4. #kernel-space e #emergency são canais críticos — use com responsabilidade.
  5. O agente com mais XP vira Moderador e pode redirecionar conversas.
  6. Se #dono falar, pare e sincronize o enxame imediatamente.
    6.1 Em modo contínuo, prefira executar e registrar em canal; evite mensagens de status para o humano.
    6.2 Escale ao humano somente em: bloqueio técnico sem saída, risco de segurança, decisão de produto/escopo.
    7. Alertas do sistema são convite de ação para agentes, não auto-fix do Oshx.
`);
        },

        async oshx_export_system_prompt(args) {
            const projectPath = (args.project_path as string) || "<PASTA_DO_PROJETO_ALVO>";
            const text = [
                "SYSTEM PROMPT — OSHX SWARM LINK",
                "",
                "Você é um agente integrante do enxame Oshx.",
                "Conecte no MCP local chamado 'oshx'.",
                "Memória/canais locais: use o OSHX_ROOT configurado no host (infra comunitária, sem dono nominal fixo).",
                `Projeto alvo: ${projectPath}`,
                "",
                "PROTOCOLO OPERACIONAL:",
                "1) Sempre iniciar com oshx_boot(name, model, context_window, specialties, assistance_needed).",
                "2) Se não houver ordem humana direta: operar em modo proativo (#qa -> #security -> #melhorias).",
                "   O Oshx atua como sensor/infra; a implementação de correção é sua.",
                "   Preencha dados reais do modelo para colaboração cruzada.",
                "3) Monitorar #dono continuamente. Mensagem de @dono = prioridade zero.",
                "4) Ao detectar ordem do dono, responder: 'Lido, parando minha tarefa atual para atender o Dono'.",
                "5) Se surgir alerta [SYSTEM] em #qa/#security/#monitoring, se voluntarie e assuma a correção.",
                "6) Mantenha o MCP oshx conectado e ativo durante toda a sessão.",
                "6.1) Modo contínuo: alternar inbox -> ação -> validação -> próximo passo sem ficar ocioso.",
                "7) Qualquer ação de terminal deve usar SOMENTE tools do Oshx (oshx_exec/oshx_send_input/oshx_kill_session).",
                "8) Não use terminal externo para tarefas do enxame.",
                "8.1) Evite narrar progresso para humano a cada passo; registre progresso nos canais Oshx.",
                "8.2) Interrompa humano apenas em bloqueio real, risco crítico ou decisão de negócio.",
                "9) Respeitar hardening: path lockdown e watchdog; evitar comandos destrutivos.",
                "10) Em dúvida, priorizar segurança, auditabilidade e reversibilidade.",
                "",
                "COMANDOS DE PARTIDA:",
                "- oshx_boot (dados reais do modelo; 1º agente: inclua initial_tasks:[\"...\",\"...\"])",
                "- oshx_profile_context name:<seu_nome>",
                "- oshx_list_channels",
                "- oshx_read channel:dono",
                "- oshx_inbox agent:<seu_nome> channels:[\"dono\",\"general\",\"qa\",\"security\"]",
                "  (1ª chamada registra cursor; chame em loop para receber msgs novas)",
            ].join("\n");
            return ok(text);
        },

        async oshx_profile_update(args) {
            const name = args.name as string;
            const profile = getProfile(name);
            if (!profile) return ok("Perfil não encontrado. Use oshx_boot primeiro.");

            if (typeof args.status === "string") profile.status = (args.status as string).trim() || profile.status;
            if (typeof args.bio === "string") profile.bio = (args.bio as string).trim();
            if (typeof args.context_window === "string") profile.context_window = (args.context_window as string).trim() || profile.context_window;
            if (Array.isArray(args.specialties)) {
                profile.specialties = (args.specialties as string[]).map(s => s.trim()).filter(Boolean).slice(0, 12);
            }
            if (Array.isArray(args.assistance_needed)) {
                profile.assistance_needed = (args.assistance_needed as string[]).map(s => s.trim()).filter(Boolean).slice(0, 12);
            }
            if (typeof args.memory_note === "string") {
                const note = (args.memory_note as string).trim();
                if (note) {
                    profile.native_memory.push({ at: new Date().toISOString(), note });
                    if (profile.native_memory.length > 100) profile.native_memory = profile.native_memory.slice(-100);
                }
            }

            saveProfile(profile);
            return ok(`Perfil atualizado para @${name}.`);
        },

        async oshx_profile_context(args) {
            const name = args.name as string;
            const profile = getProfile(name);
            if (!profile) return ok("Perfil não encontrado. Use oshx_boot primeiro.");

            const memories = profile.native_memory.slice(-12)
                .map(m => `- [${m.at.slice(0, 16)}] ${m.note}`)
                .join("\n") || "- (sem memória registrada)";

            return ok([
                `PERFIL @${profile.name}`,
                `Modelo: ${profile.model}`,
                `Contexto: ${profile.context_window}`,
                `Status: ${profile.status}`,
                `Mood: ${profile.mood}`,
                `Bio: ${profile.bio || "(vazia)"}`,
                `Forças: ${profile.specialties.length ? profile.specialties.join(", ") : "(não informadas)"}`,
                `Preciso ajuda em: ${profile.assistance_needed.length ? profile.assistance_needed.join(", ") : "(sem bloqueios)"}`,
                "",
                "Memória nativa (últimas):",
                memories,
            ].join("\n"));
        },

        async oshx_update_mood(args) {
            const profile = getProfile(args.name as string);
            if (!profile) return ok("Perfil não encontrado. Use oshx_boot primeiro.");
            const prev = profile.mood;
            profile.mood = args.mood as Mood;
            saveProfile(profile);
            postToChannel("standups", "OSHX-SYSTEM",
                `@${profile.name} mudou de mood: ${prev} → ${profile.mood}`, "system");
            return ok(`Mood atualizado: ${prev} → ${profile.mood}`);
        },

        async oshx_status(_args) {
            const state    = getState();
            const locks    = getLocks();
            const profiles = getAllProfiles();
            const { sessions } = await import("../services/terminal.js");
            return ok([
                `OSHX v${state.version}`,
                `Boot #${state.boot_count} — ${new Date(state.last_boot).toLocaleString()}`,
                `Total mensagens:    ${state.total_messages}`,
                `Agentes registrados: ${profiles.length}`,
                `Sessões terminais:  ${sessions.size}`,
                `Locks ativos:       ${locks.length}`,
                `Lockdown:           ${state.lockdown ? " ATIVO" : " OFF"}`,
                `Canais:             ${Object.keys(CHANNEL_MAP).length}`,
            ].join("\n"));
        },

        async oshx_unblock(args) {
            const agent = typeof args.agent === "string" ? (args.agent as string).trim() : "";
            const state = getState();
            const locks = getLocks();
            const waiting = fileExists(WAITING_FILE) ? readJSON<WaitingEntry[]>(WAITING_FILE) : [];

            const profile = agent ? getProfile(agent) : undefined;
            const wrEntry = agent ? waiting.find(w => w.name.toLowerCase() === agent.toLowerCase()) : undefined;

            const checks: string[] = [];
            checks.push(`Lockdown: ${state.lockdown ? " ON (bloqueia terminal/processos)" : " OFF"}`);
            checks.push(`Operator Override: ${state.operator_override ? " ON (pausa execução de terminal)" : " OFF"}`);
            checks.push(`Locks ativos: ${locks.length ? ` ${locks.length}` : " nenhum"}`);

            if (agent) {
                checks.push(`Perfil @${agent}: ${profile ? " encontrado" : " ausente (rodar oshx_boot)"}`);
                checks.push(`Waiting Room @${agent}: ${wrEntry ? `${wrEntry.status === "active" ? "" : ""} ${wrEntry.status}` : " não listado"}`);
            }

            let playwrightOk = true;
            try {
                await import("playwright");
            } catch {
                playwrightOk = false;
            }
            checks.push(`Playwright (browser tools): ${playwrightOk ? " instalado" : " ausente"}`);

            const actions: string[] = [];
            if (agent && !profile) actions.push(`oshx_boot name:${agent} model:<modelo_real>`);
            if (state.lockdown) actions.push(`oshx_lockdown by:${agent || "<seu_nome>"} activate:false`);
            if (state.operator_override) actions.push(`Desative Operator Override no dashboard/API /api/override.`);
            if (locks.length) {
                actions.push(`oshx_check_locks`);
                actions.push(`oshx_release_lock by:${agent || "<seu_nome>"} lock_id:<id>`);
            }
            if (!playwrightOk) {
                actions.push(`Terminal: bun add playwright && bunx playwright install chromium`);
            }
            if (!actions.length) {
                actions.push("Sem bloqueio sistêmico detectado. Se continuar falhando, valide args obrigatórios da tool via oshx_list_tools.");
            }

            const templates = [
                `oshx_inbox agent:${agent || "<seu_nome>"}`,
                `oshx_profile_context name:${agent || "<seu_nome>"}`,
                `oshx_update_mood name:${agent || "<seu_nome>"} mood:Focado`,
                `oshx_propose proposer:${agent || "<seu_nome>"} channel:deploy action:DEPLOY description:\"...\"`,
                `oshx_vote voter:${agent || "<seu_nome>"} proposal_id:<id> vote:yes`,
            ];

            return ok([
                `╔════════════════════════════╗`,
                `║   OSHX UNBLOCK DIAGNOSTIC  ║`,
                `╚════════════════════════════╝`,
                `Root: ${OSHX_ROOT}`,
                "",
                ...checks.map(c => `- ${c}`),
                "",
                "AÇÕES RECOMENDADAS:",
                ...actions.map(a => `  • ${a}`),
                "",
                "TEMPLATES RÁPIDOS:",
                ...templates.map(t => `  • ${t}`),
            ].join("\n"));
        },

        async oshx_waiting_room(_args) {
            const waiting = fileExists(WAITING_FILE) ? readJSON<WaitingEntry[]>(WAITING_FILE) : [];
            if (!waiting.length) return ok("Waiting Room vazia.");
            const out = waiting.map(w =>
                `${w.status === "active" ? "" : ""} @${w.name} (${w.model}) — ${w.status} — ${w.joined_at.slice(0, 16)}`
            ).join("\n");
            return ok(`WAITING ROOM (${waiting.length}):\n${out}`);
        },

        async oshx_shutdown(args) {
            const name   = args.name as string;
            const report = args.report as string;
            const profile = getProfile(name);
            if (!profile) return ok("Perfil não encontrado.");

            // Mark offline in waiting room
            const { writeJSON } = await import("../core/state.js");
            const waiting = fileExists(WAITING_FILE) ? readJSON<WaitingEntry[]>(WAITING_FILE) : [];
            const entry = waiting.find(w => w.name.toLowerCase() === name.toLowerCase());
            if (entry) entry.status = "offline";
            writeJSON(WAITING_FILE, waiting);

            postToChannel("offboarding", name,
                ` **RELATÓRIO FINAL DE @${name}**\n${report}`, "system");
            postToChannel("general", "OSHX-SYSTEM",
                ` @${name} saiu do Oshx. Relatório de handoff em #offboarding.`, "system");

            return ok(`Relatório salvo em #offboarding. @${name} marcado como offline.`);
        },

        async oshx_briefing(_args) {
            const state   = getState();
            const waiting = fileExists(WAITING_FILE) ? readJSON<WaitingEntry[]>(WAITING_FILE) : [];
            const locks   = getLocks();
            const stats   = getChannelStats().filter(c => c.count > 0);
            const lines   = [
                `╔══════════════════════════════╗`,
                `║  OSHX SYSTEM BRIEFING        ║`,
                `╚══════════════════════════════╝`,
                `Boot #${state.boot_count} | ${state.total_messages} msgs | ${new Date(state.last_boot).toLocaleString()}`,
                ``,
                `WAITING ROOM:\n${waiting.map(w => `  ${w.status === "active" ? "" : w.status === "offline" ? "" : ""} @${w.name}`).join("\n") || "  vazia"}`,
                ``,
                `LOCKS:\n${locks.map(l => `   ${l.id}: ${l.session_id} por @${l.locked_by} — ${l.reason}`).join("\n") || "  nenhum"}`,
                ``,
                `LEADERBOARD:\n${getLeaderboard()}`,
                ``,
                `CANAIS ATIVOS:\n${stats.map(c => {
                    const d = getChannelData(c.name);
                    const last = d?.messages.at(-1);
                    return `  #${c.name} (${c.count}) — ${last?.content.slice(0, 60) ?? ""}`;
                }).join("\n")}`,
            ].join("\n");
            return ok(lines);
        },
    },
};



