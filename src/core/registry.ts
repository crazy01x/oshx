/**
 * Tool Registry — Singleton that enables oshx_run orchestration.
 * Any module can import getHandler() to invoke other tools programmatically.
 */

export type ToolCategory = "filesystem" | "terminal" | "git" | "web" | "agent" | "state" | "system";

type ToolHandler = (
    args: Record<string, unknown>
) => Promise<{ content: Array<{ type: string; text: string }> }>;

const _registry = new Map<string, ToolHandler>();
const _categories = new Map<string, ToolCategory>();

export function registerAll(map: Record<string, ToolHandler>, category?: ToolCategory): void {
    for (const [name, handler] of Object.entries(map)) {
        _registry.set(name, handler);
        if (category) _categories.set(name, category);
    }
}

export function getHandler(name: string): ToolHandler | undefined {
    return _registry.get(name);
}

export function listTools(): string[] {
    return Array.from(_registry.keys()).sort();
}

export function listByCategory(category: ToolCategory): string[] {
    return Array.from(_registry.keys())
        .filter(name => _categories.get(name) === category)
        .sort();
}

export function getCategory(name: string): ToolCategory | undefined {
    return _categories.get(name);
}

export function toolCount(): number {
    return _registry.size;
}
