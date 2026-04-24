import { io, Socket } from "socket.io-client";

type WsAuth = {
  token: string;
};

type JoinCoinflipRoomPayload = {
  roomId: number;
  user: {
    id: number;
    name: string;
  };
};

type RefreshPayload = {
  token: string;
};

type LeaveCoinflipRoomPayload = {
  roomId: number;
  user: {
    id: number;
    name: string;
  };
};

let socket: Socket | null = null;
let socketTraceAttached = false;

function isWsDebugEnabled() {
  return process.env.NEXT_PUBLIC_WS_DEBUG === "1";
}

function attachSocketTrace(s: Socket) {
  if (!isWsDebugEnabled()) return;
  if (socketTraceAttached) return;

  socketTraceAttached = true;

  s.on("connect", () => {
    console.log("[ws] connect", { id: s.id, url: getWsUrl() });
  });

  s.on("disconnect", (reason) => {
    console.log("[ws] disconnect", { id: s.id, reason });
  });

  s.on("connect_error", (err) => {
    console.log("[ws] connect_error", { message: err?.message });
  });

  s.onAny((event, ...args) => {
    console.log("[ws] on", event, ...args);
  });
}

export function getWsUrl() {
  return process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";
}

export function getSocket() {
  return socket;
}

export function connectSocket(auth: WsAuth) {
  if (socket && socket.connected) return socket;

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socketTraceAttached = false;

  socket = io(getWsUrl(), {
    autoConnect: false,
    transports: ["websocket"],
    auth,
  });

  attachSocketTrace(socket);

  socket.connect();
  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
  socketTraceAttached = false;
}

export function updateSocketAuth(auth: WsAuth) {
  if (!socket) return;
  socket.auth = auth;
}

export function emitWsRefresh(payload: RefreshPayload) {
  if (!socket) return;
  if (isWsDebugEnabled()) {
    console.log("[ws] emit", "ws:refresh", payload);
  }
  socket.emit("ws:refresh", payload);
}

export function joinCoinflipGameRoom(payload: JoinCoinflipRoomPayload) {
  if (!socket) return;
  if (isWsDebugEnabled()) {
    console.log("[ws] emit", "join:coinflip-game-room", payload);
  }
  socket.emit("join:coinflip-game-room", payload);
}

export function leaveCoinflipGameRoom(payload: LeaveCoinflipRoomPayload) {
  if (!socket) return;
  if (isWsDebugEnabled()) {
    console.log("[ws] emit", "leave:coinflip-game-room", payload);
  }
  socket.emit("leave:coinflip-game-room", payload);
}
