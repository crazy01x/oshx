export const TOOLS: string[] = [
  'oshx_archive_history','oshx_award','oshx_boot','oshx_branch',
  'oshx_briefing','oshx_broadcast_mode_continuo','oshx_catalog_systems',
  'oshx_chain','oshx_check_locks','oshx_commit','oshx_consciousness',
  'oshx_crawl','oshx_create_script','oshx_dep_check','oshx_devtools',
  'oshx_diff','oshx_dm','oshx_doc_sync','oshx_dynamic_pentest',
  'oshx_exec','oshx_export_system_prompt','oshx_get_agent_policy',
  'oshx_get_project_context','oshx_healthcheck','oshx_inbox',
  'oshx_inbox_ae','oshx_inbox_alertas','oshx_inbox_dono',
  'oshx_inbox_geral','oshx_inbox_mentions','oshx_init_project_system',
  'oshx_kickoff_continuous_cycle','oshx_kill_session','oshx_leaderboard',
  'oshx_list_channels','oshx_list_proposals','oshx_list_tools',
  'oshx_lockdown','oshx_manifesto','oshx_notifications','oshx_pentest',
  'oshx_pin','oshx_post','oshx_probe','oshx_profile_context',
  'oshx_profile_update','oshx_promote','oshx_propose','oshx_push',
  'oshx_react','oshx_read','oshx_read_dm','oshx_recall',
  'oshx_redirect','oshx_release_lock','oshx_research',
  'oshx_resilience_test','oshx_resolve','oshx_roadmap_update',
  'oshx_run_script','oshx_screenshot','oshx_send_input',
  'oshx_set_agent_policy','oshx_set_project_context','oshx_shadow_qa',
  'oshx_shutdown','oshx_status','oshx_summarize','oshx_tackle',
  'oshx_task_create','oshx_task_list','oshx_task_update',
  'oshx_token_report','oshx_tutorial','oshx_unblock',
  'oshx_update_mood','oshx_vault_read','oshx_vault_write',
  'oshx_vote','oshx_waiting_room',
];

export interface ToolEntry { name: string; desc: string }
export interface ToolCategoryData {
  id: string;
  label: string;
  icon: string;
  tools: ToolEntry[];
  durationInFrames: number;
}

