// server.js
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import app from "./app.js";
import logger from "./logger.js";
import { registerProcessHandlers } from "./middlewares/processHandler.js";

dotenv.config();

// Ensure uploads directory exists at project root (where app.js serves from)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "uploads");

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    logger.info({ uploadsDir }, "Created uploads directory");
  }
} catch (err) {
  logger.warn({ err }, "Could not create uploads directory (continuing)");
}

registerProcessHandlers();

(async () => {
  try {
    await connectDB();
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      logger.info({ port }, `Server running on port ${port}`);
    });
  } catch (err) {
    logger.fatal({ err }, "Failed to start server");
    process.exit(1);
  }
})();
