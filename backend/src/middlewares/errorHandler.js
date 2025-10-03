import logger from "../logger.js";

// helper - redact common sensitive fields from bodies (works with raw JSON string or object)
function scrubBody(body) {
  if (!body) return body;
  try {
    // If it's a string (raw body), try to parse it to a JS object for scrubbing
    let parsed = typeof body === "string" ? JSON.parse(body) : { ...body };

    const redactionKeys = ["password", "token", "refreshToken", "accessToken", "ssn", "creditCard"];
    for (const k of redactionKeys) {
      if (k in parsed) parsed[k] = "***REDACTED***";
    }

    // Return scrubbed object for structured logging
    return parsed;
  } catch (e) {
    // If parsing fails (malformed JSON), return a truncated version of the raw string
    try {
      const asString = typeof body === "string" ? body : JSON.stringify(body);
      return asString.length > 1000 ? asString.slice(0, 1000) + "...[truncated]" : asString;
    } catch {
      return undefined;
    }
  }
}

export default function errorHandler(err, req, res, next) {
  // prefer req.log when available to keep request context
  const log = req && req.log ? req.log : logger;

  // === Special case: malformed JSON from body-parser / express.json() ===
  // body-parser typically sets a SyntaxError with status 400 and includes `body`.
  // Some versions set err.type === 'entity.parse.failed'. Handle both to be robust.
  const isJsonSyntaxError =
    (err && err instanceof SyntaxError && err.status === 400 && "body" in err) ||
    (err && err.type === "entity.parse.failed");

  if (isJsonSyntaxError) {
    // Log full details (including scrubbed raw body) in development for debugging,
    // but avoid leaking raw body/stack in production.
    log.warn(
      {
        err: {
          message: err.message,
          // include stack only in development
          stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        },
        url: req?.originalUrl,
        method: req?.method,
        user: req?.user?.id,
        // include scrubbed body only in development
        body: process.env.NODE_ENV === "development" ? scrubBody(err.body || req?.body) : undefined,
      },
      "Malformed JSON payload"
    );

    return res.status(400).json({
      error: {
        message: "Invalid JSON payload. Please check request body syntax.",
      },
    });
  }

  // === Generic error handling ===
  // Log with context (request URL, method, user if available)
  log.error(
    {
      err,
      url: req?.originalUrl,
      method: req?.method,
      user: req?.user?.id,
      // include scrubbed body in development for debugging
      body: process.env.NODE_ENV === "development" ? scrubBody(err?.body || req?.body) : undefined,
    },
    "Unhandled error"
  );

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  const payload = { error: { message } };

  // In development include stack and (optionally) raw body for easier debugging
  if (process.env.NODE_ENV === "development") {
    payload.error.stack = err.stack;
    if (err.body) payload.error.body = scrubBody(err.body);
  }

  res.status(status).json(payload);
}
