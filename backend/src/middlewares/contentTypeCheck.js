// src/middlewares/contentTypeCheck.js
export default function contentTypeCheck(req, res, next) {
  const methods = ["POST", "PUT", "PATCH"];
  if (methods.includes(req.method)) {
    const contentType = req.headers["content-type"];
    // If no header or not application/json, reject
    if (!contentType || !req.is("application/json")) {
      return res.status(400).json({ error: { message: "Content-Type must be application/json" } });
    }
  }
  next();
}
