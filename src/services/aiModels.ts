export const AI_MODELS = [
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Default)', provider: 'google' },
  { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B (OpenRouter)', provider: 'openrouter' },
  { id: 'nousresearch/hermes-3-llama-3.1-405b:free', name: 'Hermes 3 (OpenRouter)', provider: 'openrouter' },
  { id: 'minimax/minimax-m2.5:free', name: 'MiniMax M2.5 (OpenRouter)', provider: 'openrouter' },
  { id: 'z-ai/glm-4.5-air:free', name: 'GLM 4.5 Air (OpenRouter)', provider: 'openrouter' }
];

export function getProviderForModel(modelId: string) {
  const model = AI_MODELS.find(m => m.id === modelId);
  return model ? model.provider : 'google';
}
