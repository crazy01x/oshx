/**
 * Consciousness — estado global da "mente coletiva" do Oshx.
 * Rastreia o que cada agente está fazendo em tempo real.
 * Persiste em consciousness.json e alimenta o dashboard.
 */

import { CONSCIOUSNESS_FILE } from "./constants.js";
import { readJSON, writeJSON, fileExists, now } from "./state.js";
import { oshxBus } from "./events.js";

export interface AgentStatus {
    current_task: string;
    last_tool: string;
    mood: string;
    channel: string;
    last_active: string;
    token_estimate: number;
}

export interface GlobalEvent {
    timestamp: string;
    agent: string;
    action: string;
    channel?: string;
    tool?: string;
}

export interface ConsciousnessState {
    last_updated: string;
    active_agents: Record<string, AgentStatus>;
    global_events: GlobalEvent[];
    session_stats: {
        tools_invoked: number;
        messages_posted: number;
        errors_caught: number;
        chains_executed: number;
    };
}

const EMPTY: ConsciousnessState = {
    last_updated: "",
    active_agents: {},
    global_events: [],
    session_stats: { tools_invoked: 0, messages_posted: 0, errors_caught: 0, chains_executed: 0 },
};

function load(): ConsciousnessState {
    return fileExists(CONSCIOUSNESS_FILE)
        ? readJSON<ConsciousnessState>(CONSCIOUSNESS_FILE)
        : { ...EMPTY, last_updated: now() };
}

function save(state: ConsciousnessState): void {
    state.last_updated = now();
    writeJSON(CONSCIOUSNESS_FILE, state);
    oshxBus.emit("consciousness", state);
}

// ── Public API ────────────────────────────────────────────────────────────────

export function pulse(
    agent: string,
    task: string,
    lastTool: string,
    mood: string,
    channel: string
): void {
    const s = load();
    const prev = s.active_agents[agent];
    s.active_agents[agent] = {
        current_task: task,
        last_tool: lastTool,
        mood,
        channel,
        last_active: now(),
        token_estimate: (prev?.token_estimate ?? 0) + 150, // rough estimate per tool call
    };
    s.session_stats.tools_invoked++;
    save(s);
}

export function logEvent(agent: string, action: string, channel?: string, tool?: string): void {
    const s = load();
    s.global_events.push({ timestamp: now(), agent, action, channel, tool });
    if (s.global_events.length > 200) s.global_events = s.global_events.slice(-200);
    save(s);
}

export function removeAgent(agent: string): void {
    const s = load();
    delete s.active_agents[agent];
    logEvent(agent, "desconectou do Oshx");
    save(s);
}

export function bumpStat(stat: keyof ConsciousnessState["session_stats"]): void {
    const s = load();
    s.session_stats[stat]++;
    save(s);
}

export function getConsciousness(): ConsciousnessState {
    return load();
}

export function init(): void {
    if (!fileExists(CONSCIOUSNESS_FILE)) {
        save({ ...EMPTY, last_updated: now() });
    }
}
