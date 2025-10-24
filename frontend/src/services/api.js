import axios from "axios";

// ✅ Detect Vite or Jest environment safely
let baseURL = "http://localhost:5000/api";

// Jest / Node tests (process.env exists here)
if (typeof process !== "undefined" && process.env?.VITE_API_URL) {
  baseURL = process.env.VITE_API_URL;
} else {
  // Vite / Browser build: dynamically access import.meta.env without syntax parsing errors
  try {
    const viteEnv = new Function(
      "return (typeof import !== 'undefined' && import.meta?.env?.VITE_API_URL) || null;"
    )();
    if (viteEnv) baseURL = viteEnv;
  } catch {
    // ignore if unavailable
  }
}

// ✅ Create Axios instance
const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Global response interceptor for consistent error logging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
