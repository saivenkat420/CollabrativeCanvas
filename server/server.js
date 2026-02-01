import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { RoomManager } from "./rooms.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({
  origin: CLIENT_URL,
  methods: ["GET", "POST"]
}));

app.use(express.json());

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"]
  }
});

const roomManager = new RoomManager();

app.get("/", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Collaborative Canvas Server is running",
    timestamp: new Date().toISOString()
  });
});

app.get("/rooms/:roomId", (req, res) => {
  const { roomId } = req.params;
  const room = roomManager.getRoom(roomId);
  if (room) {
    res.json({
      roomId,
      userCount: room.users.size,
      strokeCount: room.stateManager.getHistory().length
    });
  } else {
    res.status(404).json({ error: "Room not found" });
  }
});

io.on("connection", (socket) => {
  let currentRoomId = null;
  let currentUserId = null;

  socket.on("join_room", ({ roomId, userId, userName, userColor }) => {
    currentRoomId = roomId;
    currentUserId = userId;
    
    socket.join(roomId);
    
    const user = {
      id: userId,
      name: userName || `User-${userId.slice(0, 4)}`,
      color: userColor || getRandomColor(),
      cursor: { x: 0, y: 0 }
    };
    
    roomManager.joinRoom(roomId, user);
    
    const room = roomManager.getRoom(roomId);
    const history = room.stateManager.getHistory();
    const users = Array.from(room.users.values());
    
    socket.emit("room_state", { history, users });
    socket.to(roomId).emit("user_joined", { user });
  });

  socket.on("drawing_step", (data) => {
    if (!currentRoomId) return;
    
    socket.to(currentRoomId).emit("remote_draw", {
      ...data,
      userId: currentUserId
    });
  });

  socket.on("stroke_complete", ({ stroke }) => {
    if (!currentRoomId) return;
    
    const room = roomManager.getRoom(currentRoomId);
    if (room) {
      room.stateManager.addStroke({
        ...stroke,
        odId: currentUserId
      });
      
      socket.to(currentRoomId).emit("stroke_added", { stroke });
    }
  });

  socket.on("cursor_move", ({ x, y }) => {
    if (!currentRoomId || !currentUserId) return;
    
    const room = roomManager.getRoom(currentRoomId);
    if (room && room.users.has(currentUserId)) {
      const user = room.users.get(currentUserId);
      user.cursor = { x, y };
      
      socket.to(currentRoomId).emit("cursor_update", {
        odId: currentUserId,
        x,
        y,
        name: user.name,
        color: user.color
      });
    }
  });

  socket.on("undo_request", () => {
    if (!currentRoomId || !currentUserId) return;
    
    const room = roomManager.getRoom(currentRoomId);
    if (room) {
      const newHistory = room.stateManager.undoByUser(currentUserId);
      io.to(currentRoomId).emit("history_update", { history: newHistory });
    }
  });

  socket.on("clear_request", () => {
    if (!currentRoomId) return;
    
    const room = roomManager.getRoom(currentRoomId);
    if (room) {
      room.stateManager.clearHistory();
      io.to(currentRoomId).emit("history_update", { history: [] });
    }
  });

  socket.on("disconnect", () => {
    if (currentRoomId && currentUserId) {
      roomManager.leaveRoom(currentRoomId, currentUserId);
      socket.to(currentRoomId).emit("user_left", { odId: currentUserId });
    }
  });
});

function getRandomColor() {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", 
    "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
    "#BB8FCE", "#85C1E9", "#F8B500", "#00CED1"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

httpServer.listen(PORT, () => {
  console.log(`[Server] Collaborative Canvas Server running on port ${PORT}`);
  console.log(`[Server] Accepting connections from: ${CLIENT_URL}`);
  
  // Keep-alive ping to prevent Render free tier spin-down
  // Render automatically sets RENDER_EXTERNAL_URL environment variable
  const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
  if (RENDER_EXTERNAL_URL) {
    const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes
    
    setInterval(() => {
      fetch(RENDER_EXTERNAL_URL)
        .then((res) => {
          console.log(`[Server] Keep-alive ping successful - Status: ${res.status}`);
        })
        .catch((err) => {
          console.log(`[Server] Keep-alive ping failed: ${err.message}`);
        });
    }, PING_INTERVAL);
    
    console.log(`[Server] Keep-alive ping enabled (every 14 minutes)`);
  }
});
