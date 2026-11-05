import type { AuthSession } from "@social-resizer/contracts";
import { ApiError, api, getToken, setToken } from "./api-client";

/**
 * Session helpers.
 *
 * The token is the credential: it is stored client-side and sent as
 * `Authorization: Bearer` on every request. The server is the authority on
 * whether it is still valid, so a reload asks the API rather than trusting
 * local state.
 */
export async function loadSession(signal?: AbortSignal): Promise<AuthSession | null> {
  // No token means a guaranteed 401; skip the round trip.
  if (!getToken()) return null;

  try {
    return await api.getSession(signal);
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthenticated) {
      // Expired or revoked: drop it so the UI shows the login screen.
      setToken(null);
      return null;
    }
    if ((error as Error).name === "AbortError") throw error;
    throw error;
  }
}

/** Exchange an access code for a token. */
export async function login(code: string): Promise<AuthSession> {
  return api.login(code);
}

export async function endSession(): Promise<void> {
  try {
    await api.logout();
  } catch (error) {
    // A failed logout must not trap the user; the token is cleared regardless.
    if (!(error instanceof ApiError)) throw error;
  }
}
