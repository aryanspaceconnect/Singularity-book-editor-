import { GoogleGenAI } from '@google/genai';
import { getProviderForModel, extractActualModelId } from '../services/aiModels';

export class UniversalAI {
  private _apiKey: string;
  private _defaultModel: string;
  private _provider: string;
  private _geminiClient: GoogleGenAI;

  constructor(apiKey: string | undefined, defaultModel: string) {
    this._apiKey = apiKey || '';
    this._defaultModel = defaultModel;
    this._provider = getProviderForModel(defaultModel);
    
    // Always instantiate Gemini client as fallback/default
    this._geminiClient = new GoogleGenAI({ apiKey: this._apiKey });
  }

  // Mimic GoogleGenAI chats API
  get chats() {
    return {
      create: (config: any) => {
        // If config.model is provided but we have a user-selected _defaultModel (that isn't gemini-3.1-flash-image-preview),
        // we should prefer the _defaultModel for standard chat agents so user settings apply universally.
        let modelId = config.model || this._defaultModel;
        if (config.model && !config.model.includes('image') && this._defaultModel) {
            modelId = this._defaultModel; // Override hardcoded models in code with user selected model
        }

        const provider = getProviderForModel(modelId);
        const actualModelId = extractActualModelId(modelId);

        if (provider === 'google') {
          return this._geminiClient.chats.create({ ...config, model: actualModelId });
        }

        // Nvidia Polyfill for .chats.create()
        return new NvidiaChatSession(this._apiKey, actualModelId, config);
      }
    };
  }

  get models() {
    return {
      generateContent: (config: any) => {
        let modelId = config.model || this._defaultModel;
        if (config.model && !config.model.includes('image') && this._defaultModel) {
            modelId = this._defaultModel; // Override
        }
        const provider = getProviderForModel(modelId);
        const actualModelId = extractActualModelId(modelId);

        if (provider === 'google') {
          return this._geminiClient.models.generateContent({ ...config, model: actualModelId });
        }

        // Nvidia polyfill for generateContent
        return new NvidiaModel(this._apiKey, actualModelId).generateContent(config);
      }
    };
  }

  // Fallbacks if ever needed
  get provider() { return this._provider; }
}

class NvidiaModel {
  constructor(private apiKey: string, private modelId: string) {}

