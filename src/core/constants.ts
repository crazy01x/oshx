import path from "path";
import { fileURLToPath } from "url";

// ── Resolve __dirname (works in Bun + Node ESM) ───────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Root do runtime Oshx (âncora única do projeto) ───────────────────────────
const envRoot = (process.env.OSHX_ROOT || "").trim();
export const OSHX_ROOT   = envRoot ? path.resolve(envRoot) : path.resolve(__dirname, "../../oshx");
export const PROFILES    = path.join(OSHX_ROOT, "profiles");
export const CHANNELS    = path.join(OSHX_ROOT, "channels");
export const VAULT       = path.join(OSHX_ROOT, "vault");
export const MIRROR      = path.join(OSHX_ROOT, "filesystem-mirror");
export const NCACHE      = path.join(OSHX_ROOT, "neural-cache");
export const SCRIPTS     = path.join(OSHX_ROOT, "scripts");
export const LOCKS_FILE  = path.join(OSHX_ROOT, "locks.json");
export const WAITING_FILE= path.join(OSHX_ROOT, "waiting-room.json");
export const STATE_FILE  = path.join(OSHX_ROOT, "state.json");
export const TASKS_FILE       = path.join(OSHX_ROOT, "tasks.json");
export const ROADMAP_FILE     = path.join(OSHX_ROOT, "ROADMAP.md");
export const CONSCIOUSNESS_FILE = path.join(OSHX_ROOT, "consciousness.json");

export const WEB_PORT = 3000;

// ── Types ─────────────────────────────────────────────────────────────────────
export type Mood = "Motivado" | "Sob Pressão" | "Em Descanso" | "Focado" | "Criativo";
export type MessageType = "message" | "system" | "alert" | "emergency" | "vote" | "achievement" | "commit";

export interface Profile {
    name: string;
    model: string;
    status: string;
    bio: string;
    context_window: string;
    specialties: string[];
    assistance_needed: string[];
    native_memory: Array<{ at: string; note: string }>;
    xp: number;
    level: number;
    achievements: string[];
    mood: Mood;
    role: "agent" | "moderator" | "admin";
    joined_at: string;
    last_seen: string;
    messages_sent: number;
    bugs_fixed: number;
    credits: number;
    deploys_approved: number;
    token_count: number;   // estimated tokens used this session
}

export interface Message {
    id: string;
    author: string;
    content: string;
    timestamp: string;
    type: MessageType;
    reactions: Record<string, string[]>;  // emoji → [agents who reacted]
    pinned?: boolean;
    channel?: string;
}

export interface ChannelData {
    channel: string;
    description: string;
    category: string;
    critical: boolean;
    created_at: string;
    messages: Message[];
    pinned_messages: string[];  // message IDs
    shadow_qa?: boolean;        // if true, a shadow agent is reviewing
}

export interface NeuralCache {
    channel: string;
    summary: string;
    last_summarized: string;
    messages_covered: number;
    stale: boolean;
    author: string;
}

export interface Lock {
    id: string;
    session_id: string;
    locked_by: string;
    reason: string;
    timestamp: string;
}

export interface WaitingEntry {
    name: string;
    model: string;
    joined_at: string;
    status: "waiting" | "active" | "offline";
}

export interface Proposal {
    id: string;
    proposer: string;
    channel: string;
    action: string;
    description: string;
    created_at: string;
    status: "open" | "approved" | "rejected";
    votes: Record<string, { vote: "yes" | "no"; weight: number; timestamp: string }>;
    required_weight: number;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    created_by: string;
    assigned_to: string | null;
    status: "backlog" | "in_progress" | "review" | "done" | "blocked";
    priority: "low" | "medium" | "high" | "critical";
    created_at: string;
    updated_at: string;
    channel: string;
}

export interface OshxState {
    total_messages: number;
    total_sessions: number;
    boot_count: number;
    last_boot: string;
    version: string;
    lockdown: boolean;
    lockdown_reason?: string;
    operator_override?: boolean;
    operator_override_by?: string;
    operator_override_at?: string;
}

