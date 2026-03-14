import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = {
  getItem: (key: string): string | null => {
    return localStorageMock.store[key] || null;
  },
  setItem: (key: string, value: string): void => {
    localStorageMock.store[key] = value;
  },
  removeItem: (key: string): void => {
    delete localStorageMock.store[key];
  },
  clear: (): void => {
    localStorageMock.store = {};
  },
  key: (index: number): string | null => {
    const keys = Object.keys(localStorageMock.store);
    return keys[index] || null;
  },
  get length(): number {
    return Object.keys(localStorageMock.store).length;
  },
  store: {} as Record<string, string>,
};

(globalThis as any).localStorage = localStorageMock;

// Mock fetch for deterministic tests
(globalThis as any).fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  console.warn("Unmocked fetch call:", input, init);
  return new Response(JSON.stringify({ error: "Unmocked fetch call" }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
};
