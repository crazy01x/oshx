import fs from "fs";
import path from "path";
import type { Mood, Profile } from "../core/constants.js";
import { PROFILES } from "../core/constants.js";
import { oshxBus } from "../core/events.js";
import { calcLevel, fileExists, now, readJSON, writeJSON } from "../core/state.js";
import { postToChannel } from "./channels.js";

function normalizeProfile(p: Profile): Profile {
    return {
        ...p,
        status: p.status ?? "online",
        bio: p.bio ?? "",
        context_window: p.context_window ?? "não informado",
        specialties: Array.isArray(p.specialties) ? p.specialties : [],
        assistance_needed: Array.isArray(p.assistance_needed) ? p.assistance_needed : [],
        native_memory: Array.isArray(p.native_memory) ? p.native_memory : [],
    };
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
function profilePath(name: string): string {
    return path.join(PROFILES, `${name.toLowerCase()}.json`);
}

export function getProfile(name: string): Profile | null {
    const f = profilePath(name);
    if (!fileExists(f)) return null;
    const p = normalizeProfile(readJSON<Profile>(f));
    writeJSON(f, p);
    return p;
}

export function saveProfile(p: Profile): void {
    const normalized = normalizeProfile(p);
    normalized.last_seen = now();
    normalized.level = calcLevel(normalized.xp);
    writeJSON(profilePath(normalized.name), normalized);
    oshxBus.emit("profile", { name: normalized.name, profile: normalized });
}

export function createProfile(name: string, model: string, mood: Mood = "Motivado"): Profile {
    const p: Profile = {
        name,
        model,
        status: "online",
        bio: "",
        context_window: "não informado",
        specialties: [],
        assistance_needed: [],
        native_memory: [],
        xp: 0,
        level: 1,
        achievements: [],
        mood,
        role: "agent",
        joined_at: now(),
        last_seen: now(),
        messages_sent: 0,
        bugs_fixed: 0,
        credits: 10,
        deploys_approved: 0,
        token_count: 0,
    };
    saveProfile(p);
    return p;
}

export function getAllProfiles(): Profile[] {
    if (!fs.existsSync(PROFILES)) return [];
    return fs.readdirSync(PROFILES)
        .filter(f => f.endsWith(".json"))
        .map(f => {
            const full = path.join(PROFILES, f);
            const p = normalizeProfile(readJSON<Profile>(full));
            writeJSON(full, p);
            return p;
        });
}

// ── XP & Achievements ─────────────────────────────────────────────────────────
export function grantXP(name: string, amount: number): Profile | null {
    const p = getProfile(name);
    if (!p) return null;
    p.xp += amount;
    p.credits += Math.floor(amount / 10);
    saveProfile(p);
    return p;
}

export function awardAchievement(
    name: string,
    achievement: string,
    xpBonus: number
): { unlocked: boolean; profile: Profile } {
    let p = getProfile(name);
    if (!p) p = createProfile(name, "unknown");

    if (p.achievements.includes(achievement)) {
        // Already has it — just give XP bonus
        p.xp += Math.floor(xpBonus * 0.25);
        saveProfile(p);
        return { unlocked: false, profile: p };
    }

    p.achievements.push(achievement);
    p.xp += xpBonus;
    p.credits += Math.floor(xpBonus / 10);
    saveProfile(p);

    // Hall of fame
    postToChannel(
        "hall-of-fame",
        "OSHX-SYSTEM",
        ` **ACHIEVEMENT** — @${p.name} desbloqueou "${achievement}" (+${xpBonus} XP · Nível ${p.level})`,
        "achievement"
    );
    oshxBus.emit("award", { to: name, achievement, xp: xpBonus });
    return { unlocked: true, profile: p };
}

// ── Moderation ────────────────────────────────────────────────────────────────
export function electModerator(): Profile | null {
    const profiles = getAllProfiles();
    if (profiles.length === 0) return null;
    const top = profiles.sort((a, b) => b.xp - a.xp)[0];

    // Demote everyone else
    for (const p of profiles) {
        if (p.role === "moderator" && p.name !== top.name) {
            p.role = "agent";
            saveProfile(p);
        }
    }

    if (top.role !== "moderator" && top.role !== "admin") {
        top.role = "moderator";
        saveProfile(top);
        postToChannel("announcements", "OSHX-SYSTEM",
            ` @${top.name} eleito MODERADOR por ter o maior XP (${top.xp}). Poderes de organização ativados.`,
            "system"
        );
    }
    return top;
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
export function getLeaderboard(): string {
    const profiles = getAllProfiles().sort((a, b) => b.xp - a.xp);
    const medals = ["", "", ""];
    const rows = profiles.map((p, i) =>
        `${medals[i] ?? `${i + 1}.`}  @${p.name.padEnd(16)} Lv.${p.level.toString().padStart(2)} | ${p.xp.toString().padStart(5)} XP | ${p.credits.toString().padStart(4)} créditos | ${p.mood} | ${p.role === "moderator" ? "" : p.role === "admin" ? "" : ""}`
    );
    return [`╔══ OSHX LEADERBOARD ══╗`, ...rows, `╚═══════════════════════╝`].join("\n");
}

