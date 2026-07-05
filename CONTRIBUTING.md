# Contributing to Nozomio Application

This repository is a static interactive microsite with scroll-driven panels, canvas frame rendering, and GitHub Pages deployment.

## Local Setup

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Quality Bar

- Run `npm run verify` before committing asset, script, or markup changes.
- Keep the frame sequence and canvas logic in sync.
- Check both desktop and mobile viewport behavior for scroll-driven sections.
- Keep the static deployment dependency-free unless there is a clear reason to add tooling.
- Update `README.md` when the local run path, assets, or deployment behavior changes.

## Pull Request Notes

Include the visible experience affected, validation performed, and any asset-size or GitHub Pages impact.
