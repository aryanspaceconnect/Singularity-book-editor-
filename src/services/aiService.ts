import { UniversalAI } from "../lib/UniversalAI";
import { AI_MODELS, getProviderForModel } from "./aiModels";

export async function verifyApiKey(apiKey: string, modelId: string = AI_MODELS[0].id): Promise<boolean> {
  try {
    let activeApiKey = apiKey;
    if (!activeApiKey || activeApiKey.trim() === '') {
      // Use fallback
      if (getProviderForModel(modelId) === 'openrouter') {
        activeApiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || '';
      } else {
        activeApiKey = process.env.GEMINI_API_KEY || '';
      }
    }
    const ai = new UniversalAI(activeApiKey, modelId);
    await ai.models.generateContent({ model: modelId, contents: "Test connection" });
    return true;
  } catch (error) {
    console.error("API Key verification failed:", error);
    return false;
  }
}
