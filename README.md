# Task Manager 3D

A short full-stack task manager built with React, Express, TypeScript, and Vite.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a local environment file:
   - copy `.env.example` to `.env.local` if available, or create `.env.local` manually.

3. Provide required settings in `.env.local`:
   - `GEMINI_API_KEY` — your Gemini API key
   - `JWT_SECRET` — secret used for auth tokens
   - `MONGODB_URI` — optional MongoDB connection string
   - `APP_URL` — optional app URL, default is `http://localhost:3000`

## Run

```bash
npm run dev
```

Open the app at `http://localhost:3000`.

## Tech stack

- React 19 with Vite
- TypeScript
- Express server
- Tailwind CSS
- `@google/genai` for Gemini integration
- Local JSON fallback when MongoDB is unavailable

## Assumptions

- Node.js is installed
- `.env.local` contains valid keys
- MongoDB is optional; the app will fallback to built-in JSON storage if it cannot connect
- The development server listens on port `3000`

## Scripts

- `npm run dev` — launch development server
- `npm run build` — bundle frontend and backend for production
- `npm start` — run the production build
- `npm run clean` — remove generated `dist` and local JSON database files
- `npm run lint` — type-check code with TypeScript
