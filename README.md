# Unifyr Events

Campus events and team matching app with a React + Vite client and an Express + Socket.IO server.

## Stack

- `client/`: React 19, Vite, Clerk, Framer Motion
- `server/`: Express 5, Postgres, Clerk, Socket.IO

## Setup

1. Create the frontend env file:
   - Copy [`client/.env.example`](/Users/nikhilm/Desktop/Programming/Web Dev/Events/client/.env.example) to `client/.env.local`
2. Create the backend env file:
   - Copy [`server/.env.example`](/Users/nikhilm/Desktop/Programming/Web Dev/Events/server/.env.example) to `server/.env`
3. Install dependencies:
   - `cd client && npm install`
   - `cd ../server && npm install`
4. Initialize the database schema:
   - `cd server && npm run init-db`
5. Start the app:
   - `cd server && npm run dev`
   - `cd client && npm run dev`

## Notes

- The app uses Clerk end to end for authentication.
- Protected REST endpoints expect a Clerk session token in the `Authorization` header.
- The radar matchmaking socket also verifies the Clerk session token and syncs first-time users into Postgres automatically.
- The frontend expects the API server at `http://localhost:5000` unless `VITE_API_ORIGIN` is set.
