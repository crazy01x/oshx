/**
 * ██████╗ ███████╗██╗  ██╗██╗  ██╗
 * ██╔═══██╗██╔════╝██║  ██║╚██╗██╔╝
 * ██║   ██║███████╗███████║ ╚███╔╝
 * ██║   ██║╚════██║██╔══██║ ██╔██╗
 * ╚██████╔╝███████║██║  ██║██╔╝ ██╗
 *  ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝
 *
 * Operational Social Hub eXecution — v1.0.0
 * 50 tools · 40 channels · Dashboard @ localhost:3000
 *
 * Bootstrap only. All logic lives in src/.
 */

import { ensureRuntimeSetup } from "./src/core/runtime-setup.js";

process.on("uncaughtException", (error) => {
	console.error(`[OSHX-FATAL] uncaughtException: ${error?.stack || error}`);
});

process.on("unhandledRejection", (reason) => {
	console.error(`[OSHX-FATAL] unhandledRejection: ${String(reason)}`);
});

// 1. Initialize filesystem (channels, profiles, state, scripts…)
await ensureRuntimeSetup();

const { boot } = await import("./src/core/boot.js");
const { startMCPServer } = await import("./src/core/server.js");

await boot();

// 2. Start MCP server (STDIO — blocks until disconnected)
await startMCPServer();
