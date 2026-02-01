# Real-Time Collaborative Drawing Canvas

A multi-user drawing application where multiple people can draw simultaneously on a shared canvas. Built with React, Node.js, and Socket.io.

## Features

- **Real-time collaborative drawing** - Multiple users can draw simultaneously
- **Ghost cursors** - See where other users are on the canvas
- **Global undo** - Undo only your own strokes without affecting others
- **Color picker** - Choose any color for drawing
- **Brush size control** - Adjust line thickness
- **Eraser tool** - Erase parts of the drawing
- **Clear canvas** - Clear the entire canvas (synced across all users)

## Prerequisites

- Node.js v18 or higher
- npm or yarn

## Project Structure

```
CollabrativeCanvas/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Canvas/     # Drawing canvas component
│   │   │   ├── Toolbar/    # Drawing tools UI
│   │   │   └── UserCursors.jsx  # Ghost cursors
│   │   ├── utils/
│   │   │   └── socket.js   # Socket.io client
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── server/                 # Node.js backend
│   ├── server.js           # Express + Socket.io server
│   ├── rooms.js            # Room management
│   ├── state-manager.js    # Drawing history management
│   └── package.json
├── README.md
└── ARCHITECTURE.md
```

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd CollabrativeCanvas
```

### 2. Install server dependencies

```bash
cd server
npm install
```

### 3. Install client dependencies

```bash
cd ../client
npm install
```

## Running Locally

### 1. Start the server

Open a terminal and run:

```bash
cd server
npm run dev
```

The server will start on `http://localhost:3001`

### 2. Start the client

Open another terminal and run:

```bash
cd client
npm run dev
```

The client will start on `http://localhost:5173`

## Testing with Multiple Users

1. Open `http://localhost:5173` in one browser window
2. Open `http://localhost:5173` in another browser window (or different browser)
3. Draw in one window and see it appear in the other
4. Move your cursor and see the ghost cursor in the other window
5. Test the undo feature - it only removes your own strokes

## Socket Events

### Client → Server

| Event | Description |
|-------|-------------|
| `join_room` | Join a drawing room |
| `drawing_step` | Real-time drawing segment |
| `stroke_complete` | Completed stroke |
| `cursor_move` | Cursor position update |
| `undo_request` | Request to undo last stroke |
| `clear_request` | Request to clear canvas |

### Server → Client

| Event | Description |
|-------|-------------|
| `room_state` | Initial room state for new user |
| `user_joined` | New user joined notification |
| `user_left` | User left notification |
| `remote_draw` | Real-time drawing from others |
| `stroke_added` | Completed stroke from others |
| `cursor_update` | Cursor position from others |
| `history_update` | Updated history after undo/clear |

## Environment Variables

### Server (.env)

```
PORT=3001
CLIENT_URL=http://localhost:5173
```

### Client

Create a `.env` file in the client folder:

```
VITE_SERVER_URL=http://localhost:3001
```

## Technologies Used

- **Frontend**: React, Vite, Socket.io-client
- **Backend**: Node.js, Express, Socket.io
- **Canvas**: HTML5 Canvas API (native)

## Performance Optimizations

- Drawing events throttled to 60fps (16ms)
- Cursor updates throttled to 20fps (50ms)
- Efficient stroke storage and redraw
- Smooth line rendering with round caps/joins

## License

ISC
