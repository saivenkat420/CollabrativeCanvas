import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import "./App.css";
import { Toolbar } from "./components/Toolbar/Toolbar";
import { Canvas } from "./components/Canvas/Canvas";
import { UserCursors } from "./components/UserCursors";
import { JoinModal } from "./components/JoinModal";
import {
  connectSocket,
  disconnectSocket,
  joinRoom,
  removeAllListeners,
} from "./utils/socket";
import socket from "./utils/socket";

const DEFAULT_ROOM = "default-room";

const getUserId = () => {
  let odId = localStorage.getItem("odId");
  if (!odId) {
    odId = uuidv4();
    localStorage.setItem("odId", odId);
  }
  return odId;
};

const getRandomColor = () => {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
    "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
    "#BB8FCE", "#85C1E9", "#F8B500", "#00CED1"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const getUserColor = () => {
  let color = localStorage.getItem("userColor");
  if (!color) {
    color = getRandomColor();
    localStorage.setItem("userColor", color);
  }
  return color;
};

function App() {
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState("pencil");
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  
  const [hasJoined, setHasJoined] = useState(() => {
    return !!localStorage.getItem("userName");
  });
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem("userName") || "";
  });
  
  const canvasRef = useRef(null);
  const canvasActions = useRef(null);
  
  const [userId] = useState(() => getUserId());
  const [userColor] = useState(() => getUserColor());

  const handleJoin = (name) => {
    localStorage.setItem("userName", name);
    setUserName(name);
    setHasJoined(true);
  };

  useEffect(() => {
    if (!hasJoined || !userName) return;
    
    connectSocket();
    
    socket.on("connect", () => {
      setIsConnected(true);
      setConnectionStatus("Connected");
      joinRoom(DEFAULT_ROOM, userId, userName, userColor);
    });
    
    socket.on("disconnect", () => {
      setIsConnected(false);
      setConnectionStatus("Disconnected");
    });
    
    socket.on("connect_error", () => {
      setIsConnected(false);
      setConnectionStatus("Connection failed");
    });
    
    return () => {
      removeAllListeners();
      disconnectSocket();
    };
  }, [hasJoined, userId, userName, userColor]);

  const handleUndo = () => {
    if (canvasActions.current) {
      canvasActions.current.undo();
    }
  };

  const handleClear = () => {
    if (canvasActions.current) {
      canvasActions.current.clear();
    }
  };

  const handleCanvasReady = (actions) => {
    canvasActions.current = actions;
  };

  if (!hasJoined) {
    return <JoinModal onJoin={handleJoin} />;
  }

  return (
    <div className="app">
      <div className={`connection-status ${isConnected ? "connected" : "disconnected"}`}>
        <span className="status-dot"></span>
        <span className="status-text">{connectionStatus}</span>
        {isConnected && <span className="user-name">({userName})</span>}
      </div>
      
      <Toolbar
        color={color}
        setColor={setColor}
        brushSize={brushSize}
        setBrushSize={setBrushSize}
        onClear={handleClear}
        onUndo={handleUndo}
        tool={tool}
        setTool={setTool}
      />
      
      <Canvas
        color={color}
        brushSize={brushSize}
        ref={canvasRef}
        onCanvasReady={handleCanvasReady}
        tool={tool}
        userId={userId}
        isConnected={isConnected}
      />
      
      <UserCursors currentUserId={userId} />
    </div>
  );
}

export default App;
