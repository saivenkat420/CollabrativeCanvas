import { v4 as uuidv4 } from "uuid";

export class StateManager {
  constructor() {
    this.history = [];
  }

  addStroke(stroke) {
    const newStroke = {
      id: stroke.id || uuidv4(),
      odId: stroke.odId,
      points: stroke.points,
      color: stroke.color,
      brushSize: stroke.brushSize,
      tool: stroke.tool || "pencil",
      timestamp: stroke.timestamp || Date.now()
    };
    
    this.history.push(newStroke);
    return newStroke;
  }

  undoByUser(odId) {
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].odId === odId) {
        this.history.splice(i, 1);
        return this.history;
      }
    }
    return this.history;
  }

  getHistory() {
    return this.history;
  }

  clearHistory() {
    this.history = [];
    return this.history;
  }

  getHistoryByUser(odId) {
    return this.history.filter(stroke => stroke.odId === odId);
  }

  getStrokeCount() {
    return this.history.length;
  }

  getRecentStrokes(count) {
    return this.history.slice(-count);
  }

  removeStroke(strokeId) {
    const index = this.history.findIndex(s => s.id === strokeId);
    if (index !== -1) {
      this.history.splice(index, 1);
      return true;
    }
    return false;
  }
}
