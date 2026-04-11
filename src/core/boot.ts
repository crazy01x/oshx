import fs from "fs";
import { init as initConsciousness } from "./consciousness.js";
import type { ChannelData, OshxState } from "./constants.js";
import {
    CHANNEL_MAP,
    CHANNELS,
    LOCKS_FILE,
    MIRROR, NCACHE,
    OSHX_ROOT, PROFILES,
    ROADMAP_FILE,
    SCRIPTS,
    STATE_FILE, TASKS_FILE,
    VAULT,
    WAITING_FILE,
} from "./constants.js";
import { fileExists, now, readJSON, writeJSON } from "./state.js";

export async function boot(): Promise<void> {
    // 1. Create directory tree
    for (const d of [OSHX_ROOT, PROFILES, CHANNELS, VAULT, MIRROR, NCACHE, SCRIPTS]) {
        if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    }

    // 2. Initialize state
    if (!fileExists(STATE_FILE)) {
        writeJSON(STATE_FILE, {
            total_messages: 0,
            total_sessions: 0,
            boot_count: 1,
            last_boot: now(),
            version: "1.0.0",
            lockdown: false,
            operator_override: false,
        } as OshxState);
    } else {
        const s = readJSON<OshxState>(STATE_FILE);
        s.boot_count = (s.boot_count || 0) + 1;
        s.last_boot  = now();
        s.lockdown   = false; // always clear lockdown on clean boot
        s.operator_override = false;
        s.operator_override_by = undefined;
        s.operator_override_at = undefined;
        writeJSON(STATE_FILE, s);
    }

    // 3. Initialize JSON singletons
    if (!fileExists(LOCKS_FILE))   writeJSON(LOCKS_FILE, []);
    if (!fileExists(WAITING_FILE)) writeJSON(WAITING_FILE, []);
    if (!fileExists(TASKS_FILE))   writeJSON(TASKS_FILE, []);

    // 4. Create channel files for all 40 channels
    for (const [ch, meta] of Object.entries(CHANNEL_MAP)) {
        const f = `${CHANNELS}/${ch}.json`;
        if (!fs.existsSync(f)) {
            writeJSON(f, {
                channel: ch,
                description: meta.desc,
                category: meta.category,
                critical: !!meta.critical,
                created_at: now(),
                messages: [],
                pinned_messages: [],
            } as ChannelData);
        }
    }

    // 5. Seed roadmap if not present
    if (!fileExists(ROADMAP_FILE)) {
        fs.writeFileSync(ROADMAP_FILE,
            `# Oshx Project Roadmap\n\n_Generated ${new Date().toLocaleDateString()}_\n\n## In Progress\n\n## Backlog\n\n## Done\n`,
            "utf-8"
        );
    }

    // 6. Initialize global consciousness memory
    initConsciousness();

    console.error(`[OSHX] Boot complete — ${Object.keys(CHANNEL_MAP).length} channels ready.`);
}
