// src/logger.js
import pino from "pino";
import fs from "fs";
import path from "path";

const isDev = process.env.NODE_ENV !== "production";
const level = process.env.LOG_LEVEL || "info";

const base = {
  app: process.env.APP_NAME || "notes-backend",
  env: process.env.NODE_ENV || (isDev ? "development" : "production"),
};

function ensureLogsDir() {
  const logsDir = path.resolve(process.cwd(), "logs");
  try {
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    return logsDir;
  } catch (e) {
    // fallback: warn and return null (we'll still log to stdout)
    // eslint-disable-next-line no-console
    console.warn("Could not create logs directory:", e?.message || e);
    return null;
  }
}

let logger;

if (isDev) {
  const logsDir = ensureLogsDir();
  const filePath = logsDir ? path.join(logsDir, "app.log") : null;
  const fileDest = filePath ? pino.destination({ dest: filePath, sync: false }) : null;

  // Prepare console stream: try to use pino-pretty transport, otherwise stdout
  let prettyStream = process.stdout;
  try {
    // pino.transport returns a destination that can be used as a stream in multistream
    prettyStream = pino.transport({
      target: "pino-pretty",
      options: { translateTime: "SYS:standard", ignore: "pid,hostname" },
    });
  } catch (err) {
    // If pino-pretty isn't installed or transport fails, fallback to stdout
    // eslint-disable-next-line no-console
    console.warn("pino-pretty transport not available, falling back to stdout. Install pino-pretty for pretty logs.");
    prettyStream = process.stdout;
  }

  // Build streams array for multistream; keep order: console first, file second
  const streams = [];
  streams.push({ stream: prettyStream });
  if (fileDest) streams.push({ stream: fileDest });

  // Create a destination that writes to both streams
  const dest = pino.multistream(streams);

  // Create a real pino logger instance (so .child() exists) with the multistream destination
  logger = pino({ level, base }, dest);
} else {
  // production: simple JSON to stdout, real pino logger instance
  logger = pino({ level, base });
}

export default logger;
