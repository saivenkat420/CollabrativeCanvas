import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

const socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

let isConnected = false;

socket.on("connect", () => {
  isConnected = true;
});

socket.on("disconnect", () => {
  isConnected = false;
});

socket.on("connect_error", () => {});

export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export const isSocketConnected = () => isConnected;

export const joinRoom = (roomId, odId, userName, userColor) => {
  socket.emit("join_room", {
    roomId,
    userId: odId,
    userName,
    userColor
  });
};

export const emitDrawingStep = (data) => {
  socket.emit("drawing_step", data);
};

export const emitStrokeComplete = (stroke) => {
  socket.emit("stroke_complete", { stroke });
};

export const emitCursorMove = (x, y) => {
  socket.emit("cursor_move", { x, y });
};

export const emitUndo = () => {
  socket.emit("undo_request");
};

export const emitClear = () => {
  socket.emit("clear_request");
};

export const onRoomState = (callback) => {
  socket.on("room_state", callback);
};

export const onUserJoined = (callback) => {
  socket.on("user_joined", callback);
};

export const onUserLeft = (callback) => {
  socket.on("user_left", callback);
};

export const onRemoteDraw = (callback) => {
  socket.on("remote_draw", callback);
};

export const onStrokeAdded = (callback) => {
  socket.on("stroke_added", callback);
};

export const onCursorUpdate = (callback) => {
  socket.on("cursor_update", callback);
};

export const onHistoryUpdate = (callback) => {
  socket.on("history_update", callback);
};

export const removeAllListeners = () => {
  socket.off("room_state");
  socket.off("user_joined");
  socket.off("user_left");
  socket.off("remote_draw");
  socket.off("stroke_added");
  socket.off("cursor_update");
  socket.off("history_update");
};

export default socket;
