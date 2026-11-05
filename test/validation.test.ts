import { describe, expect, test } from "bun:test";
import { findPreset, formatBytes, formatsForPlatform, MAX_BYTES, validateFile } from "../lib/validation";

function makeFile(name: string, type: string, size: number): File {
  // A File of an exact size without allocating the bytes up front.
  return new File([new Uint8Array(size)], name, { type });
}

describe("client-side file validation", () => {
  test("accepts a jpeg under the limit", () => {
    expect(validateFile(makeFile("photo.jpg", "image/jpeg", 1024)).ok).toBe(true);
  });

  test("accepts png and webp", () => {
    expect(validateFile(makeFile("a.png", "image/png", 10)).ok).toBe(true);
    expect(validateFile(makeFile("a.webp", "image/webp", 10)).ok).toBe(true);
  });

  test("rejects unsupported extensions", () => {
    const result = validateFile(makeFile("clip.mp4", "video/mp4", 10));
    expect(result.ok).toBe(false);
  });

  test("rejects a mismatched extension", () => {
    const result = validateFile(makeFile("photo.exe", "image/png", 10));
    expect(result.ok).toBe(false);
  });

  test("rejects oversized files", () => {
    const result = validateFile(makeFile("big.png", "image/png", MAX_BYTES + 1));
    expect(result.ok).toBe(false);
    expect(result.message).toContain("limit");
  });

  test("rejects empty files", () => {
    expect(validateFile(makeFile("empty.png", "image/png", 0)).ok).toBe(false);
  });

  test("warns about transparency", () => {
    expect(validateFile(makeFile("t.png", "image/png", 10)).warning).toBeString();
  });

  test("formats byte sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});

describe("preset helpers", () => {
  test("resolves the same presets as the backend", () => {
    expect(findPreset("INSTAGRAM", "PORTRAIT")).toMatchObject({ width: 1080, height: 1350 });
    expect(findPreset("YOUTUBE", "THUMBNAIL")).toMatchObject({ width: 1280, height: 720 });
    expect(findPreset("TIKTOK", "SQUARE")).toBeUndefined();
  });

  test("lists formats per platform", () => {
    expect(formatsForPlatform("INSTAGRAM")).toHaveLength(3);
    expect(formatsForPlatform("TIKTOK")).toHaveLength(1);
  });
});
