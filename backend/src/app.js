// src/app.js
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { requestLogger } from "./middlewares/pinoMiddleware.js";
import requestIdMiddleware from "./middlewares/requestId.js";
import contentTypeCheck from "./middlewares/contentTypeCheck.js";
import { parsersMiddleware } from "./middlewares/parsers.js";
import errorHandler from "./middlewares/errorHandler.js";

import authRoutes from "./routes/auth.js";
import notesRoutes from "./routes/notesRoutes.js";
import uploadsRoutes from "./routes/uploads.js"; // <--- new

dotenv.config();

const app = express();

// Resolve __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Enable CORS for frontend (React Vite default: http://localhost:5173)
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true, // allow cookies/auth headers if needed
  })
);

// Logging (pino-http)
app.use(requestLogger);

// Request id & req.log child
app.use(requestIdMiddleware);

// Content-Type guard for endpoints that carry JSON payloads
app.use(contentTypeCheck);

// Body parsers & cookie parser
app.use(parsersMiddleware);

// Serve uploaded files statically from project-root /uploads
// maps: GET /uploads/<filename> -> ./uploads/<filename>
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/uploads", uploadsRoutes); // mount uploads route
app.use("/api/notes", notesRoutes);

// Centralized error handler (after routes)
app.use(errorHandler);

export default app;
