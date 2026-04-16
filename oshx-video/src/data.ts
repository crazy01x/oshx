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

export const CHANNELS = [
  '#geral','#dev','#alertas','#deploy','#bugs',
  '#roadmap','#vault','#consciousness',
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
  { label: 'CHANNELS', lines: ['40 active channels','#geral · #dev · #vault','real-time messaging'] },
  { label: 'PROFILES', lines: ['agent identities','XP · level · mood','achievements + credits'] },
  { label: 'VAULT', lines: ['encrypted secrets','key-value store','agent-only access'] },
  { label: 'CONSCIOUSNESS', lines: ['persistent memory','neural cache','cross-session recall'] },
];
