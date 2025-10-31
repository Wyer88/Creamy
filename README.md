# Creamy — Interactive One-Pager

Premium, single-page React experience for “Creamy”, featuring tactile scroll ripples, playful poke interactions, subtle parallax, and a floating social link. Built with Vite and Tailwind CSS, ready to deploy on GitHub Pages.

## Getting Started
1. **Install dependencies**
   ```bash
   cd ~/Projects/CreamySite
   npm install
   ```
2. **Run the local dev server**
   ```bash
   cd ~/Projects/CreamySite
   npm run dev
   ```
   Open the printed `http://localhost:5173` URL to interact with the site.
3. **Create a production build (optional)**
   ```bash
   cd ~/Projects/CreamySite
   npm run build
   ```
   Preview with `npm run preview`, then deploy the `dist/` folder to GitHub Pages.

## Assets to Replace
- `public/images/creamy_original.jpg`: full-scene photo for the blurred backdrop.
- `public/images/creamy_cutout.png`: transparent cutout used for the hero.
- `public/audio/giggle.m4a` *(optional)*: drop in a real giggle; the app falls back to a synthesized laugh if the file is missing.

Keep the same filenames to avoid code changes.

## Accessibility & Performance
- 60fps-friendly transforms and canvas ripples (auto-dials down on touch devices / reduced-motion).
- Keyboard-focusable “X” button with `noopener noreferrer`.
- Audio plays only after an explicit user poke.

## Shared Leaderboard Setup
The in-page leaderboard now connects to an optional persistence service so everyone’s best poke runs can be recorded and replayed. Until the service is configured the UI falls back to local demo data.

1. **Provision the service**
   ```bash
   cd ~/Projects/CreamySite/server
   npm install
   npm start
   ```
   This launches an Express + SQLite API on `http://localhost:8787` with endpoints:
   - `GET /leaderboard` → aggregated highscores
   - `GET /leaderboard/log` → most recent submissions
   - `POST /leaderboard` → record a run (`{ name, pokes, donuts, totalDonuts }`)

   Deploy the same folder anywhere Node runs (Render, Fly.io, Railway, EC2, etc.). Persist the `server/data/leaderboard.db` file to keep history between restarts.

2. **Point the React app at the API**  
   Create `~/Projects/CreamySite/.env.local` with:
   ```bash
   VITE_LEADERBOARD_API_BASE_URL=http://localhost:8787
   ```
   Replace with your deployed URL once you host the service. Restart `npm run dev` after changing env vars.

3. **Verify end-to-end**  
   - Load `npm run dev` at `http://localhost:5173`
   - Enter a friendly username in the sidebar (filters remove offensive/unsafe text)
   - Poke Creamy as much as you like, then hit **Submit poke count**
   - If your run lands in the global top 10 it appears instantly in the leaderboard; otherwise it’s still logged in the `/leaderboard/log` feed
   - Refresh the page or open another browser to see the shared leaderboard update live

4. **Operational tips**
   - Reset the leaderboard during testing with `npm run reset` (from the `server/` folder)
   - Back up `/server/data/leaderboard.db`
   - Extend the block-list in `src/utils/username.js` and `server/index.js` for stricter moderation
   - Use a reverse proxy/HTTPS when exposing the API publicly

## Deploying to GitHub Pages
This repo ships with `.github/workflows/deploy.yml`, which builds on every push to `main` and publishes the `dist/` folder to the repository’s GitHub Pages environment (`https://wyer88.github.io/Creamy/`).

1. Commit and push changes to `main`.
2. GitHub Actions automatically runs `npm ci && npm run build` and deploys the artifact via `actions/deploy-pages`.
3. Track deployment status under **Actions → Deploy Creamy site**; when it turns green the public URL updates.

Enjoy the giggles! 🎉
