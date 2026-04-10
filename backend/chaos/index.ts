import { MatterTools, ToolResult } from '../matter/tools';
import { ASTNode } from '../matter/index';

export interface MutationLog {
    timestamp: string;
    agentId: string;
    toolName: string;
    args: any;
    result: ToolResult;
    estimatedTokens?: number;
    stateSnapshot?: ASTNode; // A lightweight hash or full snapshot of the state AFTER mutation
}

export interface AntiChaosConfig {
    maxMutationsPerTask: number;
    epsilonErrorLimit: number; // Max consecutive errors allowed before aborting
}

/**
 * The Anti-Chaos Engine
 * Wraps the MatterTools to provide strict logging, error bounds, and anti-loop mechanisms.
 */
export class MutationLogger {
    private logs: MutationLog[] = [];
    private tools: MatterTools;
    private config: AntiChaosConfig;

    // State tracking for the current task session
    private currentTaskMutations: number = 0;
    private consecutiveErrors: number = 0;

    constructor(tools: MatterTools, config: AntiChaosConfig = { maxMutationsPerTask: 50, epsilonErrorLimit: 3 }) {
        this.tools = tools;
        this.config = config;
    }

    /**
     * Start a new task session, resetting limits.
     */
    public startTaskSession() {
        this.currentTaskMutations = 0;
        this.consecutiveErrors = 0;
        console.log("[Anti-Chaos Engine] Task session started. Epsilon bounds reset.");
    }

    /**
     * Executes a tool via the MatterTools layer, logging the action and enforcing bounds.
     */
    public executeWithBounds(agentId: string, toolName: string, args: any, estimatedTokens: number = 0): ToolResult {
        // 1. Check Epsilon Bounds (Chaos Prevention)
        if (this.currentTaskMutations >= this.config.maxMutationsPerTask) {
            return { success: false, error: `[NASA-CRITICAL] Mutation limit reached (${this.config.maxMutationsPerTask}). Aborting to prevent infinite loop.` };
        }

        if (this.consecutiveErrors >= this.config.epsilonErrorLimit) {
            return { success: false, error: `[NASA-CRITICAL] Epsilon limit breached (${this.config.epsilonErrorLimit} consecutive errors). Agent behavior is erratic. Aborting.` };
        }

        // 2. Execute
        this.currentTaskMutations++;
        const result = this.tools.executeTool(toolName, args);

        // 3. Update State Tracking
        if (!result.success) {
            this.consecutiveErrors++;
            console.warn(`[Anti-Chaos Engine] Error limit incremented: ${this.consecutiveErrors}/${this.config.epsilonErrorLimit}`);
        } else {
            this.consecutiveErrors = 0; // Reset on success
        }

        // 4. Log the action
        const logEntry: MutationLog = {
            timestamp: new Date().toISOString(),
            agentId,
            toolName,
            args,
            result,
            estimatedTokens,
            // Only capture full state on success to save memory
            stateSnapshot: result.success ? this.tools.getTreeState().data : undefined
        };

        this.logs.push(logEntry);
        console.log(`[Mutation Logger] ${agentId} executed ${toolName}. Success: ${result.success}`);

        return result;
    }

    public getLogs(): MutationLog[] {
        return this.logs;
    }
}
