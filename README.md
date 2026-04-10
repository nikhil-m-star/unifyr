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

## Render Backend Deployment

1. Create a `Web Service` on Render from this repo.
2. Set Root Directory to `server` (or keep repo root and set start command to `npm start --prefix server`).
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables on Render:
   - `NODE_ENV=production`
   - `DATABASE_URL=...`
   - `CLERK_SECRET_KEY=...`
   - `CORS_ORIGIN=https://campusunifyr.vercel.app,https://*.vercel.app`
   - `ADMIN_EMAILS=nikhilm.cs24@bmsce.ac.in`
   - `GROQ_API_KEY=...`
   - `GROQ_MODEL=llama-3.3-70b-versatile`
6. In Vercel frontend env, set:
   - `VITE_API_ORIGIN=https://<your-render-service>.onrender.com`

### Mobile Network Notes

- For deployed usage (phone on mobile data/Wi-Fi), frontend talks to Render over public HTTPS, so it works as long as `CORS_ORIGIN` includes your frontend domain.
- For local LAN testing on phone, opening frontend from `http://<your-laptop-ip>:5173` now auto-targets backend at `http://<your-laptop-ip>:5000` in development.
