import {
  type ApiErrorBody,
  type AssetMetadata,
  type CompleteUploadResponse,
  type CreateGenerationRequest,
  type CreateGenerationResponse,
  type CreateUploadRequest,
  type CreateUploadResponse,
  type DemoSession,
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

/** CSRF cookie name, used only when the API shares this origin. */
const CSRF_COOKIE = "bl_csrf";

/**
 * In-memory CSRF token.
 *
 * The API sets `bl_csrf` on its own origin. When the frontend and API are on
 * different registrable domains (Vercel calling Railway), that cookie belongs
 * to the API's origin and `document.cookie` here can never see it. The token is
 * therefore taken from the API response body and kept in memory, which also
 * avoids persisting it to storage.
 */
let csrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
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
 * Resolve the CSRF token.
 *
 * Prefers the in-memory value captured from the API response. Falls back to the
 * cookie, which is what works when the API is same-origin (local development
 * through a proxy, or a shared custom domain).
 */
export function readCsrfToken(): string | null {
  if (csrfToken) return csrfToken;
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CSRF_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(CSRF_COOKIE.length + 1)) : null;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** Extra headers, e.g. Idempotency-Key. */
  headers?: Record<string, string>;
  /** Attach the CSRF header (required for unsafe methods). */
  csrf?: boolean;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, csrf = method !== "GET", signal } = options;

  const requestHeaders: Record<string, string> = { Accept: "application/json", ...headers };
  if (body !== undefined) requestHeaders["Content-Type"] = "application/json";
  if (csrf) {
    const token = readCsrfToken();
    if (token) requestHeaders["X-CSRF-Token"] = token;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: "include",
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
  async createDemoSession(signal?: AbortSignal): Promise<DemoSession> {
    const session = await request<DemoSession>("/api/v1/auth/demo", {
      method: "POST",
      csrf: false,
      signal,
    });
    setCsrfToken(session.csrfToken);
    return session;
  },

  async getSession(signal?: AbortSignal): Promise<DemoSession> {
    const session = await request<DemoSession>("/api/v1/auth/session", { signal });
    setCsrfToken(session.csrfToken);
    return session;
  },

  async logout(): Promise<void> {
    try {
      await request<void>("/api/v1/auth/logout", { method: "POST" });
    } finally {
      setCsrfToken(null);
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
