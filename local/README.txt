THRESHOLD LOCAL LAUNCHER
========================

This folder lets you run Threshold on your machine while loading
the heavy app bundle from GitHub Pages (no local npm install needed).

HOW TO USE
----------
1. Make sure GitHub Pages is deployed (build:pages has been pushed).
2. Open local/index.html in a browser, OR run a tiny server:

   npx serve local
   python -m http.server 8080

3. The page shell loads locally; JS/CSS/Three.js come from:
   https://medicinalsheep.github.io/threshold/

REGENERATE
----------
After code changes, run from project root:
  npm run build:pages
  git push

That rebuilds dist-pages and refreshes local/index.html.