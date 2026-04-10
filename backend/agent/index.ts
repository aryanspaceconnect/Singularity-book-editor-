import { executeToolSandbox } from '../sandbox/index';
import { saveToolToDatabase, getToolFromDatabase } from '../firebase/index';

export interface Tool {
    name: string;
    description: string;
    code: string;
}

export interface AgentConfig {
    name: string;
    mission: string;
    personality: string;
    experience: string[];
    memory: any[];
    abilities: Tool[];
}

export class Agent {
    public config: AgentConfig;

    constructor(config: AgentConfig) {
        this.config = config;
    }

    /**
     * The main thinking loop for the agent.
     * Based on the prompt, it decides whether to run a tool, create a tool, or just reply.
     */
    async think(prompt: string): Promise<string> {
        const systemPrompt = `
You are an autonomous AI Agent running within a code execution environment.
Name: ${this.config.name}
Mission: ${this.config.mission}
Personality: ${this.config.personality}

Available Tools (Abilities):
${this.config.abilities.length > 0
    ? this.config.abilities.map(t => `- ${t.name}: ${t.description}`).join('\n')
    : "None"}

Your job is to solve the user's prompt.
If you need a tool you do not have, you MUST write the JavaScript code for it.

Output format instructions:
If you need to execute an existing tool, reply strictly with JSON:
{ "action": "use_tool", "tool": "toolName", "args": { "arg1": "val" } }

If you need to create a new tool, reply strictly with JSON:
{
  "action": "create_tool",
  "tool": "toolName",
  "description": "What it does",
  "code": "The raw JS code. Must return a value or promise. Uses 'args' object for inputs. No markdown blocks."
}

If you just want to talk, reply strictly with JSON:
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
                    temperature: 0.2, // low temp for better JSON
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

            // Try to extract JSON if the LLM wraps it in markdown blocks
            let jsonString = content.trim();
            if (jsonString.startsWith('```json')) {
                jsonString = jsonString.slice(7, -3).trim();
            } else if (jsonString.startsWith('```')) {
                jsonString = jsonString.slice(3, -3).trim();
            }

            const parsed = JSON.parse(jsonString);
            return this.handleAction(parsed);

        } catch (error) {
            console.error("[Agent Error]", error);
            throw error;
        }
    }

    /**
     * Handles the structured action decided by the LLM
     */
    private async handleAction(actionObj: any): Promise<any> {
        console.log(`[Agent ${this.config.name}] Action chosen:`, actionObj.action);

        if (actionObj.action === "reply") {
            return actionObj.message;
        }

        if (actionObj.action === "use_tool") {
            const result = await this.useTool(actionObj.tool, actionObj.args);
            return `Tool executed successfully. Result: ${JSON.stringify(result)}`;
        }

        if (actionObj.action === "create_tool") {
            const newTool: Tool = {
                name: actionObj.tool,
                description: actionObj.description,
                code: actionObj.code
            };
            await this.learnAbility(newTool);

            // Run the tool immediately after creating it
            console.log(`[Agent ${this.config.name}] Executing newly created tool: ${newTool.name}`);
            const result = await this.useTool(newTool.name, actionObj.args || {});
            return `Tool created and executed. Result: ${JSON.stringify(result)}`;
        }

        return "Unknown action type.";
    }

    /**
     * Executes a tool from its current abilities in the Sandbox
     */
    async useTool(toolName: string, args: any = {}): Promise<any> {
        const tool = this.config.abilities.find(t => t.name === toolName);
        if (!tool) {
            throw new Error(`Tool ${toolName} not found in agent's abilities.`);
        }

        console.log(`[Agent ${this.config.name}] Running tool '${toolName}' in sandbox...`);
        return await executeToolSandbox(tool.code, args);
    }

    /**
     * Add a newly created tool to abilities and save it to the DB
     */
    async learnAbility(tool: Tool) {
        this.config.abilities.push(tool);
        console.log(`[Agent ${this.config.name}] Learned new ability: ${tool.name}`);
        await saveToolToDatabase(tool);
    }

    /**
     * Checks DB for an existing tool and adds it if found
     */
    async loadAbilityFromDB(toolName: string) {
        const tool = await getToolFromDatabase(toolName);
        if (tool) {
            this.config.abilities.push(tool);
            console.log(`[Agent ${this.config.name}] Loaded existing ability from DB: ${tool.name}`);
        }
    }
}
