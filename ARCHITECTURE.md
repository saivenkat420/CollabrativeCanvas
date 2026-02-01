# Architecture Documentation

## System Overview

This is a real-time collaborative drawing canvas application that allows multiple users to draw simultaneously on a shared canvas. The system uses WebSocket communication for low-latency real-time updates.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSERS                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   User A    │  │   User B    │  │   User C    │              │
│  │  (Browser)  │  │  (Browser)  │  │  (Browser)  │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          │                                       │
│                    WebSocket Connection                          │
└──────────────────────────┼───────────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────────┐
│                    NODE.JS SERVER                                 │
│                          │                                       │
│  ┌───────────────────────┴───────────────────────────┐          │
│  │                   Socket.io                        │          │
│  └───────────────────────┬───────────────────────────┘          │
│                          │                                       │
│  ┌───────────────────────┼───────────────────────────┐          │
│  │              Room Manager (rooms.js)               │          │
│  │  - Create/manage rooms                             │          │
│  │  - Track users in each room                        │          │
│  │  - Handle user join/leave                          │          │
│  └───────────────────────┬───────────────────────────┘          │
│                          │                                       │
│  ┌───────────────────────┴───────────────────────────┐          │
│  │          State Manager (state-manager.js)          │          │
│  │  - Store drawing history                           │          │
│  │  - Handle undo by user                             │          │
│  │  - Provide history for new users                   │          │
│  └───────────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend (React + Vite)

```
src/
├── App.jsx                 # Main application container
│   - Manages global state (color, brush size, tool)
│   - Initializes socket connection
│   - Generates/stores user ID
│   - Renders child components
│
├── components/
│   ├── Canvas/
│   │   ├── Canvas.jsx      # Drawing canvas component
│   │   │   - HTML5 Canvas rendering
│   │   │   - Mouse event handling
│   │   │   - Socket event emission/reception
│   │   │   - Local and remote drawing
│   │   └── Canvas.css
│   │
│   ├── Toolbar/
│   │   ├── Toolbar.jsx     # Drawing tools UI
│   │   │   - Color picker
│   │   │   - Brush size slider
│   │   │   - Tool selection (pencil/eraser)
│   │   │   - Undo/Clear buttons
│   │   └── Toolbar.css
│   │
│   └── UserCursors.jsx     # Ghost cursors display
│       - Shows other users' cursor positions
│       - Displays user names with colors
│
└── utils/
    └── socket.js           # Socket.io client wrapper
        - Connection management
        - Event emitters
        - Event listeners
```

### Backend (Node.js + Express + Socket.io)

```
server/
├── server.js               # Main server entry point
│   - Express server setup
│   - Socket.io initialization
│   - Event handler registration
│   - CORS configuration
│
├── rooms.js                # Room management
│   - RoomManager class
│   - User tracking per room
│   - Room lifecycle management
│
└── state-manager.js        # Drawing state management
    - StateManager class
    - History storage
    - Undo logic (per user)
```

## Data Flow

### 1. Drawing Flow

```
User A draws on canvas
        │
        ▼
┌─────────────────┐
│ Canvas.jsx      │
│ startDrawing()  │
│ draw()          │
└────────┬────────┘
         │
         ├──────────────────────────────────┐
         │                                  │
         ▼                                  ▼
┌─────────────────┐               ┌─────────────────┐
│ Draw locally    │               │ Emit to server  │
│ (immediate)     │               │ drawing_step    │
└─────────────────┘               └────────┬────────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │ Server receives │
                                  │ broadcasts to   │
                                  │ other users     │
                                  └────────┬────────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │ User B & C      │
                                  │ receive and     │
                                  │ draw remotely   │
                                  └─────────────────┘
```

### 2. Stroke Completion Flow

```
User A releases mouse
        │
        ▼
┌─────────────────┐
│ stopDrawing()   │
└────────┬────────┘
         │
         ├──────────────────────────────────┐
         │                                  │
         ▼                                  ▼
┌─────────────────┐               ┌─────────────────┐
│ Add to local    │               │ Emit            │
│ history         │               │ stroke_complete │
└─────────────────┘               └────────┬────────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │ Server adds to  │
                                  │ StateManager    │
                                  │ history         │
                                  └────────┬────────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │ Broadcast       │
                                  │ stroke_added    │
                                  │ to others       │
                                  └─────────────────┘
```

