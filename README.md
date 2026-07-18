# Disposal Management System

React + Vite app for debris disposal workflow. Data uses Supabase tables from
`supabase/migrations`.

## Requirements

- Node.js 18+
- npm
- Supabase project, or local Supabase CLI

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env`:

   ```bash
   cp .env.example .env
   ```

3. Fill Supabase values in `.env`:

   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Apply SQL files in `supabase/migrations` to your Supabase database, ordered
   by filename.

## Run

```bash
npm run dev
```

Open printed local URL, usually `http://localhost:5173`.

## Build Check

```bash
npm run build
```
