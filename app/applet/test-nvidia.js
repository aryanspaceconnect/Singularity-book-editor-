fetch("http://127.0.0.1:3000/api/agents/nvidia", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "z-ai/glm-5.1",
    messages: [{role: "user", content: "Write a haiku about computers"}],
    chat_template_kwargs: {
      enable_thinking: true,
      clear_thinking: false
    },
    stream: true
  })
}).then(async r => {
  const reader = r.body.getReader();
  const decoder = new TextDecoder("utf-8");
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    console.log("CHUNK>>", decoder.decode(value));
  }
}).catch(console.error);
