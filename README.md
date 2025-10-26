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

## Deploying to GitHub Pages
This repo ships with `.github/workflows/deploy.yml`, which builds on every push to `main` and publishes the `dist/` folder to the repository’s GitHub Pages environment (`https://wyer88.github.io/Creamy/`).

1. Commit and push changes to `main`.
2. GitHub Actions automatically runs `npm ci && npm run build` and deploys the artifact via `actions/deploy-pages`.
3. Track deployment status under **Actions → Deploy Creamy site**; when it turns green the public URL updates.

Enjoy the giggles! 🎉
