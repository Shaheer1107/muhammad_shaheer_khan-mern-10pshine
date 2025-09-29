import logger from "../logger.js";

export default function errorHandler(err, req, res, next) {
  logger.error({ err }, "Unhandled error");

  const status = err.status || 500;
  const message = err.message || "Internal Server Error";

  const payload = { error: { message } };
  if (process.env.NODE_ENV === "development") {
    payload.error.stack = err.stack;
  }
  res.status(status).json(payload);
}
