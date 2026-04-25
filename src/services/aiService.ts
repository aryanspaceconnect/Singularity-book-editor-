import { UniversalAI } from "../lib/UniversalAI";
import { AI_MODELS } from "./aiModels";

export async function verifyApiKey(apiKey: string, modelId: string = AI_MODELS[0].id): Promise<boolean> {
  try {
    const ai = new UniversalAI(apiKey, modelId);
    await ai.models.generateContent({ model: modelId, contents: "Test connection" });
    return true;
  } catch (error) {
    console.error("API Key verification failed:", error);
    return false;
  }
}
