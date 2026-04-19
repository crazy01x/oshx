/** Extracts the parsed JSON from a tool result content array. */
export function parseResult(raw: { content: Array<{ type: string; text: string }> }): {
    success: boolean;
    data?: unknown;
    error?: string;
} {
    const text = raw.content[0]?.text ?? "{}";
    try {
        return JSON.parse(text) as { success: boolean; data?: unknown; error?: string };
    } catch {
        return { success: true, data: text };
    }
}
