export const AI_MODELS = [
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Default)', provider: 'google' },
  { id: 'z-ai/glm-5.1', name: 'GLM 5.1 (NVIDIA)', provider: 'nvidia' },
  { id: 'custom-nvidia', name: 'Custom NVIDIA Model...', provider: 'nvidia' },
  { id: 'custom-google', name: 'Custom Google Model...', provider: 'google' }
];

export function getProviderForModel(modelId: string) {
  if (modelId.startsWith('custom-nvidia:')) return 'nvidia';
  if (modelId.startsWith('custom-google:')) return 'google';

  const model = AI_MODELS.find(m => m.id === modelId);
  return model ? model.provider : 'google';
}

export function extractActualModelId(modelId: string) {
  if (modelId.startsWith('custom-nvidia:')) return modelId.replace('custom-nvidia:', '');
  if (modelId.startsWith('custom-google:')) return modelId.replace('custom-google:', '');
  return modelId;
}
