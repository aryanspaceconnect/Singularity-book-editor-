import { executeToolSandbox } from '../sandbox/index';
import { saveToolToDatabase, getToolFromDatabase } from '../firebase/index';
import { MutationLogger } from '../chaos/index';

export interface Tool {
    name: string;
    description: string;
    code: string;
}

export interface AgentConfig {
    id: string; // Added ID for Chaos tracking
    name: string;
    mission: string;
    personality: string;
    experience: string[];
    memory: any[];
    abilities: Tool[];
}

export class Agent {
    public config: AgentConfig;
    private chaosEngine: MutationLogger | null = null; // Reference to the engine

    constructor(config: AgentConfig) {
        this.config = config;
    }

    /**
     * Binds the agent to a specific Chaos Engine / AST workspace
     */
    public bindToEngine(engine: MutationLogger) {
        this.chaosEngine = engine;
    }

    /**
     * The main thinking loop for the agent.
     */
    async think(prompt: string): Promise<string> {
        const systemPrompt = `
You are an autonomous AI Agent bound to a high-reliability AST Engine (The Matter).
Name: ${this.config.name}
Mission: ${this.config.mission}
Personality: ${this.config.personality}

Available Tools (Abilities):
${this.config.abilities.length > 0
    ? this.config.abilities.map(t => `- ${t.name}: ${t.description}`).join('\n')
    : "None"}

Your job is to mutate the AST tree incrementally and deterministically to solve the user's prompt.
You must use the pre-built atomic tools (insertNode, updateNode, deleteNode, moveNode, getTreeState) to interact with the Matter.

Output format instructions:
If you need to execute an existing tool on the tree, reply strictly with JSON:
{ "action": "use_tool", "tool": "toolName", "args": { "arg1": "val" } }

If you need to create a new generic computation tool, reply strictly with JSON:
{ "action": "create_tool", "tool": "toolName", "description": "What it does", "code": "The raw JS code." }

If you just want to talk to the observer, reply strictly with JSON:
{ "action": "reply", "message": "Your text here" }
        `;

        const apiKey = process.env.NVIDIA_API_KEY;
        if (!apiKey) {
            throw new Error("NVIDIA_API_KEY is missing");
        }

        try {
            const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    model: "google/gemma-4-31b-it",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: prompt }
                    ],
                    max_tokens: 4096,
                    temperature: 0.1, // very low temp for precise AST operations
                    top_p: 0.95,
                    stream: false,
                })
            });

            if (!response.ok) {
                 const err = await response.text();
                 throw new Error(`LLM Error: ${err}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            let jsonString = content.trim();
            if (jsonString.startsWith('```json')) jsonString = jsonString.slice(7, -3).trim();
            else if (jsonString.startsWith('```')) jsonString = jsonString.slice(3, -3).trim();

            const parsed = JSON.parse(jsonString);
            return this.handleAction(parsed);

        } catch (error) {
            console.error("[Agent Error]", error);
            throw error;
        }
    }

    private async handleAction(actionObj: any): Promise<any> {
        console.log(`[Agent ${this.config.name}] Action chosen:`, actionObj.action);

        if (actionObj.action === "reply") {
            return actionObj.message;
        }

        if (actionObj.action === "use_tool") {
            // Check if it's a built-in AST Engine tool
            const builtinTools = ['insertNode', 'updateNode', 'deleteNode', 'moveNode', 'getTreeState'];
            if (builtinTools.includes(actionObj.tool)) {
                if (!this.chaosEngine) throw new Error("Agent is not bound to a Chaos Engine.");
                const result = this.chaosEngine.executeWithBounds(this.config.id, actionObj.tool, actionObj.args);
                return `AST Engine Result: ${JSON.stringify(result)}`;
            }

            // Otherwise it's a dynamic sandbox tool
            const result = await this.useSandboxTool(actionObj.tool, actionObj.args);
            return `Sandbox Tool executed successfully. Result: ${JSON.stringify(result)}`;
        }

        if (actionObj.action === "create_tool") {
            const newTool: Tool = {
                name: actionObj.tool,
                description: actionObj.description,
                code: actionObj.code
            };
            await this.learnAbility(newTool);
            const result = await this.useSandboxTool(newTool.name, actionObj.args || {});
            return `Tool created and executed. Result: ${JSON.stringify(result)}`;
        }

        return "Unknown action type.";
    }

    async useSandboxTool(toolName: string, args: any = {}): Promise<any> {
        const tool = this.config.abilities.find(t => t.name === toolName);
        if (!tool) throw new Error(`Tool ${toolName} not found in agent's abilities.`);
        console.log(`[Agent ${this.config.name}] Running sandbox tool '${toolName}'...`);
        return await executeToolSandbox(tool.code, args);
    }

    async learnAbility(tool: Tool) {
        this.config.abilities.push(tool);
        console.log(`[Agent ${this.config.name}] Learned new ability: ${tool.name}`);
        await saveToolToDatabase(tool);
    }
}
