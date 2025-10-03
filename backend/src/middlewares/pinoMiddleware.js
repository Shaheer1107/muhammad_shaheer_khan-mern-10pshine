// src/middlewares/pinoMiddleware.js
import pinoHttp from "pino-http";
import logger from "../logger.js";

export const requestLogger = pinoHttp({
  logger,
  // decide level only by status code (ignore stray err)
  customLogLevel: (res /*, err */) => {
    if (res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: () => "request completed",
  customErrorMessage: (req, res, err) => (err ? "request errored" : "request completed"),
  serializers: {
    req: (req) => ({ method: req.method, url: req.url, params: req.params, query: req.query }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
