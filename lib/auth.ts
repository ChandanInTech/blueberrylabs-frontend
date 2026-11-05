import type { DemoSession } from "@social-resizer/contracts";
import { ApiError, api } from "./api-client";

/**
 * Session helpers.
 *
 * The session itself is an HttpOnly cookie the frontend can neither read nor
 * forge; this module only asks the API who the cookie belongs to.
 */
export async function loadSession(signal?: AbortSignal): Promise<DemoSession | null> {
  try {
    return await api.getSession(signal);
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthenticated) return null;
    if ((error as Error).name === "AbortError") throw error;
    throw error;
  }
}

export async function startDemoSession(): Promise<DemoSession> {
  return api.createDemoSession();
}

export async function endSession(): Promise<void> {
  try {
    await api.logout();
  } catch (error) {
    // A failed logout must not trap the user; the cookie may already be gone.
    if (!(error instanceof ApiError)) throw error;
  }
}
