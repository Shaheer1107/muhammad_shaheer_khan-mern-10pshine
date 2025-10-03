// src/app.js
import dotenv from "dotenv";
import express from "express";

import { requestLogger } from "./middlewares/pinoMiddleware.js";
import requestIdMiddleware from "./middlewares/requestId.js";
import contentTypeCheck from "./middlewares/contentTypeCheck.js";
import { parsersMiddleware } from "./middlewares/parsers.js";
import errorHandler from "./middlewares/errorHandler.js";

import authRoutes from "./routes/auth.js";
import notesRoutes from "./routes/notesRoutes.js";

dotenv.config();

const app = express();

// Logging (pino-http)
app.use(requestLogger);

// Request id & req.log child
app.use(requestIdMiddleware);

// Content-Type guard for endpoints that carry JSON payloads
app.use(contentTypeCheck);

// Body parsers & cookie parser
app.use(parsersMiddleware);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/notes", notesRoutes);

// Centralized error handler (after routes)
app.use(errorHandler);

export default app;
