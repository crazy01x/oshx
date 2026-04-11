/**
 * Tool Registry — Singleton que habilita o Inception Mode (oshx_chain).
 * Qualquer módulo pode importar getHandler() para invocar outras tools
 * programaticamente, sem passar pelo MCP server.
 */

type ToolHandler = (
    args: Record<string, unknown>
) => Promise<{ content: Array<{ type: string; text: string }> }>;

const _registry = new Map<string, ToolHandler>();

export function registerAll(map: Record<string, ToolHandler>): void {
    for (const [name, handler] of Object.entries(map)) {
        _registry.set(name, handler);
    }
}

export function getHandler(name: string): ToolHandler | undefined {
    return _registry.get(name);
}

export function listTools(): string[] {
    return Array.from(_registry.keys()).sort();
}

export function toolCount(): number {
    return _registry.size;
}
