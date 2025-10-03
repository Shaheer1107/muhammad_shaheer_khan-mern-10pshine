// src/middlewares/parsers.js
import express from "express";
import cookieParser from "cookie-parser";

const jsonParser = express.json({ limit: "5mb" });
const cookie = cookieParser();

export function parsersMiddleware(req, res, next) {
  // call the express middleware functions in order
  jsonParser(req, res, (err) => {
    if (err) return next(err);
    cookie(req, res, next);
  });
}
