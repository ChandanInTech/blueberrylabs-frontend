import {
  type ApiErrorBody,
  type AssetMetadata,
  type AuthSession,
  type CompleteUploadResponse,
  type CreateGenerationRequest,
  type CreateGenerationResponse,
  type CreateUploadRequest,
  type CreateUploadResponse,
  type ErrorCode,
  type GenerationListResponse,
  type GenerationStatusResponse,
  isApiErrorBody,
  type SignedUrlResponse,
} from "@social-resizer/contracts";

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001").replace(
  /\/$/,
  "",
);

/** Where the JWT is kept between page loads. */
const TOKEN_STORAGE_KEY = "bl_token";

/**
 * Read the stored token.
 *
 * `localStorage` (not a cookie) because the token is sent as an
 * `Authorization` header, never automatically by the browser. That is what
 * makes CSRF a non-issue: a cross-site request cannot attach this header.
 *
 * Tradeoff: `localStorage` is readable by any script on this origin, so an XSS
 * bug could exfiltrate the token. The mitigations are a short 24h expiry,
 * server-side revocation on logout, and no third-party scripts.
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    // Storage can throw in private mode or when disabled by policy.
    return null;
  }
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore: the in-memory session still works for this page load.
  }
}

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly requestId: string | null;
  readonly retryAfterSeconds: number | null;

  constructor(
    message: string,
    options: {
      code: ErrorCode;
      status: number;
      requestId?: string | null;
      retryAfterSeconds?: number | null;
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId ?? null;
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

/**
 * Resolve the bearer token for a request.
 *
 * Kept as a named export so tests can assert the header wiring without a
 * browser.
 */
export function readAuthToken(): string | null {
  return getToken();
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** Extra headers, e.g. Idempotency-Key. */
  headers?: Record<string, string>;
  /** Send the stored token. Defaults to on; only `/auth/login` opts out. */
  auth?: boolean;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, auth = true, signal } = options;

  const requestHeaders: Record<string, string> = { Accept: "application/json", ...headers };
  if (body !== undefined) requestHeaders["Content-Type"] = "application/json";

  if (auth) {
    const token = readAuthToken();
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    if ((cause as Error).name === "AbortError") throw cause;
    throw new ApiError("We could not reach the server. Check your connection and try again.", {
      code: "INTERNAL_ERROR",
      status: 0,
    });
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const payload: unknown = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    throw toApiError(response, payload);
  }

  return payload as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Treat every response as runtime-untrusted, even when typed by the contracts package. */
function toApiError(response: Response, payload: unknown): ApiError {
  if (isApiErrorBody(payload)) {
    const body: ApiErrorBody = payload;
    return new ApiError(body.error.message, {
      code: body.error.code,
      status: response.status,
      requestId: body.error.requestId ?? null,
      retryAfterSeconds: body.error.retryAfterSeconds ?? null,
    });
  }

  return new ApiError(
    response.status >= 500
      ? "The server had a problem. Please try again."
      : "That request could not be completed.",
    { code: "INTERNAL_ERROR", status: response.status },
  );
}

export const api = {
  // ---- auth ---------------------------------------------------------------
  /** Exchange an access code for a JWT and persist it. */
  async login(code: string, signal?: AbortSignal): Promise<AuthSession> {
    const session = await request<AuthSession>("/api/v1/auth/login", {
      method: "POST",
      body: { code },
      auth: false,
      signal,
    });
    setToken(session.token);
    return session;
  },

  async getSession(signal?: AbortSignal): Promise<AuthSession> {
    const session = await request<AuthSession>("/api/v1/auth/session", { signal });
    // The server echoes the caller's own token; keep storage in sync in case it
    // was cleared while the request was in flight.
    if (session.token) setToken(session.token);
    return session;
  },

  async logout(): Promise<void> {
    try {
      await request<void>("/api/v1/auth/logout", { method: "POST" });
    } finally {
      // Clear locally even if the server call failed: the user asked to leave.
      setToken(null);
    }
  },

  // ---- uploads ------------------------------------------------------------
  async createUpload(input: CreateUploadRequest, signal?: AbortSignal): Promise<CreateUploadResponse> {
    return request<CreateUploadResponse>("/api/v1/uploads", { method: "POST", body: input, signal });
  },

  async completeUpload(assetId: string, signal?: AbortSignal): Promise<CompleteUploadResponse> {
    return request<CompleteUploadResponse>(`/api/v1/uploads/${assetId}/complete`, {
      method: "POST",
      signal,
    });
  },

  async getAsset(assetId: string, signal?: AbortSignal): Promise<AssetMetadata> {
    return request<AssetMetadata>(`/api/v1/assets/${assetId}`, { signal });
  },

  async getAssetDownloadUrl(assetId: string, signal?: AbortSignal): Promise<SignedUrlResponse> {
    return request<SignedUrlResponse>(`/api/v1/assets/${assetId}/download-url`, { signal });
  },

  // ---- generations --------------------------------------------------------
  async createGeneration(
    input: CreateGenerationRequest,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<CreateGenerationResponse> {
    return request<CreateGenerationResponse>("/api/v1/generations", {
      method: "POST",
      body: input,
      headers: { "Idempotency-Key": idempotencyKey },
      signal,
    });
  },

  async getGeneration(generationId: string, signal?: AbortSignal): Promise<GenerationStatusResponse> {
    return request<GenerationStatusResponse>(`/api/v1/generations/${generationId}`, { signal });
  },

  async listGenerations(
    options: { limit?: number; cursor?: string | null } = {},
    signal?: AbortSignal,
  ): Promise<GenerationListResponse> {
    const params: string[] = [];
    if (options.limit) params.push(`limit=${options.limit}`);
    if (options.cursor) params.push(`cursor=${encodeURIComponent(options.cursor)}`);
    const query = params.length > 0 ? `?${params.join("&")}` : "";
    return request<GenerationListResponse>(`/api/v1/generations${query}`, { signal });
  },

  async getGenerationDownloadUrl(generationId: string, signal?: AbortSignal): Promise<SignedUrlResponse> {
    return request<SignedUrlResponse>(`/api/v1/generations/${generationId}/download-url`, {
      method: "POST",
      signal,
    });
  },
};