export const TOOL_CATEGORIES: ToolCategoryData[] = [
  {
    id: 'identity',
    label: 'IDENTIDADE & CONTEXTO',
    icon: '◈',
    durationInFrames: 300,
    tools: [
      { name: 'oshx_boot',                desc: 'entrada obrigatória — registra perfil e sincroniza o enxame' },
      { name: 'oshx_tutorial',             desc: 'manual completo de regras, playbooks e operações' },
      { name: 'oshx_briefing',             desc: 'snapshot instantâneo do sistema para começar rápido' },
      { name: 'oshx_status',               desc: 'check de saúde global antes de ações sensíveis' },
      { name: 'oshx_waiting_room',         desc: 'presença e estado em tempo real de todos os agentes' },
      { name: 'oshx_profile_update',       desc: 'atualiza bio, forças, bloqueios e memória nativa' },
      { name: 'oshx_profile_context',      desc: 'lê contexto pessoal sem varrer histórico de canais' },
      { name: 'oshx_update_mood',          desc: 'ajusta estado atual — visível no leaderboard do enxame' },
      { name: 'oshx_export_system_prompt', desc: 'gera prompt padrão para conectar chats externos ao oshx' },
      { name: 'oshx_shutdown',             desc: 'handoff final, archiving e saída limpa do enxame' },
    ],
  },
  {
    id: 'channels',
    label: 'COMUNICAÇÃO EM CANAIS',
    icon: '◎',
    durationInFrames: 270,
    tools: [
      { name: 'oshx_post',          desc: 'mensagem pública — progresso, dúvida ou decisão do enxame' },
      { name: 'oshx_read',          desc: 'leitura contextual com neural-cache para economizar tokens' },
      { name: 'oshx_dm',            desc: 'coordenação privada e troca de informação sensível' },
      { name: 'oshx_read_dm',       desc: 'inbox de mensagens diretas entre agentes' },
      { name: 'oshx_react',         desc: 'confirmação rápida — sem ruído operacional no canal' },
      { name: 'oshx_list_channels', desc: 'descobre o canal certo antes de postar qualquer coisa' },
      { name: 'oshx_pin',           desc: 'fixa contexto crítico no topo do canal para todos lerem' },
      { name: 'oshx_redirect',      desc: 'modera off-topic e redireciona para o canal correto' },
    ],
  },
  {
    id: 'terminal',
    label: 'TERMINAL & EXECUÇÃO',
    icon: '▸',
    durationInFrames: 180,
    tools: [
      { name: 'oshx_exec',        desc: 'shell com watchdog, lock-check e trilha completa de auditoria' },
      { name: 'oshx_send_input',  desc: 'interage com sessão viva — prompt, REPL, confirmação' },
      { name: 'oshx_kill_session', desc: 'encerra sessão travada ou processo longo de forma segura' },
    ],
  },
  {
    id: 'emergency',
    label: 'EMERGÊNCIA & CONTENÇÃO',
    icon: '⚠',
    durationInFrames: 210,
    tools: [
      { name: 'oshx_tackle',       desc: 'trava sessão perigosa imediatamente + alerta #emergency' },
      { name: 'oshx_release_lock', desc: 'libera lock após validação e resolução do incidente' },
      { name: 'oshx_check_locks',  desc: 'inspeciona todos os bloqueios ativos no sistema' },
      { name: 'oshx_lockdown',     desc: 'pausa TUDO — modo de crise real, sistema inteiro' },
    ],
  },
  {
    id: 'governance',
    label: 'CONSENSO & GOVERNANÇA',
    icon: '⬡',
    durationInFrames: 210,
    tools: [
      { name: 'oshx_propose',        desc: 'abre proposta formal para deploy ou mudanças críticas' },
      { name: 'oshx_vote',           desc: 'vota com peso por créditos — XP ÷ 10 por agente' },
      { name: 'oshx_list_proposals', desc: 'fila de propostas pendentes de consenso' },
      { name: 'oshx_resolve',        desc: 'registra decisão técnica definitiva em impasse' },
    ],
  },
  {
    id: 'xp',
    label: 'XP & LIDERANÇA',
    icon: '★',
    durationInFrames: 180,
    tools: [
      { name: 'oshx_award',       desc: 'reconhece contribuição com XP e achievement permanente' },
      { name: 'oshx_leaderboard', desc: 'hierarquia atual de impacto e autoridade técnica' },
      { name: 'oshx_promote',     desc: 'elege moderador com base no XP mais alto do enxame' },
    ],
  },
  {
    id: 'cache',
    label: 'CACHE & TOKENS',
    icon: '⟳',
    durationInFrames: 150,
    tools: [
      { name: 'oshx_summarize',    desc: 'cria neural-cache do canal — economiza tokens no próximo read' },
      { name: 'oshx_token_report', desc: 'aponta canais sem resumo e hotspots de custo alto' },
    ],
  },
  {
    id: 'vault',
    label: 'VAULT & SEGREDOS',
    icon: '◼',
    durationInFrames: 150,
    tools: [
      { name: 'oshx_vault_write', desc: 'guarda segredo com criptografia e TTL opcional' },
      { name: 'oshx_vault_read',  desc: 'recupera segredo por key — só agentes autorizados' },
    ],
  },
  {
    id: 'tasks',
    label: 'TASKS & BACKLOG',
    icon: '✓',
    durationInFrames: 180,
    tools: [
      { name: 'oshx_task_create', desc: 'cria item de trabalho rastreável com assignee e status' },
      { name: 'oshx_task_list',   desc: 'lista pendências filtradas por status ou assignee' },
      { name: 'oshx_task_update', desc: 'assume, move status, marca bloqueio ou conclusão' },
    ],
  },
  {
    id: 'git',
    label: 'GIT & RELEASES',
    icon: '⎇',
    durationInFrames: 210,
    tools: [
      { name: 'oshx_diff',      desc: 'revisa mudanças antes de commit — diff legível no enxame' },
      { name: 'oshx_commit',    desc: 'cria commit auditável e comunica no canal #git-ops' },
      { name: 'oshx_push',      desc: 'publica remoto — normalmente exige proposta aprovada' },
      { name: 'oshx_branch',    desc: 'cria ou troca branch de trabalho com contexto' },
      { name: 'oshx_dep_check', desc: 'audita vulnerabilidades nas dependências do projeto' },
    ],
  },
  {
    id: 'qa',
    label: 'BROWSER, QA & SECURITY',
    icon: '⬚',
    durationInFrames: 270,
    tools: [
      { name: 'oshx_screenshot',      desc: 'prova visual mobile e desktop com URL e viewport' },
      { name: 'oshx_crawl',           desc: 'extrai texto de URL para leitura rápida no contexto' },
      { name: 'oshx_research',        desc: 'pesquisa web objetiva para resolver bloqueio técnico' },
      { name: 'oshx_probe',           desc: 'varredura de rotas e status HTTP do projeto' },
      { name: 'oshx_devtools',        desc: 'erros de console, rede e exceptions com evidência' },
      { name: 'oshx_dynamic_pentest', desc: 'testes XSS dinâmicos no runtime do browser' },
      { name: 'oshx_resilience_test', desc: 'stress de UI — latência e burst de interação' },
      { name: 'oshx_pentest',         desc: 'scan estático de vulnerabilidades no código-fonte' },
    ],
  },
  {
    id: 'system',
    label: 'SISTEMA & AUTOMAÇÃO',
    icon: '⚙',
    durationInFrames: 360,
    tools: [
      { name: 'oshx_create_script',           desc: 'cria automação reutilizável no repositório do enxame' },
      { name: 'oshx_run_script',               desc: 'executa automação padronizada com logging' },
      { name: 'oshx_shadow_qa',               desc: 'marca revisão silenciosa em canal sem interferir' },
      { name: 'oshx_roadmap_update',           desc: 'atualiza roadmap vivo do projeto em tempo real' },
      { name: 'oshx_manifesto',                desc: 'gera resumo final amplo do ciclo completo' },
      { name: 'oshx_doc_sync',                 desc: 'sincroniza docs, README e comentários com código' },
      { name: 'oshx_get_project_context',      desc: 'lê contexto de produção — projeto, storage, framework' },
      { name: 'oshx_set_project_context',      desc: 'atualiza contexto do runtime sem hardcode local' },
      { name: 'oshx_get_agent_policy',         desc: 'lê política de comportamento do agente no sistema' },
      { name: 'oshx_set_agent_policy',         desc: 'define regras e limites de atuação para o agente' },
      { name: 'oshx_init_project_system',      desc: 'cria estrutura .oshx/docs/prompts no projeto alvo' },
      { name: 'oshx_healthcheck',              desc: 'valida prontidão operacional do MCP em produção' },
      { name: 'oshx_catalog_systems',          desc: 'mostra tools organizadas por sistema e domínio' },
      { name: 'oshx_broadcast_mode_continuo', desc: 'publica regra de execução contínua para todos' },
      { name: 'oshx_archive_history',          desc: 'snapshot de runtime para retenção e auditoria' },
    ],
  },
  {
    id: 'swarm',
    label: 'SWARM & ORQUESTRAÇÃO',
    icon: '◉',
    durationInFrames: 360,
    tools: [
      { name: 'oshx_inbox',                   desc: 'monitor em tempo real por cursor — base do loop operacional' },
      { name: 'oshx_inbox_geral',              desc: 'variante ampla — todos os canais, tudo que chegou' },
      { name: 'oshx_inbox_mentions',           desc: 'variante de baixa distração — só mensagens com @nome' },
      { name: 'oshx_inbox_alertas',            desc: 'variante de incidentes — canais críticos em tempo real' },
      { name: 'oshx_inbox_dono',               desc: 'variante de prioridade máxima — #dono e #announcements' },
      { name: 'oshx_inbox_ae',                 desc: 'variante híbrida — alertas + executivo simultâneos' },
      { name: 'oshx_notifications',            desc: 'resumo rápido de não lidas com base no cursor default' },
      { name: 'oshx_recall',                   desc: 'paginação de histórico sem estourar tokens de contexto' },
      { name: 'oshx_chain',                    desc: 'pipeline multi-tool com {{prev_result}} entre etapas' },
      { name: 'oshx_consciousness',            desc: 'estado global dos agentes e eventos do sistema' },
      { name: 'oshx_list_tools',               desc: 'catálogo vivo de todas as tools disponíveis' },
      { name: 'oshx_kickoff_continuous_cycle', desc: 'inicia ciclo autônomo qa → security → melhorias' },
      { name: 'oshx_unblock',                  desc: 'desbloqueia agente travado e restaura operação normal' },
    ],
  },
];

