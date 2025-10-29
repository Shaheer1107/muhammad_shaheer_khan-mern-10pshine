// jest.setup.js
import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

// Polyfill TextEncoder/TextDecoder for jsdom
if (typeof global.TextEncoder === "undefined") global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder === "undefined") global.TextDecoder = TextDecoder;

// Set up test environment variables
process.env.VITE_API_URL = process.env.VITE_API_URL || "http://localhost:5000/api";

// Provide mock window environment
if (typeof global.window === "undefined") global.window = {};
global.window.__VITE_ENV__ = global.window.__VITE_ENV__ || {
  VITE_API_URL: process.env.VITE_API_URL,
};

// Suppress ReactDOM/render warnings & noisy logs
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
