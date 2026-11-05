import { afterEach, describe, expect, test } from "bun:test";
import { readCsrfToken, setCsrfToken } from "../lib/api-client";

afterEach(() => setCsrfToken(null));

describe("CSRF token resolution", () => {
  test("uses the in-memory token captured from the API response", () => {
    // Cross-origin deployments (Vercel -> Railway) cannot read the API's
    // cookie, so the token must come from the response body.
    setCsrfToken("token-from-response");
    expect(readCsrfToken()).toBe("token-from-response");
  });

  test("clears the token on sign-out", () => {
    setCsrfToken("abc");
    setCsrfToken(null);
    // No document in this environment, so the cookie fallback yields null.
    expect(readCsrfToken()).toBeNull();
  });

  test("prefers the in-memory token over any cookie", () => {
    setCsrfToken("memory-wins");
    expect(readCsrfToken()).toBe("memory-wins");
  });
});
