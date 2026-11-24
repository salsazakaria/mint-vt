# Notes for agents working on this repo

This is a static site: plain HTML, Tailwind v3 and vanilla JS, with no framework.

- **Build CSS:** `npx tailwindcss -i src/input.css -o dist/styles.css --minify`. Commit `dist/styles.css`, because Netlify does not build it.
- **Deploy:** every push to `main` auto-deploys to https://mint-vt.netlify.app.
- **Breakpoint:** `lg` = 1024px. Check every change at both a phone width (e.g. 402px) and a desktop width.

## Open task: wire up `isLoggedIn()` once auth exists

**Where:** `js/returning-visitor.js`, function `isLoggedIn()`. It currently returns `false` and is marked `TODO(auth)`.

**Why:**
- The landing page (`index.html`) shows "welcome back" copy to people who return within 7 days of their first visit.
- People who are signed in should always see the default copy instead.
- Full rules are in the comment block at the top of the file and in the README under "Returning visitors".

**What to do:** make `isLoggedIn()` return `true` when the visitor has a signed-in session.

**Constraints:**
1. **Synchronous only.**
   - The script runs in `<head>` before first paint, so the copy can swap without a flash.
   - Use something readable instantly, such as a non-HttpOnly cookie (`document.cookie`) or a `localStorage` flag that the auth flow sets on sign-in and clears on sign-out.
   - Do not `fetch()` or `await` anything here.
   - If the real session cookie is HttpOnly, have the auth flow also set a small readable flag cookie such as `mint_signed_in=1`, and check that flag.
2. **Never throw.** Keep it wrapped so any error means "not logged in". The caller already treats exceptions as "show default copy".
3. **Clear the cached session decision on sign-in.**
   - The script caches its decision for the browser session in `sessionStorage['mint_visit_session']`.
   - That cache is read *before* `isLoggedIn()` is checked, so someone who signs in mid-session would keep seeing the returning copy.
   - Fix it one of two ways:
     - call `sessionStorage.removeItem('mint_visit_session')` in the sign-in handler, or
     - move the `isLoggedIn()` check above the cache read in `decide()`.
4. **Leave alone:**
   - the storage keys `mint_first_visit` and `mint_visit_session`
   - the 7-day window
   - the `data-rv` markup in `index.html`

**Example:**

```js
function isLoggedIn() {
  try {
    return /(?:^|;\s*)mint_signed_in=1(?:;|$)/.test(document.cookie);
  } catch (e) {
    return false;
  }
}
```

**How to test:**
- Run `python3 -m http.server` and open `index.html`.
  - `?reset-visit` clears both keys.
  - `?returning=1` forces the returning view and `?returning=0` forces the default view.
  - Any of these params makes the decision log to the console.
- **Signed-out returning visitor:**
  1. Load once.
  2. Open a new tab or window.
  3. You should see "Welcome back" and "Ready to ship your first model?".
- **Signed-in visitor:**
  1. Set the signed-in flag.
  2. Clear `mint_visit_session` (or use a new session).
  3. Reload. You should see the default copy, and the console reason should be `logged in` when a debug param is present.
