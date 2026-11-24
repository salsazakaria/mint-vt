# MINT VT — website

**Preview site:** https://mint-vt.netlify.app/

A retro-terminal edition of the MINT Modeler v2 site (github.com/salsazakaria/mint-v2): same content, videos and animations, restyled after designproject.io/skills-repo.

- **Type:** VT323 for display headings (uppercase), Geist Mono for all body copy. Both are self-hosted in `assets/fonts/`.
- **Look:** square corners everywhere, hairline borders, inverted white buttons with a hard offset shadow that presses in, outline ghost buttons, stepped (frame-by-frame) animations, terminal-prompt eyebrows (`> [ … ]_`), film grain and scanlines.
- **Where it lives:** the theme tokens are in `tailwind.config.js`; the components and the "RETRO THEME LAYER" are in `src/input.css`.

Static site built with HTML, Tailwind CSS (v3, compiled) and plain JavaScript.
It was built from the Figma file `MINT-Design` (page "Vibe Code").

| Page | File | Figma |
|---|---|---|
| Landing | `index.html` | landing-page-lg / -sm / lg:menu |
| Get started | `get-started.html` | quick-onboarding-lg / -sm |
| Brand site | `brand.html` | brand-site-lg / -sm |
| Dashboard | `dashboard.html` | main-dashboard-lg (expanded + collapsed) / -sm / sm:state(menu) |

## Run

```bash
npm install          # Tailwind CLI and font packages (dev only)
npm run build        # src/input.css -> dist/styles.css
npm run dev          # rebuild CSS on change
npx serve .          # or any static server, then open http://localhost:3000
```

`dist/styles.css` is already compiled, so the pages work without running a build.
Run `npm run build` whenever you add Tailwind classes to the HTML or JS.

## Responsive

- **sm**: under 1024px (Figma 402 frames). **lg**: 1024px and up (Figma 1512 frames).
- On sm, *How it works* and *Built for you* scroll horizontally with snapping. *Built for you* also scrolls on lg, where the cards run past the right edge as in Figma.
- On sm, the ship-faster video and the footer logo are hidden, as in Figma.

## Interactive pieces

- **Hero** (`js/hero-animation.js`, carried over from the earlier mint-gg site): a cursor-reactive pixel grid.
  - Dim square pixels light up in white and Mint red around the cursor and leave a fading trail.
  - With no mouse (touch devices), a slow ambient shimmer plays instead.
  - The `.hero-mask` class in `src/input.css` fades the grid at the bottom and softens it behind the headline.
- **Final CTA** (`FlowScene`): a moving, Base-style dither field that bends toward the cursor.
- The hero and CTA canvases pause when off screen. With `prefers-reduced-motion`, they render one static frame.
- **Showcase** (`js/landing.js`): an endlessly looping coverflow carousel. The centre card is full size and the side cards scale to 0.759, which is 803/1058 from Figma. It supports drag, swipe, trackpad, arrow buttons, keyboard and dots on mobile.
- **Add to Claude** dropdown (`js/common.js`): lists the agents from Figma. Each row shows a copy icon that expands to "Copy setup prompt" on hover. On mobile the menu sits centred under the CTA, 16px from the screen edges.
- **Dashboard**:
  - The sidebar collapses to 70px on lg. Use the toggle or Cmd/Ctrl+B. The state is remembered in localStorage.
  - On sm, the sidebar is an off-canvas drawer.
  - The asset tabs update the empty state.
  - The profile card opens Account, Light/Dark Theme (remembered in localStorage) and Sign out.

## Showcase demo videos

The ten demos are stored in `assets/showcase/` as `demo-01.mp4` … `demo-10.mp4`, each with a `.jpg` poster.
- The videos are 1280px wide with no audio track.
- Each slide in `index.html` has `data-video` and `data-poster`.
- Only the centre slide gets a `<video>` element, and only once the section is on screen. The others show their poster image.
- When a card leaves the centre, its video is unloaded.

To add or replace a demo, re-encode it first:
`ffmpeg -i in.mp4 -an -vf scale=1280:-2 -c:v libx264 -crf 27 -movflags +faststart demo-11.mp4`
Then add a slide.

Every video on the site is muted. The `muted` attribute is set and `js/common.js` also forces it. The two source videos that had audio tracks (`modeler-demo-web-optimized.mp4` and `mint-brandsite.mp4`) had their audio removed.

## TODO / placeholders

- Setup prompt text: `setupPrompt()` in `js/common.js`. It currently points to docs.mint.gg.
- Dashboard "Refresh" is simulated. Wire it to the assets API.
- Dashboard "Account" link (`data-todo="account-page"`) has no page yet.

## Returning visitors

The landing page (`index.html`) shows different copy to people coming back within a week. The logic lives in `js/returning-visitor.js`, which is loaded synchronously in `<head>`.

- **First visit:** the script stores a timestamp in `localStorage['mint_first_visit']`.
- **Returning:** a new browser session (decision cached in `sessionStorage['mint_visit_session']`, so a reload doesn't flip it) **and** a first visit less than 7 days ago **and** `isLoggedIn()` is false.
- **After 7 days:** the timestamp is overwritten with now and the default copy shows again.
- **Blocked storage or any error:** default copy.
- **How the swap works:**
  - Default copy stays in the HTML. Swappable elements carry `data-rv="…"`, and the returning copy lives in the `COPY` map in the script.
  - `html.is-returning` hides only those elements until `rv-ready` is set. A 1.5 s timeout reveals them as a failsafe.
- **TODO(auth):** `isLoggedIn()` currently returns `false`. Step-by-step handoff, with constraints and tests, is in [`AGENTS.md`](AGENTS.md).
- **Test params:** each one logs the decision to the console.
  - `?returning=1` forces the returning view.
  - `?returning=0` forces the default view.
  - `?reset-visit` clears both keys.
