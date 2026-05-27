# tribes

category-based social platform. minimal blue. no emojis. squircles. space grotesk.

## run

Open `index.html` in a browser. No build, no backend.

## design spec

- light by default, dark mode auto via `prefers-color-scheme`
- palette: near-white blue-cast background, monochromatic blue range, `#70D6FF` primary
- Space Grotesk everywhere, all lowercase, light/editorial weights
- squircle radii 14–22px; hairline borders (no drop shadows)
- Phosphor icons via CDN
- Tribes and people identified by single-letter monogram tiles
- motion: subtle 150–200ms fades only

## views

- **discover** — hero + trending tribes + for-you feed
- **search** — text + filter chips + tabs for tribes/people
- **category page** — hero card, join, members + posts + about tabs
- **profile** — bio, tribes, connect/message
- **swipe** — card stack with ← / → keys
- **dms** — sidebar + thread + mock replies
- **me** — joined tribes + connections

## files

- `index.html` — SPA shell, all 7 views
- `styles.css` — design system, responsive, light + dark
- `data.js` — mock categories, people, posts, threads
- `app.js` — routing, rendering, state
- `STITCH.md` — Stitch project + screen IDs

## keyboard

- `⌘K` / `/` — jump to search
- `←` / `→` — pass / connect on swipe view
