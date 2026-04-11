import { EventEmitter } from "events";

/**
 * Internal event bus — bridges MCP tool calls → web dashboard SSE.
 * Events emitted:
 *   "message"  { channel, message }   — new message in a channel
 *   "profile"  { name, profile }      — profile updated
 *   "lock"     { lock }               — new lock created
 *   "release"  { lock_id }            — lock removed
 *   "task"     { task }               — task created/updated
 *   "award"    { to, achievement, xp }
 */
export const oshxBus = new EventEmitter();
oshxBus.setMaxListeners(100);
