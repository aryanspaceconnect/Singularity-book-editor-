const apiKey = "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";
fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "z-ai/glm-5.1",
    messages: [{role: "user", content: "test"}],
    chat_template_kwargs: {
      enable_thinking: true,
      clear_thinking: false
    }
  })
}).then(r => r.json()).then(console.log).catch(console.error);
