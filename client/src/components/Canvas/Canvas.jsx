import { useRef, useEffect, useState, useCallback } from "react";
import "./Canvas.css";
import {
  emitDrawingStep,
  emitStrokeComplete,
  emitCursorMove,
  emitUndo,
  emitClear,
  onRemoteDraw,
  onStrokeAdded,
  onHistoryUpdate,
  onRoomState,
} from "../../utils/socket";

export const Canvas = (props) => {
  const { color, brushSize, onCanvasReady, tool, userId, isConnected } = props;
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState([]);
  const historyRef = useRef([]);
  const [currentStroke, setCurrentStroke] = useState(null);
  
  const userIdRef = useRef(userId);
  const remoteLastPositions = useRef(new Map());
  const lastEmitTime = useRef(0);
  const lastCursorEmitTime = useRef(0);
  const DRAW_THROTTLE_MS = 8;
  const CURSOR_THROTTLE_MS = 50;

  const drawLineSegment = useCallback((fromUserId, start, end, style) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    const lastPos = remoteLastPositions.current.get(fromUserId);
    
    let drawStart = start;
    if (lastPos) {
      const distance = Math.sqrt(
        Math.pow(lastPos.x - start.x, 2) + Math.pow(lastPos.y - start.y, 2)
      );
      if (distance < 50) {
        drawStart = lastPos;
      }
    }
    
    ctx.beginPath();
    ctx.moveTo(drawStart.x, drawStart.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    
    remoteLastPositions.current.set(fromUserId, end);
  }, []);

  const redrawCanvas = useCallback((strokes) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    strokes.forEach((stroke) => {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      stroke.points.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
    });
    
    remoteLastPositions.current.clear();
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
    historyRef.current = [];
    remoteLastPositions.current.clear();
    
    if (isConnected) {
      emitClear();
    }
  }, [isConnected]);

  const undo = useCallback(() => {
    if (isConnected) {
      emitUndo();
    } else {
      if (historyRef.current.length === 0) return;
      const newHistory = historyRef.current.slice(0, -1);
      setHistory(newHistory);
      historyRef.current = newHistory;
      redrawCanvas(newHistory);
    }
  }, [isConnected, redrawCanvas]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctxRef.current = ctx;
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;

    if (onCanvasReady) {
      onCanvasReady({ clear, undo });
    }

    onRoomState(({ history: serverHistory }) => {
      setHistory(serverHistory);
      historyRef.current = serverHistory;
      redrawCanvas(serverHistory);
    });

    onRemoteDraw((data) => {
      const remoteUserId = data.userId;
      if (remoteUserId && remoteUserId !== userIdRef.current) {
        drawLineSegment(remoteUserId, data.start, data.end, data.style);
      }
    });

    onStrokeAdded(({ stroke }) => {
      const currentUserId = userIdRef.current;
      const strokeUserId = stroke.userId || stroke.odId;
      if (strokeUserId !== currentUserId) {
        setHistory((prev) => [...prev, stroke]);
        remoteLastPositions.current.delete(strokeUserId);
      }
    });

    onHistoryUpdate(({ history: newHistory }) => {
      setHistory(newHistory);
      historyRef.current = newHistory;
      redrawCanvas(newHistory);
    });

    const handleResize = () => {
      const currentHistory = historyRef.current;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      redrawCanvas(currentHistory);
    };
    
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (onCanvasReady) {
      onCanvasReady({ clear, undo });
    }
  }, [clear, undo, onCanvasReady]);

  const getCoordinates = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (event) => {
    setIsDrawing(true);
    const { x, y } = getCoordinates(event);
    setLastPosition({ x, y });
    
    const strokeColor = tool === "eraser" ? "#ffffff" : color;
    const strokeWidth = tool === "eraser" ? Math.max(brushSize * 4, 20) : brushSize;
    
    setCurrentStroke({
      odId: userId,
      points: [{ x, y }],
      color: strokeColor,
      brushSize: strokeWidth,
      tool: tool,
    });
    
    if (isConnected) {
      emitDrawingStep({
        start: { x, y },
        end: { x, y },
        style: { color: strokeColor, width: strokeWidth }
      });
    }
  };

  const draw = (event) => {
    if (!isDrawing) return;
    
    const { x, y } = getCoordinates(event);
    const ctx = ctxRef.current;
    const isEraser = tool === "eraser";
    const strokeColor = isEraser ? "#ffffff" : color;
    const strokeWidth = isEraser ? Math.max(brushSize * 4, 20) : brushSize;
    
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPosition.x, lastPosition.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    setCurrentStroke((prev) => ({
      ...prev,
      points: [...prev.points, { x, y }],
    }));
    
    if (isConnected) {
      const now = Date.now();
      if (now - lastEmitTime.current >= DRAW_THROTTLE_MS) {
        emitDrawingStep({
          start: lastPosition,
          end: { x, y },
          style: { color: strokeColor, width: strokeWidth }
        });
        lastEmitTime.current = now;
      }
    }
    
    const now = Date.now();
    if (isConnected && now - lastCursorEmitTime.current >= CURSOR_THROTTLE_MS) {
      emitCursorMove(x, y);
      lastCursorEmitTime.current = now;
    }
    
    setLastPosition({ x, y });
  };

  const handleMouseMove = (event) => {
    if (isConnected && !isDrawing) {
      const now = Date.now();
      if (now - lastCursorEmitTime.current >= CURSOR_THROTTLE_MS) {
        const { x, y } = getCoordinates(event);
        emitCursorMove(x, y);
        lastCursorEmitTime.current = now;
      }
    }
    
    if (isDrawing) {
      draw(event);
    }
  };

  const stopDrawing = () => {
    if (isDrawing && currentStroke) {
      const completedStroke = {
        ...currentStroke,
        odId: userId,
        timestamp: Date.now()
      };
      setHistory((prev) => [...prev, completedStroke]);
      
      if (isConnected) {
        emitStrokeComplete(completedStroke);
      }
      
      setCurrentStroke(null);
    }
    setIsDrawing(false);
  };

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        className={`drawing-canvas ${tool === "eraser" ? "eraser-mode" : ""}`}
        onMouseDown={startDrawing}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
    </div>
  );
};
