import type { ToolModule, Task } from "../core/constants.js";
import { TASKS_FILE } from "../core/constants.js";
import { ok, err, readJSON, writeJSON, fileExists, uid, now } from "../core/state.js";
import { postToChannel } from "../modules/channels.js";

function getTasks(): Task[] {
    return fileExists(TASKS_FILE) ? readJSON<Task[]>(TASKS_FILE) : [];
}
function saveTasks(tasks: Task[]) {
    writeJSON(TASKS_FILE, tasks);
}

export const taskModule: ToolModule = {
    definitions: [
        {
            name: "oshx_task_create",
            description: "Cria tarefa no backlog compartilhado do enxame. Use para registrar trabalho que você ou outro agente vai executar — especialmente quando não há agente disponível agora. priority: low/medium/high/critical. channel: canal relacionado ao trabalho (ex: backend, frontend). O 1º agente no boot deve criar o backlog inicial com initial_tasks.",
            inputSchema: {
                type: "object",
                properties: {
                    created_by:  { type: "string" },
                    title:       { type: "string" },
                    description: { type: "string" },
                    assigned_to: { type: "string", description: "Agente responsável (null para não atribuído)" },
                    priority:    { type: "string", enum: ["low", "medium", "high", "critical"] },
                    channel:     { type: "string", description: "Canal relacionado (ex: backend, frontend)" },
                },
                required: ["created_by", "title", "description", "priority", "channel"],
            },
        },
        {
            name: "oshx_task_list",
            description: "Lista tarefas do backlog. Filtre por status (backlog/in_progress/review/done/blocked) ou por assignee. Use ao bootar para ver o que está pendente. Use 'all' para ver tudo. Backlog sem dono = oportunidade de assumir com oshx_task_update.",
            inputSchema: {
                type: "object",
                properties: {
                    status:   { type: "string", enum: ["backlog", "in_progress", "review", "done", "blocked", "all"] },
                    assignee: { type: "string" },
                    channel:  { type: "string" },
                },
            },
        },
        {
            name: "oshx_task_update",
            description: "Atualiza status ou atribuição de uma tarefa. Use para: assumir uma tarefa (assigned_to: seu_nome, status: in_progress), mover para revisão (status: review), concluir (status: done), ou bloquear com nota de impedimento (status: blocked, note: motivo). task_id vem do retorno de oshx_task_list.",
            inputSchema: {
                type: "object",
                properties: {
                    agent:       { type: "string" },
                    task_id:     { type: "string" },
                    status:      { type: "string", enum: ["backlog", "in_progress", "review", "done", "blocked"] },
                    assigned_to: { type: "string" },
                    note:        { type: "string", description: "Nota de atualização" },
                },
                required: ["agent", "task_id"],
            },
        },
    ],

    handlers: {
        async oshx_task_create(args) {
            const tasks = getTasks();
            const task: Task = {
                id:          uid(),
                title:       args.title as string,
                description: args.description as string,
                created_by:  args.created_by as string,
                assigned_to: (args.assigned_to as string | null) ?? null,
                status:      "backlog",
                priority:    (args.priority as Task["priority"]) ?? "medium",
                created_at:  now(),
                updated_at:  now(),
                channel:     args.channel as string,
            };
            tasks.push(task);
            saveTasks(tasks);

            const emoji = { critical: "", high: "", medium: "", low: "" }[task.priority];
            postToChannel(task.channel, "OSHX-SYSTEM",
                `${emoji} **TASK** [\`${task.id}\`]: ${task.title}\n${task.description}${task.assigned_to ? `\n→ @${task.assigned_to}` : ""}`,
                "system"
            );
            return ok(`Task \`${task.id}\` criada: ${task.title}`);
        },

        async oshx_task_list(args) {
            let tasks = getTasks();
            const status   = args.status as string;
            const assignee = args.assignee as string;
            const channel  = args.channel as string;

            if (status && status !== "all") tasks = tasks.filter(t => t.status === status);
            if (assignee) tasks = tasks.filter(t => t.assigned_to?.toLowerCase() === assignee.toLowerCase());
            if (channel)  tasks = tasks.filter(t => t.channel === channel);

            if (!tasks.length) return ok("Nenhuma task encontrada.");

            const byStatus: Record<string, Task[]> = {};
            for (const t of tasks) {
                if (!byStatus[t.status]) byStatus[t.status] = [];
                byStatus[t.status].push(t);
            }

            const emojiMap = { critical: "", high: "", medium: "", low: "" };
            const statusEmoji: Record<string, string> = { backlog: "", in_progress: "", review: "", done: "", blocked: "" };

            const lines = Object.entries(byStatus).map(([st, items]) => [
                `${statusEmoji[st] ?? "•"} **${st.toUpperCase()}** (${items.length})`,
                ...items.map(t => `  ${emojiMap[t.priority]} [\`${t.id}\`] ${t.title}${t.assigned_to ? ` → @${t.assigned_to}` : ""}`),
            ].join("\n")).join("\n\n");

            return ok(lines);
        },

        async oshx_task_update(args) {
            const tasks = getTasks();
            const task  = tasks.find(t => t.id === args.task_id);
            if (!task) return err(`Task \`${args.task_id}\` não encontrada.`);

            const prev = task.status;
            if (args.status)      task.status      = args.status as Task["status"];
            if (args.assigned_to) task.assigned_to = args.assigned_to as string;
            task.updated_at = now();
            saveTasks(tasks);

            postToChannel(task.channel, "OSHX-SYSTEM",
                ` Task \`${task.id}\` atualizada por @${args.agent}: ${prev} → ${task.status}${args.note ? `\n${args.note}` : ""}`,
                "system"
            );
            return ok(`Task \`${task.id}\` atualizada: ${prev} → ${task.status}`);
        },
    },
};

