import { StateManager } from "./state-manager.js";

export class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  createRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        users: new Map(),
        stateManager: new StateManager(),
        createdAt: Date.now()
      });
    }
    return this.rooms.get(roomId);
  }

  getRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      return this.createRoom(roomId);
    }
    return this.rooms.get(roomId);
  }

  joinRoom(roomId, user) {
    const room = this.getRoom(roomId);
    room.users.set(user.id, {
      id: user.id,
      name: user.name,
      color: user.color,
      cursor: user.cursor || { x: 0, y: 0 },
      joinedAt: Date.now()
    });
    return room;
  }

  leaveRoom(roomId, odId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.users.delete(odId);
      
      if (room.users.size === 0) {
        setTimeout(() => {
          if (room.users.size === 0) {
            this.deleteRoom(roomId);
          }
        }, 60000);
      }
      return true;
    }
    return false;
  }

  getUsers(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      return Array.from(room.users.values());
    }
    return [];
  }

  getUser(roomId, odId) {
    const room = this.rooms.get(roomId);
    if (room) {
      return room.users.get(odId) || null;
    }
    return null;
  }

  updateCursor(roomId, odId, x, y) {
    const room = this.rooms.get(roomId);
    if (room && room.users.has(odId)) {
      room.users.get(odId).cursor = { x, y };
    }
  }

  deleteRoom(roomId) {
    if (this.rooms.has(roomId)) {
      this.rooms.delete(roomId);
    }
  }

  getAllRooms() {
    const roomList = [];
    for (const [id, room] of this.rooms) {
      roomList.push({
        id,
        userCount: room.users.size,
        strokeCount: room.stateManager.getHistory().length,
        createdAt: room.createdAt
      });
    }
    return roomList;
  }
}
