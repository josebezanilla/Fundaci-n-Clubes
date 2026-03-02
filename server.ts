import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy is important when running behind Google's proxy
  app.set('trust proxy', 1);

  // Permissive CORS for all origins
  app.use(cors({
    origin: true,
    credentials: true,
  }));

  // Middleware to allow embedding and help with Safari/iOS
  app.use((req, res, next) => {
    res.removeHeader("X-Frame-Options");
    // CSP frame-ancestors is the modern way to control embedding
    res.setHeader("Content-Security-Policy", "frame-ancestors *");
    // Help with cross-site tracking issues in some browsers
    res.setHeader("Access-Control-Allow-Credentials", "true");
    next();
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
