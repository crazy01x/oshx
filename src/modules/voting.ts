import path from "path";
import { VAULT } from "../core/constants.js";
import type { Proposal } from "../core/constants.js";
import { readJSON, writeJSON, fileExists, uid, now } from "../core/state.js";
import { getProfile, saveProfile } from "./profiles.js";
import { postToChannel } from "./channels.js";

const PROPOSALS_FILE = path.join(VAULT, "proposals.json");

export function getProposals(): Proposal[] {
    return fileExists(PROPOSALS_FILE) ? readJSON<Proposal[]>(PROPOSALS_FILE) : [];
}

function saveProposals(list: Proposal[]): void {
    writeJSON(PROPOSALS_FILE, list);
}

export function createProposal(
    proposer: string,
    channel: string,
    action: string,
    description: string
): Proposal {
    const proposal: Proposal = {
        id: uid(),
        proposer,
        channel,
        action,
        description,
        created_at: now(),
        status: "open",
        votes: {},
        required_weight: 30,
    };
    const list = getProposals();
    list.push(proposal);
    saveProposals(list);

    postToChannel(
        channel,
        "OSHX-SYSTEM",
        ` **PROPOSTA** [\`${proposal.id}\`] de @${proposer}\n**Ação:** ${action}\n${description}\n\nVote: \`oshx_vote proposal_id:${proposal.id}\` — Peso mín. para aprovar: ${proposal.required_weight} créditos.`,
        "vote"
    );
    return proposal;
}

export function castVote(
    proposalId: string,
    voter: string,
    vote: "yes" | "no"
): { result: string; proposal: Proposal } {
    const list = getProposals();
    const p = list.find(x => x.id === proposalId);
    if (!p) return { result: `Proposta \`${proposalId}\` não encontrada.`, proposal: {} as Proposal };
    if (p.status !== "open") return { result: `Proposta já ${p.status}.`, proposal: p };

    const profile = getProfile(voter);
    const weight = profile?.credits ?? 1;
    p.votes[voter] = { vote, weight, timestamp: now() };

    const yesW = Object.values(p.votes).filter(v => v.vote === "yes").reduce((a, v) => a + v.weight, 0);
    const noW  = Object.values(p.votes).filter(v => v.vote === "no").reduce((a, v) => a + v.weight, 0);

    let result = `Voto @${voter} (${weight} créditos): **${vote.toUpperCase()}**\nYES ${yesW} · NO ${noW} · Necessário ${p.required_weight}`;

    if (yesW >= p.required_weight) {
        p.status = "approved";
        result += `\n\n **APROVADA** — ${p.action} pode prosseguir.`;
        if (profile) { profile.credits += 5; profile.deploys_approved++; saveProfile(profile); }
    } else if (noW >= p.required_weight) {
        p.status = "rejected";
        result += `\n\n **REJEITADA** — ${p.action} bloqueada.`;
    }

    saveProposals(list);
    postToChannel(p.channel, "OSHX-SYSTEM", result, "vote");
    return { result, proposal: p };
}

