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
    const prompt = typeof config.contents === 'string' ? config.contents : config.contents?.[0]?.parts?.[0]?.text || config.contents || "";
    
    // Some visual helpers pass image inline data. 
    // We'll just pass text for now to the proxy.
    const body: any = {
      model: this.modelId,
      messages: [{ role: 'user', content: prompt }]
    };

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.href, // Recommended for OpenRouter
        "X-Title": "AI Studio Book App"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
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
    if (config.systemInstruction) {
      this.systemInstruction = config.systemInstruction;
    }
    if (config.history) {
      // Map Gemini history to OpenRouter history
      this.history = config.history.map((h: any) => {
        let content = '';
        if (h.parts && Array.isArray(h.parts)) {
          content = h.parts.map((p: any) => p.text).join('');
        } else if (typeof h.parts === 'string') {
          content = h.parts;
        }
        return {
          role: h.role === 'model' ? 'assistant' : 'user',
          content: content
        };
      });
    }
  }

  async sendMessage(params: any) {
    const userMessage = params.message;
    // userMessage could be a string, or an array of functionResponses
    let content = '';
    
    if (typeof userMessage === 'string') {
      content = userMessage;
    } else if (Array.isArray(userMessage)) {
      // We are simulating a response to a function call.
      // OpenRouter / OpenAI typically expects role: 'tool'
      // But for simplicity in this proxy, we might just stringify it
      content = JSON.stringify(userMessage);
    } else {
      content = JSON.stringify(userMessage);
    }

    const messages = [];
    if (this.systemInstruction) {
      messages.push({ role: 'system', content: this.systemInstruction });
    }
    messages.push(...this.history);
    messages.push({ role: 'user', content });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.href,
        "X-Title": "AI Studio Book App"
      },
      body: JSON.stringify({
        model: this.modelId,
        messages: messages
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || "";

    // Append to history
    this.history.push({ role: 'user', content });
    this.history.push({ role: 'assistant', content: assistantMessage });

    return { text: assistantMessage, functionCalls: undefined };
  }
}
