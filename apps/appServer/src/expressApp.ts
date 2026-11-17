import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const expressApp = express();
expressApp.use(express.json());

// Security and discovery headers middleware
expressApp.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(self), geolocation=()",
  );
  res.setHeader("X-Robots-Tag", "index, follow");
  next();
});

expressApp.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", app: "S-G-3D" });
});

// Only serve static client files when running in production.
if (process.env.NODE_ENV === "production") {
  const clientDistPath = path.join(__dirname, "../../appClient/dist");
  expressApp.use(express.static(clientDistPath));

  expressApp.get("*", (_req: Request, res: Response) => {
    res.status(200).sendFile(path.join(clientDistPath, "index.html"));
  });
} else {
  expressApp.get("/", (_req: Request, res: Response) => {
    res.redirect("http://localhost:3000");
  });
}

expressApp.use(
  (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  },
);
