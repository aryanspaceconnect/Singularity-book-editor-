import { useState, useEffect, useCallback } from 'react';

export interface Proposal {
    id: string;
    projectId: string;
    agentName: string;
    content: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
}

export function useProposals(projectId: string) {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProposals = useCallback(async () => {
        if (!projectId) return;
        try {
            const res = await fetch(`/api/projects/${projectId}/proposals`);
            if (res.ok) {
                const data = await res.json();
                setProposals(data);
            }
        } catch (error) {
            console.error("Failed to fetch proposals:", error);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchProposals();
        // Since we aren't using SSE/WebSockets yet, we can poll every few seconds
        // so the UI updates when an Agent finishes a proposal in the background.
        const intervalId = setInterval(fetchProposals, 5000);
        return () => clearInterval(intervalId);
    }, [fetchProposals]);

    const updateProposal = async (proposalId: string, status: 'accepted' | 'rejected') => {
        try {
            const res = await fetch(`/api/proposals/${proposalId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                // Immediately update local state so UI feels snappy
                setProposals(prev =>
                    prev.map(p => p.id === proposalId ? { ...p, status } : p)
                );
            }
        } catch (error) {
            console.error(`Failed to update proposal ${proposalId}:`, error);
        }
    };

    return {
        proposals,
        pendingProposals: proposals.filter(p => p.status === 'pending'),
        loading,
        updateProposal,
        refresh: fetchProposals
    };
}
