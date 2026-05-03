import { UniversalAI } from "../lib/UniversalAI";
import { AI_MODELS, getProviderForModel } from "./aiModels";

export async function verifyApiKey(apiKey: string, modelId: string = AI_MODELS[0].id): Promise<boolean> {
  try {
    let activeApiKey = apiKey;
    if (!activeApiKey || activeApiKey.trim() === '') {
      // Use fallback
      if (getProviderForModel(modelId) === 'nvidia') {
        activeApiKey = "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";
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
