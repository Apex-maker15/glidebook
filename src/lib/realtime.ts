/**
 * Real-time fan-out for booking events.
 *
 * Subscribers (the SSE route) listen on a single in-process `out` emitter.
 * What feeds `out` depends on the transport:
 *
 *   - Postgres LISTEN/NOTIFY when the database provably delivers notifications
 *     (after LISTEN we send ourselves a probe and wait for it). Events published
 *     by ANY server instance then reach every instance's subscribers.
 *   - Otherwise (PGlite, PgBouncer transaction mode, Neon, ...) `publish` emits
 *     straight to `out`, which is exactly right for a single process.
 *
 * The transport can flip at runtime (connection lost, later restored) without
 * subscribers noticing. REALTIME_TRANSPORT=local|pg|auto (default auto).
 */
import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { prisma } from "@/lib/prisma";
import type { RealtimeEvent } from "@/types";

const CHANNEL = "booking_events";
const PROBE_PREFIX = "probe:";
const PROBE_TIMEOUT_MS = 2000;
const RETRY_MS = 5 * 60_000;

type PgState = "idle" | "connecting" | "ready" | "unavailable";

interface Bus {
  out: EventEmitter;
  probes: EventEmitter;
  pgClient: Client | null;
  pgState: PgState;
  pgAttemptedAt: number;
  connecting: Promise<boolean> | null;
}

const g = globalThis as unknown as { __glidebookBus?: Bus };

const bus: Bus =
  g.__glidebookBus ??
  (g.__glidebookBus = {
    out: new EventEmitter().setMaxListeners(0),
    probes: new EventEmitter().setMaxListeners(0),
    pgClient: null,
    pgState: "idle",
    pgAttemptedAt: 0,
    connecting: null,
  });

function transportPreference(): "local" | "pg" | "auto" {
  const v = process.env.REALTIME_TRANSPORT;
  return v === "local" || v === "pg" ? v : "auto";
}

function markUnavailable(reason: string) {
  if (bus.pgState !== "unavailable") {
    console.warn(`[realtime] Postgres LISTEN/NOTIFY unavailable (${reason}); using in-process delivery.`);
  }
  bus.pgState = "unavailable";
  bus.pgAttemptedAt = Date.now();
  const client = bus.pgClient;
  bus.pgClient = null;
  if (client) client.end().catch(() => undefined);
}

/** Send ourselves a notification through a *different* connection and wait for it. */
async function probeDelivery(): Promise<boolean> {
  const token = `${PROBE_PREFIX}${randomUUID()}`;
  const arrived = new Promise<boolean>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      resolve(true);
    };
    const timer = setTimeout(() => {
      bus.probes.off(token, done);
      resolve(false);
    }, PROBE_TIMEOUT_MS);
    bus.probes.once(token, done);
  });
  try {
    await prisma.$executeRaw`SELECT pg_notify(${CHANNEL}, ${token})`;
  } catch {
    return false;
  }
  return arrived;
}

async function connectPgListener(): Promise<boolean> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    markUnavailable("no DATABASE_URL");
    return false;
  }

  bus.pgState = "connecting";
  bus.pgAttemptedAt = Date.now();
  const client = new Client({ connectionString: url, keepAlive: true });
  bus.pgClient = client;

  try {
    await client.connect();
    client.on("notification", (msg) => {
      if (msg.channel !== CHANNEL || !msg.payload) return;
      if (msg.payload.startsWith(PROBE_PREFIX)) {
        bus.probes.emit(msg.payload);
        return;
      }
      try {
        bus.out.emit("event", JSON.parse(msg.payload) as RealtimeEvent);
      } catch (err) {
        console.error("[realtime] bad NOTIFY payload", err);
      }
    });
    client.on("error", (err) => markUnavailable(`connection error: ${err.message}`));
    client.on("end", () => {
      if (bus.pgClient === client) markUnavailable("connection closed");
    });
    await client.query(`LISTEN ${CHANNEL}`);

    if (transportPreference() !== "pg" && !(await probeDelivery())) {
      markUnavailable("probe notification never arrived");
      return false;
    }

    bus.pgState = "ready";
    console.info("[realtime] Postgres LISTEN/NOTIFY transport active");
    return true;
  } catch (err) {
    markUnavailable((err as Error).message);
    return false;
  }
}

function ensurePgListener(): Promise<boolean> {
  if (transportPreference() === "local") return Promise.resolve(false);
  if (bus.pgState === "ready") return Promise.resolve(true);
  if (bus.connecting) return bus.connecting;
  if (bus.pgState === "unavailable" && Date.now() - bus.pgAttemptedAt < RETRY_MS) return Promise.resolve(false);

  bus.connecting = connectPgListener().finally(() => {
    bus.connecting = null;
  });
  return bus.connecting;
}

export async function publish(event: RealtimeEvent): Promise<void> {
  if (bus.pgState === "ready") {
    // Delivered back to us (and every other instance) through the LISTEN connection.
    try {
      await prisma.$executeRaw`SELECT pg_notify(${CHANNEL}, ${JSON.stringify(event)})`;
      return;
    } catch (err) {
      console.warn("[realtime] pg_notify failed, delivering locally:", (err as Error).message);
    }
  }
  bus.out.emit("event", event);
}

/**
 * Subscribe to events for a single provider. Resolves to an unsubscribe fn.
 */
export async function subscribe(
  providerId: string,
  listener: (event: RealtimeEvent) => void,
): Promise<() => void> {
  const handler = (event: RealtimeEvent) => {
    if (event.providerId === providerId) listener(event);
  };
  bus.out.on("event", handler);
  // Bring the cross-instance transport up (or verify it) in the background.
  void ensurePgListener();
  return () => bus.out.off("event", handler);
}
