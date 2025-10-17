// src/middlewares/contentTypeCheck.js
export default function contentTypeCheck(req, res, next) {
  // Only enforce for methods that normally carry a body
  const methodsWithBody = ["POST", "PUT", "PATCH"];
  if (!methodsWithBody.includes(req.method)) return next();

  const contentType = (req.headers["content-type"] || "").toLowerCase();

  // Allow JSON, multipart/form-data (file uploads), and urlencoded form bodies
  const ok =
    contentType.startsWith("application/json") ||
    contentType.startsWith("multipart/form-data") ||
    contentType.startsWith("application/x-www-form-urlencoded");

  if (ok) return next();

  // Keep the same response shape used elsewhere in the app
  return res.status(400).json({ error: { message: "Content-Type must be application/json" } });
}
