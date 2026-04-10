export type NodeType = 'root' | 'chapter' | 'heading' | 'paragraph' | 'text' | 'image';

export interface ASTNode {
    id: string;
    type: NodeType;
    content?: string;      // Used for leaf nodes like text or paragraphs
    attributes?: Record<string, any>; // Used for metadata, styling, or image URLs
    children: ASTNode[];
    parentId: string | null;
}

export class DocumentTree {
    private nodes: Map<string, ASTNode>;
    public rootId: string;

    constructor() {
        this.nodes = new Map();
        this.rootId = 'root';
        this.nodes.set(this.rootId, {
            id: this.rootId,
            type: 'root',
            children: [],
            parentId: null
        });
    }

    /**
     * Deep clone of the tree for immutability and preview generation
     */
    public getState(): ASTNode {
        const root = this.getNode(this.rootId);
        return JSON.parse(JSON.stringify(root)); // Simple deep clone
    }

    /**
     * Retrieves a node by ID. Throws if not found.
     */
    public getNode(id: string): ASTNode {
        const node = this.nodes.get(id);
        if (!node) throw new Error(`[NASA-CRITICAL] Node ID '${id}' does not exist.`);
        return node;
    }

    /**
     * Generates a unique, deterministic-friendly ID
     */
    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }

    /**
     * Atomic Operation: Insert a new node
     */
    public insertNode(parentId: string, type: NodeType, content?: string, index?: number): ASTNode {
        const parent = this.getNode(parentId);

        const newNode: ASTNode = {
            id: this.generateId(),
            type,
            content,
            children: [],
            parentId: parent.id
        };

        this.nodes.set(newNode.id, newNode);

        if (index !== undefined && index >= 0 && index <= parent.children.length) {
            parent.children.splice(index, 0, newNode);
        } else {
            parent.children.push(newNode);
        }

        return newNode;
    }

    /**
     * Atomic Operation: Update existing node content/attributes
     */
    public updateNode(id: string, updates: { content?: string; attributes?: Record<string, any> }): ASTNode {
        if (id === this.rootId) throw new Error("[NASA-CRITICAL] Cannot modify root node directly.");

        const node = this.getNode(id);
        if (updates.content !== undefined) node.content = updates.content;
        if (updates.attributes !== undefined) node.attributes = { ...node.attributes, ...updates.attributes };

        return node;
    }

    /**
     * Atomic Operation: Delete a node and its children
     */
    public deleteNode(id: string): void {
        if (id === this.rootId) throw new Error("[NASA-CRITICAL] Cannot delete root node.");

        const node = this.getNode(id);
        const parent = this.getNode(node.parentId as string);

        // Remove from parent
        parent.children = parent.children.filter(child => child.id !== id);

        // Recursively remove from flat map to prevent memory leaks and dangling pointers
        const removeRecursively = (n: ASTNode) => {
            this.nodes.delete(n.id);
            n.children.forEach(removeRecursively);
        };
        removeRecursively(node);
    }

    /**
     * Atomic Operation: Move a node to a different parent
     */
    public moveNode(id: string, newParentId: string, newIndex?: number): void {
        if (id === this.rootId) throw new Error("[NASA-CRITICAL] Cannot move root node.");
        if (id === newParentId) throw new Error("[NASA-CRITICAL] Node cannot be its own parent.");

        const node = this.getNode(id);
        const oldParent = this.getNode(node.parentId as string);
        const newParent = this.getNode(newParentId);

        // Prevent circular references (cannot move a node into one of its own descendants)
        let currentAncestor: ASTNode | undefined = newParent;
        while (currentAncestor) {
            if (currentAncestor.id === id) {
                throw new Error("[NASA-CRITICAL] Circular reference detected. Cannot move node into its own descendant.");
            }
            currentAncestor = currentAncestor.parentId ? this.getNode(currentAncestor.parentId) : undefined;
        }

        // Remove from old parent
        oldParent.children = oldParent.children.filter(child => child.id !== id);

        // Update node's parent reference
        node.parentId = newParent.id;

        // Insert into new parent
        if (newIndex !== undefined && newIndex >= 0 && newIndex <= newParent.children.length) {
            newParent.children.splice(newIndex, 0, node);
        } else {
            newParent.children.push(node);
        }
    }
}
