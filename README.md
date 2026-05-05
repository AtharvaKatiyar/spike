# Broadcast Server

A real-time broadcast chat project with two parts:

- **`spike_backend`**: an Express + Prisma + PostgreSQL backend with JWT auth, room management, and a WebSocket chat server.
- **`spike_cli`**: an interactive terminal client for registering, logging in, managing rooms, and joining live chat sessions.

The system is designed so users can register, authenticate with JWT, create or manage rooms, and exchange messages in real time over WebSockets.

## Features

- User registration and login with password hashing using `bcrypt`
- JWT-based authentication for protected HTTP endpoints and WebSocket connections
- Room creation, listing, and deletion
- Real-time chat using `ws`
- Message history replay when joining a room
- Terminal-based CLI for end-to-end interaction with the backend
- PostgreSQL persistence through Prisma

## Project Structure

```text
broadcast_server/
├── spike_backend/
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── controllers/
│   │   ├── lib/
│   │   ├── routes/
│   │   ├── utils/
│   │   └── ws/
│   ├── prisma/
│   │   └── schema.prisma
│   └── generated/
└── spike_cli/
    ├── index.js
    ├── auth.js
    ├── room.js
    └── chat.js
```

## Requirements

- Node.js 18+ recommended
- npm
- PostgreSQL database
- A valid `DATABASE_URL`
- A JWT secret

## Backend Overview

The backend lives in `spike_backend`.

### Server startup

- `src/server.js` creates the HTTP server, attaches the WebSocket server, and starts listening on `PORT`.
- `src/app.js` configures Express middleware, mounts routes, and exposes `/health`.

### Authentication

Authentication routes are mounted under `/api/auth`.

- `POST /api/auth/register`
- `POST /api/auth/login`

Passwords are hashed with `bcrypt`, and login returns a signed JWT.

### Protected room routes

Room routes are mounted under `/broadcast` and protected by JWT verification.

- `GET /broadcast/listRooms`
- `POST /broadcast/createRoom`
- `DELETE /broadcast/deleteRoom`

### WebSocket chat

The chat server is attached to the same HTTP server.

Connection format:

```text
ws://localhost:3000?token=<JWT>&room=<ROOM_NAME>
```

Once connected:

- the server validates the JWT
- confirms the user exists
- confirms the room exists
- sends recent message history
- broadcasts join/leave notifications
- persists new messages to PostgreSQL

## CLI Overview

The CLI lives in `spike_cli`.

It provides a simple terminal flow:

1. Register or log in
2. Pick a room action
3. Create, list, join, or delete rooms
4. Chat in real time once inside a room

## Environment Variables

Create a `.env` file inside `spike_backend` with the following values:

```env
PORT=3000
DATABASE_URL=your_postgres_connection_string
JWT_SECRET=your_jwt_secret
SALT_ROUND=10
```

### Notes

- `DATABASE_URL` is required by Prisma and the Prisma client adapter.
- `JWT_SECRET` is used for signing and verifying tokens.
- `SALT_ROUND` controls password hashing cost.

## Database Schema

The Prisma schema defines three models:

- **User**
  - `id`, `name`, `email`, `passwordHash`
  - timestamps
  - related rooms and messages

- **Room**
  - `id`, `name`, `ownerId`
  - unique room name
  - belongs to a user as owner
  - contains messages

- **Message**
  - `id`, `content`, `userId`, `roomId`
  - belongs to a user and a room
  - includes creation timestamp

## Installation

### 1) Install backend dependencies

```bash
cd spike_backend
npm install
```

### 2) Install CLI dependencies

```bash
cd ../spike_cli
npm install
```

### 3) Configure environment variables

Create `spike_backend/.env` and set the required variables shown above.

### 4) Generate Prisma client

From `spike_backend`:

```bash
npx prisma generate
```

### 5) Run database migrations

If you are setting up a fresh database:

```bash
npx prisma migrate dev
```

If you only need to push a schema change in a controlled environment, use the Prisma workflow that matches your setup.

## Running the Project

### Start the backend

From `spike_backend`:

```bash
npm run dev
```

This starts the Express server and the WebSocket server on port `3000` by default.

If you prefer to run the server directly:

```bash
node src/server.js
```

### Start the CLI

From `spike_cli`:

```bash
node index.js
```

## API Reference

### Health check

`GET /health`

Response:

```json
{ "status": "ok" }
```

### Register

`POST /api/auth/register`

Body:

```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "secret"
}
```

Success response:

```json
{
  "message": "User Registered successfully",
  "userId": "..."
}
```

### Login

`POST /api/auth/login`

Body:

```json
{
  "email": "alice@example.com",
  "password": "secret"
}
```

Success response:

```json
{
  "message": "Login Successfull",
  "token": "...",
  "user": {
    "id": "...",
    "name": "Alice",
    "email": "alice@example.com",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### List rooms

`GET /broadcast/listRooms`

Header:

```http
Authorization: Bearer <JWT>
```

Success response:

```json
{
  "allRooms": [
    { "name": "general" }
  ]
}
```

If no rooms exist for the authenticated user:

```json
{
  "message": "No rooms created"
}
```

### Create room

`POST /broadcast/createRoom`

Header:

```http
Authorization: Bearer <JWT>
```

Body:

```json
{
  "name": "general"
}
```

Success response:

```json
{
  "message": "Room created successfully",
  "id": "...",
  "name": "general"
}
```

### Delete room

`DELETE /broadcast/deleteRoom`

Header:

```http
Authorization: Bearer <JWT>
```

Body:

```json
{
  "name": "general"
}
```

Success response:

```json
{
  "message": "Room deleted successfully",
  "deletedRoom": { ... }
}
```

## WebSocket Message Format

### Connect

```text
ws://localhost:3000?token=<JWT>&room=<ROOM_NAME>
```

### Server to client messages

#### History payload

```json
{
  "type": "history",
  "messages": [
    {
      "from": "Alice",
      "content": "Hello",
      "timestamp": "2026-05-05T12:00:00.000Z"
    }
  ]
}
```

#### Chat message payload

```json
{
  "type": "message",
  "from": "Alice",
  "content": "Hi everyone",
  "timestamp": "2026-05-05T12:01:00.000Z"
}
```

#### Notification payload

```json
{
  "type": "notification",
  "event": "join",
  "user": "Alice",
  "timestamp": "2026-05-05T12:01:00.000Z"
}
```

Leave notifications use `event: "leave"`.

### Client to server messages

```json
{
  "type": "message",
  "content": "Hello room"
}
```

## CLI Usage Flow

1. Launch the CLI with `node index.js`
2. Choose `Register` or `Login`
3. After login, pick one of the room actions:
   - Join room
   - Create room
   - List rooms
   - Delete room
   - Logout
4. In a room, type messages and press Enter to send
5. Type `/exit` to leave the room

## Implementation Notes

- Rooms are scoped to the authenticated user for listing and ownership checks.
- Messages are stored in the database and also cached in memory per room for fast history delivery.
- Only the most recent 50 messages are cached per room in memory.
- Join/leave events are broadcast to everyone currently connected in the room.
- The server clears in-memory room state when the last socket leaves.

## Troubleshooting

- If the backend fails to start, check that `DATABASE_URL` is set correctly.
- If login or WebSocket authentication fails, verify `JWT_SECRET` matches between token creation and verification.
- If room connections close immediately, confirm the room exists and the JWT is valid.
- If Prisma complains about missing tables, rerun migrations and regenerate the client.
