# Nozomio Application

A playful one-page application microsite built as an interactive job application for Nozomio. The page uses scroll-driven storytelling, a canvas frame sequence, and a kinetic call-to-action to turn a simple application into a memorable product-style experience.

Live demo: https://aizakmi08.github.io/nozomio-application/

## Highlights

- Scroll-based narrative with full-viewport panels and progressive reveal states.
- Canvas-rendered WebP frame sequence for a lightweight animation sequence.
- Responsive layout tuned for desktop and mobile browser viewports.
- Interactive offer section with a mailto call-to-action and animated alternate action.
- Static deployment through GitHub Pages with no backend dependency.

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Canvas API
- GitHub Pages

## Project Structure

```text
.
|-- index.html              # Page markup and content sections
|-- styles.css              # Responsive layout, animation states, visual system
|-- script.js               # Scroll progress, frame loading, canvas rendering, CTA behavior
|-- assets/                 # Favicons and visual assets
`-- assets/frames/cook/     # WebP animation frame sequence
```

## Run Locally

Because this is a static site, it can be opened directly in a browser. For local testing with a development server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Implementation Notes

The animation is implemented as a preloaded frame sequence rather than a video so the page can bind visual progress directly to scroll position. The JavaScript keeps track of the desired frame, resizes the canvas for the current device pixel ratio, and draws only when a new frame is ready.

## Status

The project is deployed and available as a public GitHub Pages site.
