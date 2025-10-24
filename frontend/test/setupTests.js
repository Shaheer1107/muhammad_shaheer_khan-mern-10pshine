// ✅ Mock for Vite's import.meta.env (prevents SyntaxError in Jest)
if (typeof global.import === "undefined") {
  global.import = {};
}

if (typeof global.import.meta === "undefined") {
  global.import.meta = { env: {} };
}

if (typeof global.import.meta.env === "undefined") {
  global.import.meta.env = {};
}

// Set mock environment variable for tests
global.import.meta.env.VITE_API_URL = "http://localhost:5000/api";

// ✅ Also provide process.env fallback for safety
process.env.VITE_API_URL = process.env.VITE_API_URL || "http://localhost:5000/api";

// 🧪 React Testing Library setup
import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

// Polyfill TextEncoder/TextDecoder if missing
if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// 🧹 Suppress noisy console errors (ReactDOM.render warnings, JSDOM logs)
const originalError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === "string" &&
    (/ReactDOM.render is no longer supported|Not implemented:/.test(args[0]))
  ) {
    return;
  }
  originalError(...args);
};

// ✅ Optional: mock matchMedia if using responsive components
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
  });
}
