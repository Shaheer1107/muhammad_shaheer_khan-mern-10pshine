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

/**
 * Ensure a logs directory exists (returns the absolute path or null if failed)
 */
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

/**
 * Serializers: keep log payloads useful but avoid leaking secrets
 * - redact Authorization header
 * - avoid dumping entire request/response objects
 */
const { stdSerializers } = pino;
const serializers = {
  req(req) {
    if (!req) return req;
    // Attempt to pick safe fields only
    const safeHeaders = { ...(req.headers || {}) };
    if (safeHeaders.authorization) safeHeaders.authorization = "[REDACTED]";
    return {
      method: req.method,
      url: req.url,
      headers: safeHeaders,
      params: req.params,
      query: req.query,
    };
  },
  res(res) {
    if (!res) return res;
    return {
      statusCode: res.statusCode,
    };
  },
  // Use pino's error serializer if available for nicer error output
  err: stdSerializers ? stdSerializers.err : (err) => ({
    type: err?.name,
    message: err?.message,
    stack: err?.stack,
  }),
};

let logger;

/**
 * Build pino logger instance
 *
 * In development:
 *  - try to use pino-pretty transport (if available)
 *  - also write to logs/app.log (non-blocking)
 *
 * In production:
 *  - plain JSON to stdout
 */
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
  logger = pino({ level, base, serializers }, dest);
} else {
  // production: simple JSON to stdout, real pino logger instance
  logger = pino({ level, base, serializers });
}

/**
 * Convenience helpers
 */

/**
 * Return a child logger with the given module name
 * @param {string} moduleName
 */
function getLogger(moduleName) {
  if (!moduleName) return logger;
  return logger.child({ module: moduleName });
}

/**
 * Return a request-scoped child logger (attach reqId or other metadata)
 * Typical usage in middleware: req.log = getRequestLogger({ reqId, userId })
 *
 * @param {object} meta optional metadata to attach to child logger
 */
function getRequestLogger(meta = {}) {
  if (!meta || Object.keys(meta).length === 0) return logger.child({});
  return logger.child(meta);
}

export default logger;
export { getLogger, getRequestLogger };
