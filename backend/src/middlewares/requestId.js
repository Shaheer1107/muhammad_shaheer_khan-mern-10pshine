// src/middlewares/requestId.js
import logger from "../logger.js";

export default function requestIdMiddleware(req, res, next) {
  try {
    const headerId = req.headers["x-request-id"];
    const requestId = headerId || req.id || Date.now().toString(36);
    // ensure req.log exists (pinoHttp attaches req.log; fallback to shared logger)
    req.log = req.log ? req.log.child({ requestId }) : logger.child({ requestId });
    res.setHeader("X-Request-Id", requestId);
  } catch (e) {
    req.log = logger; // fallback
  }
  next();
}
