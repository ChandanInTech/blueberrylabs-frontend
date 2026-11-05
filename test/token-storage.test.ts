import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { getToken, readAuthToken, setToken } from "../lib/api-client";

/**
 * Token storage.
 *
 * The JWT is the credential and lives in `localStorage`, so these tests pin the
 * read/write/clear contract the request layer depends on.
 *
 * `getToken` deliberately returns `null` when there is no `window` (server-side
 * rendering must never read a token), so the suite installs a minimal browser
 * shim rather than relaxing that guard.
 */
function installWindow(localStorage: Storage | null): void {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: localStorage === null ? {} : { localStorage },
  });
}

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, value),
  };
}

beforeEach(() => installWindow(memoryStorage()));

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
});

describe("token storage", () => {
  test("returns null when nothing is stored", () => {
    expect(getToken()).toBeNull();
  });

  test("round-trips a token", () => {
    setToken("header.payload.signature");
    expect(getToken()).toBe("header.payload.signature");
  });

  test("clears the token on sign-out", () => {
    setToken("abc");
    setToken(null);
    expect(getToken()).toBeNull();
  });

  test("overwrites a previous token", () => {
    setToken("first");
    setToken("second");
    expect(getToken()).toBe("second");
  });

  test("readAuthToken mirrors the stored token", () => {
    setToken("mirrored");
    expect(readAuthToken()).toBe("mirrored");
  });

  test("returns null during server-side rendering", () => {
    Reflect.deleteProperty(globalThis, "window");
    expect(getToken()).toBeNull();
    // Writing must be a no-op rather than a crash.
    expect(() => setToken("x")).not.toThrow();
  });

  test("survives a storage that throws", () => {
    // Private-mode browsers can throw on access; the app must not crash.
    installWindow({
      get length(): number {
        throw new Error("denied");
      },
      clear() {
        throw new Error("denied");
      },
      getItem() {
        throw new Error("denied");
      },
      key() {
        throw new Error("denied");
      },
      removeItem() {
        throw new Error("denied");
      },
      setItem() {
        throw new Error("denied");
      },
    });

    expect(() => setToken("x")).not.toThrow();
    expect(getToken()).toBeNull();
  });
});