  async generateContent(config: any) {
    let messages: any[] = [];
    let sysInstruction = config.systemInstruction;
    if (config.config && config.config.systemInstruction) {
       sysInstruction = config.config.systemInstruction;
    }
    if (sysInstruction) {
       messages.push({ role: 'system', content: sysInstruction });
    }
    
    if (Array.isArray(config.contents)) {
      config.contents.forEach((c: any) => {
        let text = '';
        if (c.parts && Array.isArray(c.parts)) {
          text = c.parts.map((p:any) => p.text).join('');
        } else if (typeof c.parts === 'string') {
          text = c.parts;
        } else if (typeof c === 'string') {
          text = c;
        } else {
          text = JSON.stringify(c);
        }
        messages.push({
          role: c.role === 'model' ? 'assistant' : (c.role === 'user' ? 'user' : 'user'),
          content: text
        });
      });
    } else {
      const prompt = typeof config.contents === 'string' ? config.contents : config.contents?.[0]?.parts?.[0]?.text || config.contents || "";
      messages.push({ role: 'user', content: prompt });
    }
    
    const body: any = {
      model: this.modelId,
      messages: messages,
      temperature: 1,
      top_p: 1,
      max_tokens: 16384,
      chat_template_kwargs: {
        enable_thinking: true,
        clear_thinking: false
      }
    };

    let toolsConfig = config.tools;
    if (config.config && config.config.tools) {
      toolsConfig = config.config.tools;
    }

    if (toolsConfig && Array.isArray(toolsConfig)) {
      const tools = mapToolsToNvidia(toolsConfig);
      if (tools.length > 0) {
        body.tools = tools;
      }
    }

    if (!this.apiKey) {
      this.apiKey = "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";
    }

    // Force streaming to avoid network timeouts on big generations
    body.stream = true;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    let response;
    try {
      response = await fetch("/api/agents/nvidia", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NVIDIA API error (${response.status}): ${errorText}`);
    }

    let fullContent = "";
    let fullReasoning = "";
    let functionCallsMap = new Map<number, any>();

    const reader = response.body?.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const dataStr = trimmed.replace("data: ", "").trim();
          if (dataStr === "[DONE]") continue;
          let data;
          try {
            data = JSON.parse(dataStr);
          } catch (e) {
            continue;
          }
          if (data.error) {
            throw new Error(`NVIDIA Stream Error: ${data.error.message || JSON.stringify(data.error)}`);
          }
          const delta = data.choices?.[0]?.delta;
          if (!delta) continue;
          
          if (delta.reasoning_content) fullReasoning += delta.reasoning_content;
          if (delta.content) fullContent += delta.content;
          
          if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls) {
              if (!functionCallsMap.has(tc.index)) {
                functionCallsMap.set(tc.index, { id: tc.id, function: { name: tc.function?.name || "", arguments: tc.function?.arguments || "" } });
              } else {
                const existing = functionCallsMap.get(tc.index);
                if (tc.function?.arguments) {
                  existing.function.arguments += tc.function.arguments;
                }
              }
            }
          }
        }
      }
    }

    const assistantMessage: any = {
      role: 'assistant',
      content: fullContent
    };

    if (fullReasoning) {
      assistantMessage.reasoning_content = fullReasoning;
      assistantMessage.content = `<details class="my-2 border p-2 rounded-md border-gray-600 bg-gray-900 text-gray-400"><summary class="cursor-pointer font-semibold text-gray-300">Reasoning</summary>\n\n${fullReasoning}\n</details>\n\n${fullContent}`;
    }

    let functionCalls: any[] | undefined = undefined;
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      functionCalls = assistantMessage.tool_calls.map((tc: any) => {
         let args = {};
         try { args = JSON.parse(tc.function.arguments); } catch(e){}
         return {
           name: tc.function.name,
           args: args
         }
      });
    }

    return {
      text: assistantMessage?.content || "",
      functionCalls,
      candidates: [{
        content: {
          parts: [{ text: assistantMessage?.content || "" }]
        }
      }]
    };
  }
}

function mapToolsToNvidia(geminiTools: any[]) {
  const nvidiaTools: any[] = [];
  for (const group of geminiTools) {
    if (group.functionDeclarations && Array.isArray(group.functionDeclarations)) {
      for (const fn of group.functionDeclarations) {
        // Deep copy parameters to modify case
        const parameters = JSON.parse(JSON.stringify(fn.parameters || { type: "object", properties: {} }));
        
        // Fix Types to lower case which JSON schema expects
        const fixTypes = (obj: any) => {
          if (obj && typeof obj === 'object') {
            if (obj.type && typeof obj.type === 'string') {
              obj.type = obj.type.toLowerCase();
            }
            if (obj.properties) {
              for (const k in obj.properties) {
                fixTypes(obj.properties[k]);
              }
            }
            if (obj.items) {
               fixTypes(obj.items);
            }
          }
        };
        fixTypes(parameters);

        nvidiaTools.push({
          type: "function",
          function: {
            name: fn.name,
            description: fn.description,
            parameters: parameters
          }
        });
      }
    }
  }
  return nvidiaTools;
}

class NvidiaChatSession {
  private history: any[] = [];
  private systemInstruction: string = '';
  private tools: any[] | undefined = undefined;
  
  constructor(private apiKey: string, private modelId: string, private config: any) {
    if (config.config && config.config.systemInstruction) {
      this.systemInstruction = config.config.systemInstruction;
    } else if (config.systemInstruction) {
      this.systemInstruction = config.systemInstruction;
    }

    if (config.config && config.config.tools) {
       const mappedTools = mapToolsToNvidia(config.config.tools);
       if (mappedTools.length > 0) this.tools = mappedTools;
    } else if (config.tools) {
       const mappedTools = mapToolsToNvidia(config.tools);
       if (mappedTools.length > 0) this.tools = mappedTools;
    }
    
    if (config.history && Array.isArray(config.history)) {
      // Map Gemini history to OpenAI history
      this.history = config.history.map((h: any) => {
        let content = '';
        if (h.parts && Array.isArray(h.parts)) {
          content = h.parts.map((p: any) => p.text).join('');
        } else if (typeof h.parts === 'string') {
          content = h.parts;
        }
        let r = h.role === 'model' ? 'assistant' : 'user';
        if (h.role !== 'model' && h.role !== 'user' && h.role !== 'assistant') {
           r = 'user'; // fallback
        }
        return {
          role: r,
          content: content
        };
      });
    }
  }

  async sendMessage(params: any) {
    const userMessage = typeof params === 'string' ? params : params.message;
    
    const messages = [];
    if (this.systemInstruction) {
      messages.push({ role: 'system', content: this.systemInstruction });
    }
    messages.push(...this.history);

    // If params is an array or object containing functionResponses
    if (Array.isArray(userMessage) && userMessage.length > 0 && userMessage[0].functionResponse) {
       // Gemini passes function responses, OpenAI needs role: "tool"
       for (const fnResp of userMessage) {
           const { name, response } = fnResp.functionResponse;
           let lastAssistantMsg = this.history[this.history.length - 1];
           let toolCallId = "call_" + Math.random().toString(36).substring(7); // fallback
           if (lastAssistantMsg && lastAssistantMsg.tool_calls) {
              const matchedCall = lastAssistantMsg.tool_calls.find((tc: any) => tc.function.name === name);
              if (matchedCall) toolCallId = matchedCall.id;
           }
           messages.push({
             role: "tool",
             tool_call_id: toolCallId,
             name: name,
             content: JSON.stringify(response)
           });
       }
    } else {
       // Normal user message
       let content = '';
       if (typeof userMessage === 'string') {
         content = userMessage;
       } else {
         content = typeof userMessage !== 'undefined' ? JSON.stringify(userMessage) : JSON.stringify(params);
       }
       messages.push({ role: 'user', content });
       this.history.push({ role: 'user', content });
    }

    // final sanity check
    const cleanMessages = messages.map(m => {
       if (m.role === 'model') return { ...m, role: 'assistant' };
       return m;
    });

    const body: any = {
      model: this.modelId,
      messages: cleanMessages,
      temperature: 1,
      top_p: 1,
      max_tokens: 16384,
      chat_template_kwargs: {
        enable_thinking: true,
        clear_thinking: false
      }
    };

    if (this.tools) {
      body.tools = this.tools;
    }

    if (!this.apiKey) {
      this.apiKey = "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";
    }

    // Force streaming to avoid network timeouts on big generations
    body.stream = true;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    let response;
    try {
      response = await fetch("/api/agents/nvidia", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NVIDIA API error (${response.status}): ${errorText}`);
    }

    let fullContent = "";
    let fullReasoning = "";
    let functionCallsMap = new Map<number, any>();

    const reader = response.body?.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const dataStr = trimmed.replace("data: ", "").trim();
          if (dataStr === "[DONE]") continue;
          let data;
          try {
            data = JSON.parse(dataStr);
          } catch (e) {
            continue;
          }
          if (data.error) {
            throw new Error(`NVIDIA Stream Error: ${data.error.message || JSON.stringify(data.error)}`);
          }
          const delta = data.choices?.[0]?.delta;
          if (!delta) continue;
          
          if (delta.reasoning_content) fullReasoning += delta.reasoning_content;
          if (delta.content) fullContent += delta.content;
          
          if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls) {
              if (!functionCallsMap.has(tc.index)) {
                functionCallsMap.set(tc.index, { id: tc.id, function: { name: tc.function?.name || "", arguments: tc.function?.arguments || "" } });
              } else {
                const existing = functionCallsMap.get(tc.index);
                if (tc.function?.arguments) {
                  existing.function.arguments += tc.function.arguments;
                }
              }
            }
          }
        }
      }
    }

    const assistantMessage: any = {
      role: 'assistant',
      content: fullContent
    };

    if (fullReasoning) {
      assistantMessage.reasoning_content = fullReasoning;
      assistantMessage.content = `<details class="my-2 border p-2 rounded-md border-gray-600 bg-gray-900 text-gray-400"><summary class="cursor-pointer font-semibold text-gray-300">Reasoning</summary>\n\n${fullReasoning}\n</details>\n\n${fullContent}`;
    }

    if (functionCallsMap.size > 0) {
      assistantMessage.tool_calls = Array.from(functionCallsMap.values()).map(tc => ({
        id: tc.id,
        type: 'function',
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments
        }
      }));
    }

    // Store in history
    if (assistantMessage) {
      this.history.push(assistantMessage);
    }

    let functionCalls: any[] | undefined = undefined;
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      functionCalls = assistantMessage.tool_calls.map((tc: any) => {
         let args = {};
         try { args = JSON.parse(tc.function.arguments); } catch(e){}
         return {
           name: tc.function.name,
           args: args
         }
      });
    }

    return {
      text: assistantMessage?.content || "",
      functionCalls,
      candidates: [{
        content: {
          parts: [{ text: assistantMessage?.content || "" }]
        }
      }]
    };
  }
}
