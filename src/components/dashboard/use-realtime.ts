"use client";

import { useEffect } from "react";
import { useDashboardStore } from "@/store/dashboard-store";
import type { RealtimeEvent } from "@/types";

const POLL_MS = 15_000;
const RECONCILE_MS = 60_000;
const FAILURES_BEFORE_POLLING = 3;

/**
 * Keeps the dashboard store in sync:
 *  - initial load over REST,
 *  - live updates over SSE (EventSource reconnects on its own),
 *  - polling fallback when the stream cannot be established (e.g. hosts that
 *    cap streaming responses), plus a slow reconcile loop and a refresh when
 *    the tab becomes visible again.
 */
export function useRealtimeBookings() {
  const load = useDashboardStore((s) => s.load);
  const applyEvent = useDashboardStore((s) => s.applyEvent);
  const setConnection = useDashboardStore((s) => s.setConnection);

  useEffect(() => {
    void load();

    let source: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let failures = 0;
    let disposed = false;

    const startPolling = () => {
      if (pollTimer) return;
      setConnection("polling");
      pollTimer = setInterval(() => void load(), POLL_MS);
    };
    const stopPolling = () => {
      if (!pollTimer) return;
      clearInterval(pollTimer);
      pollTimer = null;
    };

    const onEvent = (e: MessageEvent<string>) => {
      try {
        applyEvent(JSON.parse(e.data) as RealtimeEvent);
      } catch (err) {
        console.error("[realtime] bad event payload", err);
      }
    };

    const connect = () => {
      if (disposed) return;
      source = new EventSource("/api/events");
      source.addEventListener("ready", () => {
        failures = 0;
        stopPolling();
        setConnection("live");
        // Catch up on anything that happened while we were disconnected.
        void load();
      });
      source.addEventListener("booking.created", onEvent as EventListener);
      source.addEventListener("booking.updated", onEvent as EventListener);
      source.onerror = () => {
        failures += 1;
        if (failures >= FAILURES_BEFORE_POLLING) {
          startPolling();
        } else {
          setConnection(navigator.onLine ? "connecting" : "offline");
        }
        // readyState CLOSED means the browser gave up; re-create the stream ourselves.
        if (source?.readyState === EventSource.CLOSED) {
          source.close();
          setTimeout(connect, 4000);
        }
      };
    };

    connect();

    const reconcile = setInterval(() => void load(), RECONCILE_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    const onOnline = () => {
      setConnection("connecting");
      void load();
    };
    const onOffline = () => setConnection("offline");
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      disposed = true;
      source?.close();
      stopPolling();
      clearInterval(reconcile);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [load, applyEvent, setConnection]);
}
