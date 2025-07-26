import { jest } from '@jest/globals';
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();

// Mock global objects that might not be available in Jest environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver if not available
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})) as unknown as typeof global.ResizeObserver;

// Mock crypto for testing
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () =>
      `${Date.now()}-${Math.floor(Math.random() * 1000)}-${Math.floor(
        Math.random() * 1000,
      )}-${Math.floor(Math.random() * 1000)}-${Math.floor(Math.random() * 100000000000)}`,
    subtle: {
      digest: (() => Promise.resolve(new ArrayBuffer(32))) as unknown as typeof crypto.subtle.digest,
    },
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
});

// Suppress console warnings in tests unless explicitly needed
beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.clearAllMocks();
});
