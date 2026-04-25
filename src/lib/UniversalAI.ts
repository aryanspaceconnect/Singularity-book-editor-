import { GoogleGenAI } from '@google/genai';
import { getProviderForModel } from '../services/aiModels';

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

        if (provider === 'google') {
          return this._geminiClient.chats.create({ ...config, model: modelId });
        }

        // OpenRouter Polyfill for .chats.create()
        return new OpenRouterChatSession(this._apiKey, modelId, config);
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

        if (provider === 'google') {
          return this._geminiClient.models.generateContent({ ...config, model: modelId });
        }

        // OpenRouter polyfill for generateContent
        return new OpenRouterModel(this._apiKey, modelId).generateContent(config);
      }
    };
  }

  // Fallbacks if ever needed
  get provider() { return this._provider; }
}

class OpenRouterModel {
  constructor(private apiKey: string, private modelId: string) {}

  async generateContent(config: any) {
    let messages: any[] = [];
    if (config.systemInstruction) {
       messages.push({ role: 'system', content: config.systemInstruction });
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
      messages: messages
    };

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": typeof window !== 'undefined' ? window.location.href : "https://ai.studio.app",
        "X-Title": "AI Studio Book App"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return {
      text: data.choices?.[0]?.message?.content || "",
      functionCalls: undefined
    };
  }
}

class OpenRouterChatSession {
  private history: any[] = [];
  private systemInstruction: string = '';

  constructor(private apiKey: string, private modelId: string, private config: any) {
    if (config.config && config.config.systemInstruction) {
      this.systemInstruction = config.config.systemInstruction;
    } else if (config.systemInstruction) {
      this.systemInstruction = config.systemInstruction;
    }
    
    if (config.history && Array.isArray(config.history)) {
      // Map Gemini history to OpenRouter history
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
    // userMessage could be a string, or an array of functionResponses
    let content = '';
    
    if (typeof userMessage === 'string') {
      content = userMessage;
    } else if (Array.isArray(userMessage) || Array.isArray(params)) {
      // We are simulating a response to a function call.
      // OpenRouter / OpenAI typically expects role: 'tool'
      // But for simplicity in this proxy, we might just stringify it
      content = JSON.stringify(userMessage || params);
    } else {
      content = typeof userMessage !== 'undefined' ? JSON.stringify(userMessage) : JSON.stringify(params);
    }

    const messages = [];
    if (this.systemInstruction) {
      messages.push({ role: 'system', content: this.systemInstruction });
    }
    messages.push(...this.history);
    messages.push({ role: 'user', content });

    // final sanity check
    const cleanMessages = messages.map(m => {
       if (m.role === 'model') return { ...m, role: 'assistant' };
       return m;
    });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": typeof window !== 'undefined' ? window.location.href : "https://ai.studio.app",
        "X-Title": "AI Studio Book App"
      },
      body: JSON.stringify({
        model: this.modelId,
        messages: cleanMessages
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || "";
    this.history.push({ role: 'user', content });
    this.history.push({ role: 'assistant', content: assistantMessage });

    return { text: assistantMessage, functionCalls: undefined };
  }
}
