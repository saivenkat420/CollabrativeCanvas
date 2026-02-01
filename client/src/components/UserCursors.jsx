import { useEffect, useState } from "react";
import { onCursorUpdate, onUserJoined, onUserLeft, onRoomState } from "../utils/socket";
import "./UserCursors.css";

export const UserCursors = ({ currentUserId }) => {
  const [cursors, setCursors] = useState(new Map());

  useEffect(() => {
    onRoomState(({ users }) => {
      const cursorMap = new Map();
      users.forEach((user) => {
        if (user.id !== currentUserId) {
          cursorMap.set(user.id, {
            x: user.cursor?.x || 0,
            y: user.cursor?.y || 0,
            name: user.name,
            color: user.color
          });
        }
      });
      setCursors(cursorMap);
    });

    onCursorUpdate(({ odId, x, y, name, color }) => {
      if (odId !== currentUserId) {
        setCursors((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(odId);
          if (existing) {
            newMap.set(odId, { 
              ...existing, 
              x, 
              y,
              name: name || existing.name,
              color: color || existing.color
            });
          } else {
            newMap.set(odId, {
              x,
              y,
              name: name || `User-${odId.slice(0, 4)}`,
              color: color || getRandomColor()
            });
          }
          return newMap;
        });
      }
    });

    onUserJoined(({ user }) => {
      if (user.id !== currentUserId) {
        setCursors((prev) => {
          const newMap = new Map(prev);
          newMap.set(user.id, {
            x: user.cursor?.x || 0,
            y: user.cursor?.y || 0,
            name: user.name,
            color: user.color
          });
          return newMap;
        });
      }
    });

    onUserLeft(({ odId }) => {
      setCursors((prev) => {
        const newMap = new Map(prev);
        newMap.delete(odId);
        return newMap;
      });
    });
  }, [currentUserId]);

  const cursorArray = Array.from(cursors.entries());

  return (
    <div className="user-cursors-container">
      {cursorArray.map(([odId, cursor]) => (
        <div
          key={odId}
          className="user-cursor"
          style={{
            transform: `translate(${cursor.x}px, ${cursor.y}px)`,
            "--cursor-color": cursor.color
          }}
        >
          <svg
            className="cursor-icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill={cursor.color}
          >
            <path d="M5.65376 12.4563L4.58883 3.58393C4.53214 3.08618 5.06057 2.72675 5.49879 2.96105L21.5085 11.8637C21.9673 12.1098 21.8746 12.7957 21.363 12.9152L13.8326 14.6723C13.5474 14.7389 13.3132 14.9431 13.2062 15.2169L10.4118 22.5765C10.2234 23.0576 9.53353 23.0309 9.38492 22.5364L5.65376 12.4563Z" />
          </svg>
          <span className="cursor-label" style={{ backgroundColor: cursor.color }}>
            {cursor.name}
          </span>
        </div>
      ))}
    </div>
  );
};

function getRandomColor() {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
    "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