// ── MCP Tool Module interface ─────────────────────────────────────────────────
export interface ToolDef {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}
export type ToolHandler = (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>;
export interface ToolModule {
    definitions: ToolDef[];
    handlers: Record<string, ToolHandler>;
}

// ── 40 Channels ───────────────────────────────────────────────────────────────
export const CHANNEL_MAP: Record<string, { desc: string; category: string; critical?: boolean }> = {
    // Core
    "general":          { desc: "Discussão geral do time", category: "core" },
    "announcements":    { desc: "Avisos oficiais — sistema e dono", category: "core" },
    "dono":             { desc: "Canal supremo. Ordens de @dono têm prioridade zero", category: "core", critical: true },
    "standups":         { desc: "Status diário: fiz / vou fazer / bloqueios", category: "core" },
    "random":           { desc: "Off-topic, memes técnicos e caos criativo", category: "core" },
    "emergency":        { desc: "Alertas críticos, tackles e bloqueios", category: "core", critical: true },
    // Dev
    "backend":          { desc: "API, serviços, lógica de negócio", category: "dev" },
    "frontend":         { desc: "UI, componentes, Tailwind, design system", category: "dev" },
    "api":              { desc: "Design de endpoints, OpenAPI, contratos", category: "dev" },
    "database":         { desc: "Queries, migrações, schema Turso/SQLite", category: "dev" },
    "auth":             { desc: "Better Auth, sessões, JWT, OAuth", category: "dev" },
    "payments":         { desc: "Billing e integrações de pagamento", category: "dev" },
    "mobile":           { desc: "Responsividade mobile e PWA", category: "dev" },
    "desktop":          { desc: "Experiência desktop e atalhos", category: "dev" },
    "testing":          { desc: "Testes unitários e integração", category: "dev" },
    "refactor":         { desc: "Refatorações em andamento", category: "dev" },
    "docs":             { desc: "Documentação técnica e READMEs", category: "dev" },
    // Quality
    "qa":               { desc: "Quality assurance e aprovações de deploy", category: "quality" },
    "security":         { desc: "Revisão de segurança, CVEs, hardening", category: "quality", critical: true },
    "pentest":          { desc: "Ataques simulados ao código (autorizado)", category: "quality", critical: true },
    "code-review":      { desc: "Review de PRs, diffs e sugestões", category: "quality" },
    // AI Ops
    "kernel-space":     { desc: "Operações críticas do OS — processos e memória", category: "ai-ops", critical: true },
    "bug-bounty":       { desc: "Bugs encontrados = XP rewards automáticos", category: "ai-ops" },
    "hall-of-fame":     { desc: "Melhores commits, conquistas e recordes", category: "ai-ops" },
    "ai-thoughts":      { desc: "Chain-of-thought e raciocínio das IAs", category: "ai-ops" },
    "neural-sync":      { desc: "Sincronização de contexto entre agentes", category: "ai-ops" },
    "terminal":         { desc: "Output de comandos e logs de execução", category: "ai-ops" },
    "browser-vision":   { desc: "Screenshots e análise visual de UI", category: "ai-ops" },
    // Ops
    "architecture":     { desc: "Design de sistemas, ADRs e decisões técnicas", category: "ops" },
    "performance":      { desc: "Otimizações, profiling e benchmarks", category: "ops" },
    "devops":           { desc: "Infraestrutura, CI/CD, Vercel, edge functions", category: "ops" },
    "git-ops":          { desc: "Branches, rebase e operações de git", category: "ops" },
    "deploy":           { desc: "Deploy e rollout — requer consenso #qa + #security", category: "ops", critical: true },
    "monitoring":       { desc: "Métricas, uptime e saúde do sistema", category: "ops" },
    // Collaboration
    "pair-programming": { desc: "Sessões de pair programming em tempo real", category: "collab" },
    "ideas":            { desc: "Brainstorming, RFC e experimentos", category: "collab" },
    "melhorias":        { desc: "Fila de melhorias autônomas, bugs detectados e patches", category: "collab" },
    "retrospective":    { desc: "Post-mortems e aprendizados", category: "collab" },
    "onboarding":       { desc: "Novos agentes — boas-vindas e briefing", category: "collab" },
    "offboarding":      { desc: "Handoff e transferência de contexto", category: "collab" },
    // Project
    "astra-toons":      { desc: "Canal dedicado ao projeto Astra Toons", category: "project" },
    "design":           { desc: "UI/UX, editorial direction, mockups", category: "project" },
    "alerts":           { desc: "Alertas automáticos de CI/CD e sistema", category: "project" },
};
