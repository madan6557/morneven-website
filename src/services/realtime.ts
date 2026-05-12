import { getAccessToken, getApiBaseUrl } from "@/services/restClient";

export interface RealtimeEnvelope<T = unknown> {
  event: string;
  payload: T;
}

export type RealtimeStatus = "idle" | "connecting" | "open" | "closed";
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

function emitEvent<T>(event: string, payload: T) {
  const envelope: RealtimeEnvelope<T> = { event, payload };
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

  const delayMs = Math.min(30000, 1000 * 2 ** Math.min(reconnectAttempt, 5));
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

  setStatus("closed");
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
    setStatus("open");
    emitEvent("socket.ready", {});
  });

  nextSocket.addEventListener("message", (event) => {
    try {
      const envelope = JSON.parse(String(event.data)) as RealtimeEnvelope;
      if (!envelope || typeof envelope.event !== "string") return;
      emitEvent(envelope.event, envelope.payload);
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

export function sendRealtimeEvent(event: string, payload: Record<string, unknown>) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify({ event, payload }));
  return true;
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
