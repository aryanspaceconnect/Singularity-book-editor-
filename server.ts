import express from "express";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set the limit higher for large document indexing
  app.use(express.json({ limit: "50mb" }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/agents/nvidia", async (req, res) => {
    const { prompt } = req.body;
    const apiKey = process.env.NVIDIA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "NVIDIA_API_KEY is not configured on the server." });
    }

    try {
      const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          model: "google/gemma-4-31b-it",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 16384,
          temperature: 1.00,
          top_p: 0.95,
          stream: false,
          chat_template_kwargs: { enable_thinking: true }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("NVIDIA API Error Response:", errorText);
        return res.status(response.status).json({ error: "Failed to fetch from NVIDIA API" });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("NVIDIA API Error:", error);
      res.status(500).json({ error: "Failed to fetch from NVIDIA API" });
    }
  });

  const fs = await import("fs");
  const isProduction = process.env.NODE_ENV === "production" || fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'));

  // Vite middleware for development
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
