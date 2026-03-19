// Vitest 4.x: Do NOT import from "vitest" in setupFiles!
// Vitest injects globals (afterEach, expect, etc.) when globals: true.
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

// Extend vitest's expect with jest-dom matchers (expect is available globally)
// @ts-expect-error - expect is injected by vitest globals
expect.extend(matchers);

// Cleanup after each test (afterEach is available globally via vitest)
// @ts-expect-error - afterEach is injected by vitest globals
afterEach(() => {
  cleanup();
});
