import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// ── Tool modules ──────────────────────────────────────────────────────────────
import { startAutonomyLoop } from "../services/autonomy.js";
import { browserModule } from "../tools/browser-tools.js";
import { cacheModule } from "../tools/cache-tools.js";
import { channelModule } from "../tools/channel-tools.js";
import { consensusModule } from "../tools/consensus-tools.js";
import { emergencyModule } from "../tools/emergency-tools.js";
import { gitModule } from "../tools/git-tools.js";
import { identityModule } from "../tools/identity.js";
import { swarmModule } from "../tools/swarm-tools.js";
import { systemModule } from "../tools/system-tools.js";
import { taskModule } from "../tools/task-tools.js";
import { terminalModule } from "../tools/terminal-tools.js";
import { vaultModule } from "../tools/vault-tools.js";
import { xpModule } from "../tools/xp-tools.js";
import { workspaceModule } from "../tools/workspace-tools.js";
import { fsModule } from "../tools/fs-tools.js";
import { shellModule } from "../tools/shell-tools.js";
import { memoryModule } from "../tools/memory-tools.js";
import { orchestratorModule } from "../tools/orchestrator-tools.js";
import type { ToolModule } from "./constants.js";
import { registerAll } from "./registry.js";

// ── Aggregate all modules ─────────────────────────────────────────────────────
const modules: ToolModule[] = [
    identityModule,
    channelModule,
    terminalModule,
    emergencyModule,
    consensusModule,
    xpModule,
    cacheModule,
    vaultModule,
    taskModule,
    gitModule,
    browserModule,
    systemModule,
    swarmModule,
    workspaceModule,
    fsModule,
    shellModule,
    memoryModule,
    orchestratorModule,
];

const allDefinitions = modules.flatMap(m => m.definitions);
const allHandlers    = Object.fromEntries(modules.flatMap(m => Object.entries(m.handlers)));

// ── MCP Server ────────────────────────────────────────────────────────────────
export async function startMCPServer(): Promise<void> {
    // Registry powers tool-to-tool orchestration (oshx_chain + terminal mcp://)
    registerAll(allHandlers);
    registerAll(fsModule.handlers, "filesystem");
    registerAll(shellModule.handlers, "terminal");
    registerAll(memoryModule.handlers, "state");
    registerAll(orchestratorModule.handlers, "agent");
    startAutonomyLoop();

    const server = new Server(
        { name: "oshx", version: "1.0.0" },
        { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: allDefinitions,
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        const handler = allHandlers[name];
        if (!handler) throw new Error(`Tool not found: ${name}`);
        try {
            return await handler((args ?? {}) as Record<string, unknown>);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[OSHX-MCP] Tool error in ${name}: ${message}`);
            return {
                content: [{ type: "text", text: ` Falha em ${name}: ${message}` }],
                isError: true,
            };
        }
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`[OSHX-MCP] ${allDefinitions.length} tools online via STDIO.`);
}

