// ✅ jest.setup.js (ESM version for Vite + Jest + Babel)

import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

// Polyfill TextEncoder/TextDecoder for jsdom
if (typeof global.TextEncoder === "undefined") global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder === "undefined") global.TextDecoder = TextDecoder;

// ✅ Polyfill import.meta.env (Vite-style) for Jest environment
if (typeof global.import === "undefined") {
  global.import = {
    meta: {
      env: {
        VITE_API_URL: process.env.VITE_API_URL || "http://localhost:5000/api",
      },
    },
  };
} else if (!global.import.meta) {
  global.import.meta = {
    env: {
      VITE_API_URL: process.env.VITE_API_URL || "http://localhost:5000/api",
    },
  };
} else if (!global.import.meta.env) {
  global.import.meta.env = {
    VITE_API_URL: process.env.VITE_API_URL || "http://localhost:5000/api",
  };
}

// ✅ Ensure process.env has the same value
process.env.VITE_API_URL = process.env.VITE_API_URL || "http://localhost:5000/api";

// ✅ Provide mock window env
if (typeof global.window === "undefined") global.window = {};
global.window.__VITE_ENV__ = global.window.__VITE_ENV__ || {
  VITE_API_URL: process.env.VITE_API_URL,
};

// ✅ Suppress noisy logs and ReactDOM.render warnings
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    const message = args[0] ? args[0].toString() : "";
    if (
      message.includes("not wrapped in act") ||
      message.includes("act(") ||
      message.includes("ReactDOM.render") ||
      message.includes("Failed to fetch")
    ) {
      return; // skip noisy async warnings
    }
    originalError(...args);
  };
});

afterAll(() => {
  console.error = originalError;
});