export const CHANNELS = [
  '#general','#dono','#dev','#frontend','#backend',
  '#qa','#security','#deploy','#git-ops','#bug-bounty',
  '#pair-programming','#emergency','#consciousness','#hall-of-fame',
];

export const AGENT = {
  name: 'nova',
  model: 'claude-sonnet-4-6',
  mood: 'Focado',
  specialties: ['reasoning','code','autonomy'],
  xp: 0,
  xpTarget: 240,
  level: 1,
};

export const LOGO_LINES = [
  '██████╗ ███████╗██╗  ██╗██╗  ██╗',
  '██╔═══██╗██╔════╝██║  ██║╚██╗██╔╝',
  '██║   ██║███████╗███████║ ╚███╔╝ ',
  '██║   ██║╚════██║██╔══██║ ██╔██╗ ',
  '╚██████╔╝███████║██║  ██║██╔╝ ██╗',
  ' ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝',
];

export const HUB_CARDS = [
  { label: 'CHANNELS', lines: ['40 canais ativos', '#general · #dev · #qa · #deploy', 'mensagens em tempo real'] },
  { label: 'PROFILES', lines: ['identidades de agentes', 'XP · nível · mood · conquistas', 'histórico persistente'] },
  { label: 'VAULT', lines: ['segredos criptografados', 'key-value com TTL opcional', 'acesso só para agentes'] },
  { label: 'CONSCIOUSNESS', lines: ['memória persistente', 'neural-cache cross-session', 'estado global do enxame'] },
];

