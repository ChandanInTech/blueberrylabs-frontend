"use client";

import { type GenerationStatusResponse, isTerminalGenerationStatus } from "@social-resizer/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api } from "@/lib/api-client";

const ACTIVE_INTERVAL_MS = 2000;
const LONG_WAIT_INTERVAL_MS = 5000;
const HIDDEN_INTERVAL_MS = 10_000;
const MAX_BACKOFF_MS = 30_000;
const LONG_WAIT_AFTER_MS = 30_000;

export interface PollingState {
  generation: GenerationStatusResponse | null;
  error: string | null;
  /** True while a request is in flight. */
  isLoading: boolean;
  /** True while the poller is scheduled (non-terminal status). */
  isPolling: boolean;
  /** The status could not be read at all (e.g. deleted or not owned). */
  fatal: boolean;
}

/**
 * Poll generation status (architecture section 11).
 *
 * Requirements honoured here:
 * - poll only while the status is non-terminal;
 * - stop on unmount via a single `AbortController`;
 * - no overlapping requests (one timer, one in-flight request);
 * - slow down after a long wait and when the tab is hidden;
 * - bounded exponential backoff on transient errors, honouring `Retry-After`.
 */
export function useGenerationPolling(generationId: string | null) {
  const [state, setState] = useState<PollingState>({
    generation: null,
    error: null,
    isLoading: false,
    isPolling: false,
    fatal: false,
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const attemptsRef = useRef(0);
  const startedAtRef = useRef<number>(0);
  const mountedRef = useRef(true);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const poll = useCallback(
    async (id: string) => {
      if (inFlightRef.current || !mountedRef.current) return;

      inFlightRef.current = true;
      const controller = new AbortController();
      abortRef.current = controller;
      setState((previous) => ({ ...previous, isLoading: true }));

      try {
        const generation = await api.getGeneration(id, controller.signal);
        if (!mountedRef.current) return;

        attemptsRef.current = 0;
        const terminal = isTerminalGenerationStatus(generation.status);

        setState({
          generation,
          error: null,
          isLoading: false,
          isPolling: !terminal,
          fatal: false,
        });

        if (terminal) {
          clearTimer();
          return;
        }

        const elapsed = Date.now() - startedAtRef.current;
        const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
        const delay = hidden
          ? HIDDEN_INTERVAL_MS
          : elapsed > LONG_WAIT_AFTER_MS
            ? LONG_WAIT_INTERVAL_MS
            : ACTIVE_INTERVAL_MS;

        clearTimer();
        timerRef.current = setTimeout(() => void poll(id), delay);
      } catch (error) {
        if ((error as Error).name === "AbortError" || !mountedRef.current) return;

        // 401/403/404 are not transient: stop polling and let the UI react.
        if (error instanceof ApiError && (error.isUnauthenticated || error.isNotFound)) {
          setState({
            generation: null,
            error: error.message,
            isLoading: false,
            isPolling: false,
            fatal: true,
          });
          clearTimer();
          return;
        }

        attemptsRef.current += 1;
        const retryAfter = error instanceof ApiError ? error.retryAfterSeconds : null;
        const backoff = Math.min(MAX_BACKOFF_MS, 2 ** attemptsRef.current * 1000);
        const delay = retryAfter ? retryAfter * 1000 : backoff;

        setState((previous) => ({
          ...previous,
          error: "Reconnecting… we could not refresh the status.",
          isLoading: false,
          isPolling: true,
        }));

        clearTimer();
        timerRef.current = setTimeout(() => void poll(id), delay);
      } finally {
        inFlightRef.current = false;
      }
    },
    [clearTimer],
  );

  useEffect(() => {
    mountedRef.current = true;

    if (!generationId) {
      setState({ generation: null, error: null, isLoading: false, isPolling: false, fatal: false });
      return () => {};
    }

    startedAtRef.current = Date.now();
    attemptsRef.current = 0;
    void poll(generationId);

    return () => {
      mountedRef.current = false;
      clearTimer();
      abortRef.current?.abort();
      abortRef.current = null;
      inFlightRef.current = false;
    };
  }, [generationId, poll, clearTimer]);

  // Re-poll immediately when the tab becomes visible again so a backgrounded
  // page does not keep showing a stale status.
  useEffect(() => {
    if (!generationId) return;

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && state.isPolling) {
        clearTimer();
        void poll(generationId);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [generationId, poll, clearTimer, state.isPolling]);

  const refresh = useCallback(() => {
    if (generationId) void poll(generationId);
  }, [generationId, poll]);

  return { ...state, refresh };
}
