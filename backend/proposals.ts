export interface Proposal {
    id: string;
    projectId: string;
    agentName: string;
    content: string; // HTML or Markdown
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
}

// In-memory store for proposals for now.
// In a full production app, this would use Firestore.
const proposalsDB = new Map<string, Proposal>();

export function createProposal(projectId: string, agentName: string, content: string): Proposal {
    const id = Math.random().toString(36).substring(2, 15);
    const proposal: Proposal = {
        id,
        projectId,
        agentName,
        content,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    proposalsDB.set(id, proposal);
    return proposal;
}

export function getProposalsByProject(projectId: string): Proposal[] {
    return Array.from(proposalsDB.values()).filter(p => p.projectId === projectId);
}

export function updateProposalStatus(id: string, status: 'accepted' | 'rejected'): Proposal | null {
    const proposal = proposalsDB.get(id);
    if (!proposal) return null;

    proposal.status = status;
    proposalsDB.set(id, proposal);
    return proposal;
}
