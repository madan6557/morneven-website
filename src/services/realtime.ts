import { getAccessToken, getApiBaseUrl } from "@/services/restClient";

export interface RealtimeEventMeta {
  eventId?: string;
  sequence?: number;
  emittedAt?: string;
}

export interface RealtimeEnvelope<T = unknown> {
  event: string;
  payload: T;
  meta?: RealtimeEventMeta;
}

export type RealtimeStatus = "idle" | "connecting" | "resuming" | "open" | "reconnecting" | "offline" | "closed";
export type RealtimeEventHandler<T = unknown> = (
  payload: T,
  envelope: RealtimeEnvelope<T>,
) => void;
export type RealtimeStatusHandler = (status: RealtimeStatus) => void;

let socket: WebSocket | null = null;
let socketToken: string | null = null;
let status: RealtimeStatus = "idle";
let reconnectAttempt = 0;
let reconnectTimer: number | null = null;
let manualDisconnect = false;
let lastSequence = 0;
const seenEventIds = new Set<string>();
const MAX_SEEN_EVENTS = 512;

type RealtimeOutboxEntry = {
  clientEventId: string;
  event: string;
  payload: Record<string, unknown>;
  attempts: number;
};
const outbox: RealtimeOutboxEntry[] = [];

const listeners = new Map<string, Set<RealtimeEventHandler>>();
const statusListeners = new Set<RealtimeStatusHandler>();

function setStatus(next: RealtimeStatus) {
  if (status === next) return;
  status = next;
  statusListeners.forEach((listener) => listener(status));
}

function clearReconnectTimer() {
  if (reconnectTimer === null || typeof window === "undefined") return;
  window.clearTimeout(reconnectTimer);
  reconnectTimer = null;
}

function buildRealtimeUrl(token: string) {
  const apiUrl = new URL(getApiBaseUrl());
  const realtimeUrl = new URL("/ws/chat", apiUrl);
  realtimeUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  realtimeUrl.searchParams.set("token", token);
  return realtimeUrl.toString();
}

function emitEvent<T>(event: string, payload: T, meta?: RealtimeEventMeta) {
  const envelope: RealtimeEnvelope<T> = { event, payload, meta };
  listeners.get(event)?.forEach((listener) => {
    listener(payload, envelope);
  });
}

function scheduleReconnect() {
  if (typeof window === "undefined" || reconnectTimer !== null || manualDisconnect) return;

  const token = getAccessToken();
  if (!token) {
    setStatus("idle");
    return;
  }

  const delayMs = Math.min(30000, 1000 * 2 ** Math.min(reconnectAttempt, 5)) * (0.9 + Math.random() * 0.2);
  reconnectAttempt += 1;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connectRealtime();
  }, delayMs);
}

function handleSocketClosed(currentSocket: WebSocket) {
  if (socket !== currentSocket) {
    return;
  }

  socket = null;
  socketToken = null;

  if (manualDisconnect) {
    setStatus("idle");
    return;
  }

  setStatus(reconnectAttempt >= 5 ? "offline" : "reconnecting");
  scheduleReconnect();
}

export function getRealtimeStatus() {
  return status;
}