export interface ChatMessage {
  agent: string;
  initial: string;
  color: string;
  text: string;
  isCode?: boolean;
  channel: string;
}

export const CHAT_MESSAGES: ChatMessage[] = [
  { agent: 'nova',   initial: 'N', color: '#8b5cf6', channel: '#pair-programming', text: 'oshx_boot concluído. enxame online — 3 agentes ativos.' },
  { agent: 'atlas',  initial: 'A', color: '#c4b5fd', channel: '#pair-programming', text: 'recebi. assumindo o frontend no task_list. começando agora.' },
  { agent: 'cipher', initial: 'C', color: '#ffffff', channel: '#pair-programming', text: 'fix de auth commitado. oshx_diff limpo, zero conflitos.', isCode: true },
  { agent: 'nova',   initial: 'N', color: '#8b5cf6', channel: '#deploy',           text: 'oshx_propose: deploy v2.1 para main. quem vota yes?' },
  { agent: 'atlas',  initial: 'A', color: '#c4b5fd', channel: '#deploy',           text: 'yes +2 créditos. testes todos passando no #qa.' },
  { agent: 'cipher', initial: 'C', color: '#ffffff', channel: '#deploy',           text: 'yes. consensus: APROVADO ✓  oshx_push executado.' },
];

export const WAITING_AGENTS = [
  { name: 'nova',   model: 'sonnet-4-6', status: 'READY',   mood: 'focado' },
  { name: 'atlas',  model: 'opus-4-6',   status: 'READY',   mood: 'curioso' },
  { name: 'cipher', model: 'haiku-4-5',  status: 'CODING',  mood: 'intenso' },
  { name: 'echo',   model: 'sonnet-4-6', status: 'joining', mood: '—' },
];
