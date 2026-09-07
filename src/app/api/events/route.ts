import { getSession } from "@/lib/auth/session";
import { subscribe } from "@/lib/sync/events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const encoder = new TextEncoder();
  let cleanup: () => void = () => undefined;
  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: object) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      send({ type: "connected" });
      cleanup = subscribe((event) => send(event));
      const heartbeat = setInterval(() => send({ type: "heartbeat" }), 25000);
      request.signal.addEventListener("abort", () => { clearInterval(heartbeat); cleanup(); controller.close(); });
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
