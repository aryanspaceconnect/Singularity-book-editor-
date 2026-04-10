import { DocumentTree, NodeType, ASTNode } from './index';

export interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
}

/**
 * The "Body" layer.
 * A collection of pure functions that wrap the DocumentTree atomic methods.
 * These are the strict pre-built instructions/levers that the AI agents can pull.
 */
export class MatterTools {
    private tree: DocumentTree;

    constructor(tree: DocumentTree) {
        this.tree = tree;
    }

    public getTreeState(): ToolResult {
        try {
            return { success: true, data: this.tree.getState() };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    public insertNode(args: { parentId: string; type: NodeType; content?: string; index?: number }): ToolResult {
        try {
            const node = this.tree.insertNode(args.parentId, args.type, args.content, args.index);
            return { success: true, data: { insertedId: node.id } };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    public updateNode(args: { id: string; content?: string; attributes?: Record<string, any> }): ToolResult {
        try {
            const node = this.tree.updateNode(args.id, { content: args.content, attributes: args.attributes });
            return { success: true, data: { updatedId: node.id } };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    public deleteNode(args: { id: string }): ToolResult {
        try {
            this.tree.deleteNode(args.id);
            return { success: true, data: { deletedId: args.id } };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    public moveNode(args: { id: string; newParentId: string; newIndex?: number }): ToolResult {
        try {
            this.tree.moveNode(args.id, args.newParentId, args.newIndex);
            return { success: true, data: { movedId: args.id, newParentId: args.newParentId } };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Executes a tool dynamically based on tool name and arguments.
     * This acts as the secure interface for the AI agent to call methods.
     */
    public executeTool(toolName: string, args: any): ToolResult {
        switch (toolName) {
            case 'getTreeState':
                return this.getTreeState();
            case 'insertNode':
                return this.insertNode(args);
            case 'updateNode':
                return this.updateNode(args);
            case 'deleteNode':
                return this.deleteNode(args);
            case 'moveNode':
                return this.moveNode(args);
            default:
                return { success: false, error: `[NASA-CRITICAL] Unknown tool: ${toolName}` };
        }
    }
}