### 3. Global Undo Flow

```
User A clicks Undo
        │
        ▼
┌─────────────────┐
│ Emit            │
│ undo_request    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Server: StateManager.undoByUser(userA)  │
│                                         │
│ History: [A1, B1, A2, B2]               │
│          Find last stroke by User A     │
│          Remove A2                       │
│ Result:  [A1, B1, B2]                   │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Broadcast       │
│ history_update  │
│ to ALL users    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ All clients     │
│ redraw canvas   │
│ from new        │
│ history         │
└─────────────────┘
```

## Data Structures

### Stroke Object

```javascript
{
  id: "uuid-v4",           // Unique stroke identifier
  odId: "user-123",         // User who created this stroke
  points: [                // Array of coordinates
    { x: 100, y: 150 },
    { x: 101, y: 151 },
    // ...
  ],
  color: "#000000",        // Stroke color
  brushSize: 5,            // Line width in pixels
  tool: "pencil",          // "pencil" or "eraser"
  timestamp: 1234567890    // Unix timestamp
}
```

### Room Object (Server)

```javascript
{
  id: "room-id",
  users: Map<odId, {
    id: "user-123",
    name: "User-1234",
    color: "#FF6B6B",
    cursor: { x: 100, y: 200 },
    joinedAt: 1234567890
  }>,
  stateManager: StateManager,
  createdAt: 1234567890
}
```

### User Cursor (Client)

```javascript
{
  odId: "user-123",
  x: 150,
  y: 200,
  name: "User-1234",
  color: "#FF6B6B"
}
```

## Socket Events Reference

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_room` | `{ roomId, odId, userName, userColor }` | User joins a room |
| `drawing_step` | `{ start: {x,y}, end: {x,y}, style: {color, width} }` | Real-time drawing segment |
| `stroke_complete` | `{ stroke }` | Completed stroke on mouse up |
| `cursor_move` | `{ x, y }` | Cursor position update |
| `undo_request` | `{}` | Request to undo last stroke |
| `clear_request` | `{}` | Request to clear canvas |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `room_state` | `{ history, users }` | Full state for joining user |
| `user_joined` | `{ user }` | New user joined notification |
| `user_left` | `{ odId }` | User left notification |
| `remote_draw` | `{ start, end, style, odId }` | Real-time drawing from other |
| `stroke_added` | `{ stroke }` | Completed stroke from other |
| `cursor_update` | `{ odId, x, y }` | Cursor update from other |
| `history_update` | `{ history }` | Updated history after undo/clear |

## Performance Optimizations

### 1. Throttling

- **Drawing events**: Throttled to 16ms (60fps) to prevent network flooding
- **Cursor updates**: Throttled to 50ms (20fps) for smooth but efficient updates

### 2. Efficient Rendering

- Local drawing is immediate (optimistic UI)
- Remote drawing renders incrementally (line segments)
- Full redraw only on undo/clear operations

### 3. State Management

- Server maintains single source of truth
- Clients sync on join and history updates
- Strokes stored with user IDs for efficient undo

## Security Considerations

1. **Input Validation**: All socket events should validate payload structure
2. **Rate Limiting**: Consider implementing rate limiting for production
3. **Room Access**: Can be extended with authentication for private rooms
4. **Data Size**: Stroke point arrays should have reasonable limits

## Scalability

For production deployment:

1. **Redis Adapter**: Use Socket.io Redis adapter for horizontal scaling
2. **Database**: Persist room history to database (MongoDB, PostgreSQL)
3. **CDN**: Serve static assets via CDN
4. **Load Balancer**: Use sticky sessions for WebSocket connections

## Deployment

### Frontend (Vercel/Netlify)

```bash
cd client
npm run build
# Deploy dist/ folder
```

### Backend (Railway/Render)

```bash
cd server
# Set environment variables
# Deploy server.js
```

Remember to update:
- `CLIENT_URL` in server environment
- `VITE_SERVER_URL` in client environment
