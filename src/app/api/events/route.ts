import { requireProvider } from "@/auth";
import { ensureTransport, needsPolling, subscribe } from "@/lib/realtime";
import type { RealtimeEvent } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel Hobby allows up to 300s per invocation; EventSource reconnects transparently afterwards.
export const maxDuration = 300;

const HEARTBEAT_MS = 25_000;

/**
 * GET /api/events — Server-Sent Events stream of the signed-in provider's
 * booking changes. The dashboard reconnects automatically via EventSource.
 */
export async function GET(req: Request) {
  const user = await requireProvider();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      const send = (event: string, data: unknown) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        unsubscribe?.();
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      write(`retry: 3000\n`);
      unsubscribe = await subscribe(user.id, (event: RealtimeEvent) => send(event.type, event));

      // Tell the client whether it must also poll (multi-instance host without cross-instance delivery).
      const transport = await ensureTransport();
      send("ready", { providerId: user.id, at: new Date().toISOString(), transport, poll: needsPolling(transport) });
      heartbeat = setInterval(() => write(`: ping ${Date.now()}\n\n`), HEARTBEAT_MS);
      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      closed = true;
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
