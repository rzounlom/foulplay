// Learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// Polyfill for Next.js Request/Response APIs in Jest
import { TextEncoder, TextDecoder } from "util";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill for Request/Response (needed for NextRequest)
// This must be set before Next.js modules are imported
if (typeof global.Request === "undefined") {
  // Try to use undici if available (proper polyfill)
  try {
    const { Request, Response, Headers } = require("undici");
    global.Request = Request;
    global.Response = Response;
    global.Headers = Headers;
  } catch {
    // Fallback: Create minimal polyfill that matches Web API
    global.Request = class Request {
      constructor(input, init) {
        this.url = typeof input === "string" ? input : input.url;
        this.method = init?.method || "GET";
        this.headers = init?.headers || {};
        this.body = init?.body || null;
      }
      async json() {
        if (typeof this.body === "string") {
          return JSON.parse(this.body);
        }
        return this.body || {};
      }
      async text() {
        return typeof this.body === "string" ? this.body : JSON.stringify(this.body);
      }
    };
  
    global.Response = class Response {
      constructor(body, init) {
        this.body = body;
        this.status = init?.status || 200;
        this.statusText = init?.statusText || "OK";
        this.ok = this.status >= 200 && this.status < 300;
      }
      async json() {
        return this.body;
      }
      async text() {
        return typeof this.body === "string" ? this.body : JSON.stringify(this.body);
      }
    };
  
    global.Headers = class Headers {
      constructor(init) {
        this.headers = new Map();
        if (init) {
          if (init instanceof Headers) {
            init.headers.forEach((value, key) => {
              this.headers.set(key, value);
            });
          } else if (Array.isArray(init)) {
            init.forEach(([key, value]) => {
              this.headers.set(key, value);
            });
          } else {
            Object.entries(init).forEach(([key, value]) => {
              this.headers.set(key, value);
            });
          }
        }
      }
      get(name) {
        return this.headers.get(name.toLowerCase()) || null;
      }
      set(name, value) {
        this.headers.set(name.toLowerCase(), value);
      }
      has(name) {
        return this.headers.has(name.toLowerCase());
      }
      delete(name) {
        this.headers.delete(name.toLowerCase());
      }
      forEach(callback) {
        this.headers.forEach(callback);
      }
    };
  }
}