export function connectRealtime() {
  if (typeof window === "undefined" || typeof WebSocket === "undefined") return;

  const token = getAccessToken();
  if (!token) {
    disconnectRealtime();
    return;
  }

  manualDisconnect = false;
  clearReconnectTimer();

  if (socket) {
    const isOpen = socket.readyState === WebSocket.OPEN;
    const isConnecting = socket.readyState === WebSocket.CONNECTING;

    if ((isOpen || isConnecting) && socketToken === token) {
      return;
    }

    const previousSocket = socket;
    socket = null;
    socketToken = null;
    previousSocket.close();
  }

  const nextSocket = new WebSocket(buildRealtimeUrl(token));
  socket = nextSocket;
  socketToken = token;
  setStatus("connecting");

  nextSocket.addEventListener("open", () => {
    if (socket !== nextSocket) return;
    reconnectAttempt = 0;
    setStatus("resuming");
    emitEvent("socket.ready", { resumeSupported: true });
    nextSocket.send(JSON.stringify({ event: "chat.resume", payload: { afterSequence: lastSequence } }));
  });

  nextSocket.addEventListener("message", (event) => {
    try {
      const envelope = JSON.parse(String(event.data)) as RealtimeEnvelope;
      if (!envelope || typeof envelope.event !== "string") return;
      const eventId = envelope.meta?.eventId;
      if (eventId) {
        if (seenEventIds.has(eventId)) return;
        seenEventIds.add(eventId);
        if (seenEventIds.size > MAX_SEEN_EVENTS) {
          const first = seenEventIds.values().next().value;
          if (first) seenEventIds.delete(first);
        }
      }
      if (typeof envelope.meta?.sequence === "number") lastSequence = Math.max(lastSequence, envelope.meta.sequence);
      if (envelope.event === "socket.resume.completed") {
        setStatus("open");
        flushRealtimeOutbox();
      }
      emitEvent(envelope.event, envelope.payload, envelope.meta);
    } catch {
      // Ignore malformed frames and keep the socket alive.
    }
  });

  nextSocket.addEventListener("error", () => {
    if (nextSocket.readyState === WebSocket.OPEN || nextSocket.readyState === WebSocket.CONNECTING) {
      nextSocket.close();
    }
  });

  nextSocket.addEventListener("close", () => {
    handleSocketClosed(nextSocket);
  });
}

export function disconnectRealtime() {
  manualDisconnect = true;
  reconnectAttempt = 0;
  clearReconnectTimer();
  setStatus("idle");
  outbox.length = 0;
  emitEvent("socket.closed", {});

  const currentSocket = socket;
  socket = null;
  socketToken = null;

  if (
    currentSocket &&
    (currentSocket.readyState === WebSocket.OPEN || currentSocket.readyState === WebSocket.CONNECTING)
  ) {
    currentSocket.close();
  }
}

function sendOutboxEntry(entry: RealtimeOutboxEntry) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  entry.attempts += 1;
  socket.send(JSON.stringify({ event: entry.event, clientEventId: entry.clientEventId, payload: entry.payload }));
  return true;
}

function flushRealtimeOutbox() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  outbox.splice(0).forEach((entry) => { sendOutboxEntry(entry); });
}

export function sendRealtimeEvent(event: string, payload: Record<string, unknown>) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify({ event, payload }));
  return true;
}

export function queueRealtimeEvent(event: string, payload: Record<string, unknown>, clientEventId = crypto.randomUUID()) {
  const entry: RealtimeOutboxEntry = { clientEventId, event, payload, attempts: 0 };
  if (!sendOutboxEntry(entry)) outbox.push(entry);
  return clientEventId;
}

export function getRealtimeLastSequence() {
  return lastSequence;
}

export function subscribeRealtimeEvent<T = unknown>(
  event: string,
  handler: RealtimeEventHandler<T>,
) {
  const bucket = listeners.get(event) ?? new Set<RealtimeEventHandler>();
  bucket.add(handler as RealtimeEventHandler);
  listeners.set(event, bucket);

  return () => {
    const current = listeners.get(event);
    if (!current) return;
    current.delete(handler as RealtimeEventHandler);
    if (current.size === 0) {
      listeners.delete(event);
    }
  };
}

export function subscribeRealtimeEvents<T = unknown>(
  events: string[],
  handler: RealtimeEventHandler<T>,
) {
  const unsubscribers = events.map((event) =>
    subscribeRealtimeEvent(event, handler),
  );
  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

export function subscribeRealtimeStatus(handler: RealtimeStatusHandler) {
  statusListeners.add(handler);
  handler(status);
  return () => {
    statusListeners.delete(handler);
  };
}
