/**
 * This file includes polyfills needed by Angular and is loaded before the app.
 * You can add your own extra polyfills to this file.
 */

// Buffer polyfill for browser environment
import { Buffer } from "buffer";

// Make Buffer available globally
try {
  if (typeof (globalThis as any).Buffer === "undefined") {
    (globalThis as any).Buffer = Buffer;
    console.log("✅ Buffer polyfill loaded successfully");
  }
} catch (error) {
  console.warn("⚠️ Failed to assign Buffer globally:", error);
}
