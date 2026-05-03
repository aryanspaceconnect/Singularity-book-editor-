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
    const body = req.body;
    let apiKey = process.env.NVIDIA_API_KEY || req.headers.authorization?.replace('Bearer ', '');

    if (!apiKey || apiKey === "null" || apiKey === "undefined") {
      apiKey = "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"; // User provided key as fallback
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      let response;
      try {
        response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Accept": body.stream ? "text/event-stream" : "application/json"
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("NVIDIA API Error Response:", errorText);
        return res.status(response.status).json({ error: errorText });
      }

      if (body.stream && response.body) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        
        // Node.js 18+ Web Streams to Node.js stream
        // @ts-ignore
        const reader = response.body.getReader();
        
        req.on('close', () => {
          reader.cancel().catch(() => {});
        });

        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
            res.end();
          } catch (err) {
            console.error("Stream error:", err);
            res.end();
          }
        };
        pump();
      } else {
        const data = await response.json();
        res.json(data);
      }
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
