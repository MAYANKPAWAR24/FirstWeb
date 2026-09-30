# PHASE 8 — QA Checklist & Rollout Strategy

Branch: `feat/premium-futuristic-evolution`
Companion documents: `docs/PHASE-1-PLAN.md` (analysis), this file (validation)

---

## 0. HOW TO USE THIS

Every check below is either **automated** (run it) or **manual** (do it by hand).
Do not skip the manual ones — the automated set cannot see a focus trap leak, a
frozen hover state, or a scroll jank.

**Before any deploy involving Phase 2 (data model), export the live JSONBin
record.** That is the only unrecoverable step in this whole migration.

---

## 1. DATA INTEGRITY — THE ONLY GATE THAT CAN LOSE DATA

The governing invariant: **an absent key means "this record predates the
feature, keep the local value"**, implemented once in `DataContext.tsx:SETTINGS_KEYS`.

### Verified automatically

`normalize.ts` and `sectionOrder.ts` are framework-free, so they were verified
directly rather than by hand — 60 assertions, all passing:

| Property | Result |
|---|---|
| All 11 new keys: absent → `undefined` (so the cloud merge keeps the local value) | 11/11 |
| All 11 new keys: present-but-junk → repaired field by field, never `undefined` | 11/11 |
| Every normalizer is idempotent (normalising twice is a fixed point) | 10/10 |
| Each of the 4 skill groups falls back independently | pass |
| An empty skill group falls back rather than rendering blank | pass |
| Blank `seoSettings.title` falls back rather than blanking the `<title>` | pass |
| Absent or junk `seoSettings.indexable` defaults to **true** | pass |
| Junk `siteUrl` trailing slash stripped; `@` stripped from the Twitter handle | 2/2 |
| `portfolioBlocks`: non-array → `[]`, id-less and duplicate-id entries dropped | 3/3 |
| `portfolioBlocks`: non-finite `order` coerced; `visible`/`featured` defaulted | 2/2 |
| `gameSettings`: unknown game ids filtered; empty order falls back | 2/2 |
| `animationSettings`: `enabled:false` forces `intensity:'off'` | pass |
| `footerSettings`: links with neither an anchor nor a URL are dropped | pass |
| `chatbotFAQs`: legacy `{keywords,response}` shape accepted; blanks dropped | 2/2 |
| `contactSettings`: whitespace email → `''` (no broken `mailto:`) | pass |
| `'extra'` expands to achievements/certificates/contact/community **in place** | pass |
| `'follow'` is dropped; unknown ids stripped; duplicates collapse | 3/3 |
| Missing ids appended, so a new section never reshuffles a saved layout | pass |
| `normalizeSectionOrder(DEFAULT)` is a fixed point | pass |
| No retired id (`extra`/`follow`) survives in the default order | pass |
| Visibility semantics unchanged: `true` means hidden, absent means visible | 2/2 |
| Every default order id is present in `TOGGLEABLE_BLOCKS` | pass |

### Still needs doing by hand

| # | Check | How | Pass |
|---|---|---|---|
| 1.1 | Old bin, no new keys | Point `.env.local` at a pre-change bin | Every new key falls back to seed; no `undefined` renders; no crash |
| 1.2 | New bin, all keys | Point at the live bin | Round-trips exactly |
| 1.3 | Partial keys | Edit the bin JSON, delete `seoSettings` only | That key defaults; the other nine are untouched |
| 1.4 | Junk values | Set `portfolioSettings: "hello"`, `portfolioBlocks: [{nope:1}]` | Normalized away; app still renders |
| 1.5 | Duplicate block ids | Two `portfolioBlocks` with the same `id` | Second is dropped, not silently merged |
| 1.6 | Offline | Block `/api/portfolio` in DevTools | Site renders from localStorage; `syncStatus` = offline; no data loss |
| 1.7 | Offline → online | Unblock, reload | Cloud record matches what was saved |
| 1.8 | Re-login | Log out, log in | Cloud record intact |
| 1.9 | Cross-tab (was R3) | Two tabs, admin in both, edit different sections in each | **No silent loss.** The scoped `PATCH` path re-reads before writing |
| 1.10 | Guestbook race | Submit a guestbook note while an admin saves settings | The note survives |
| 1.11 | Socials clobber (was R4) | Edit a social URL, then save the Profile tab | Both changes survive |
| 1.12 | Debounced write | Type in a social URL field rapidly | **One** PUT, not one per keystroke |
| 1.13 | Write flush | Type, then immediately close the tab | The last edit reaches the cloud (`pagehide` flush) |
| 1.14 | Section migration | Load a pre-Phase-3 record with `extra` in the order | `extra` expands to achievements/certificates/contact/community **in place**; `follow` drops cleanly |
| 1.15 | Old client → new server | Send `sectionOrder: ['extra','follow','profile']` to the API | Expands and normalises; nothing stripped |
| 1.16 | New id → old server | Confirm `validVisibility` on the deployed server | **Known risk (R5).** If a toggle is dropped, the server deploy is behind the client deploy |
| 1.17 | Auth preserved | Try to overwrite `__adminAuth` via PUT, `patch` and `import` | All three rejected; stored hash always re-attached from the record |
| 1.18 | Export → import | Export, change everything, import the backup | Identical record restored; `__adminAuth` untouched by the backup |

---

## 2. ADMIN CRUD

| # | Check | Pass |
|---|---|---|
| 2.1 | Every tab opens and renders | No blank tab, no crash |
| 2.2 | Add / edit / delete on every list | All three persist through a reload |
| 2.3 | **Delete asks for confirmation** (was R7) | ConfirmDialog appears; Cancel aborts; the row survives |
| 2.4 | Visibility toggle on every item | Hides publicly, keeps the record |
| 2.5 | Move up/down on every ordered list | Order persists; ends of list are disabled |
| 2.6 | Duplicate / clone | Copy gets a new id, appears directly after the source |
| 2.7 | Draft autosave | Open a form, type, reload, reopen → draft restored with a hint |
| 2.8 | Unsaved-changes guard | Close a dirty form → confirm; Escape does **not** close the whole panel (was R8) |
| 2.9 | Focus trap | Tab repeatedly inside a modal → focus never leaves |
| 2.10 | Focus restore | Close a modal → focus returns to the row that opened it |
| 2.11 | Escape layering | Admin open → open a modal → Escape closes **only** the modal |
| 2.12 | Validation | Empty required title → error toast, no record created |
| 2.13 | Toasts announced | Screen reader speaks the success/error toast (was R19) |
| 2.14 | Per-section reset | Reset Portfolio only → other sections untouched |
| 2.15 | Sync diagnostics | Shows status + last-synced time; offline warns clearly |
| 2.16 | Login gate | Logged out → **only** the password form renders (was R25) |
| 2.17 | Session expiry | Clear the cookie mid-session → next save surfaces an error, not a silent failure |
| 2.18 | Section Builder game dropdown | Lists all six games, from the registry |

---

## 3. RESPONSIVE

| Viewport | Width | Checks |
|---|---|---|
| iPhone SE | 320 | No horizontal scroll; nav drawer fits; cards not cramped; touch targets ≥44px |
| iPhone 12/13 | 375 | As above |
| iPhone Pro Max | 414 | As above |
| iPad | 768 | Card density 2-up; hero composition holds |
| iPad Pro | 1024 | Desktop nav kicks in at `lg`; grid 3-up |
| Laptop | 1440 | Max-width shell centred; no stretched text |
| Desktop | 1920 | Shell holds; atmosphere layers do not band |

- [ ] No horizontal scrollbar at any width
- [ ] CLS < 0.1 (DevTools → Performance → Layout Shifts)
- [ ] No element < 44×44 px that is a touch target
- [ ] iOS Safari: opening a dialog does not jump the page when the URL bar collapses
- [ ] iOS Safari: `100dvh` panels fit with the bar expanded **and** collapsed
- [ ] Tablet has no awkward in-between spacing at 800–1000px

---

## 4. REDUCED MOTION & MOTION SETTINGS

| # | Check | Pass |
|---|---|---|
| 4.1 | OS "reduce motion" on | **Every** reveal is instant and visible; no particle drift; no orbital rotation |
| 4.2 | OS reduce motion + scroll | No jank from suppressed-but-running animations |
| 4.3 | Admin → Motion → intensity `off` | Same as 4.1, driven by `data-motion="off"` on `<html>` |
| 4.4 | intensity `subtle` | Reveals + hovers remain; ambient layers and pointer effects gone |
| 4.5 | `ambientEffects` off | Hero particles and orbital traces do not animate |
| 4.6 | `cursorEffects` off | Custom cursor never mounts; native cursor returns |
| 4.7 | `sectionReveal` off | All content visible immediately |
| 4.8 | `heroParallax` off | No pointer-driven hero drift |
| 4.9 | No dead animation hooks | `grep -r "className=\"reveal\|hero-enter\|data-parallax" src/` returns nothing |
| 4.10 | Reveal never strands content | With JS disabled or the observer unavailable, everything is visible |
| 4.11 | Card tilt off on touch | Tapping a card never rotates it |
| 4.12 | Custom cursor never blocks clicks | Every button, link and card is clickable (this regressed twice before) |

---

## 5. ACCESSIBILITY

Automated (axe DevTools or Lighthouse, on the public page and with the admin open):

- [ ] Zero critical or serious violations
- [ ] All form controls have accessible names
- [ ] All images have `alt` (decorative ones use `alt=""`)
- [ ] Colour contrast ≥ 4.5:1 body, ≥ 3:1 large text
- [ ] No duplicate `id` values

Manual:

- [ ] **Exactly one `<h1>`** on the page
- [ ] Heading order is `h1 → h2 → h3` with no skips
- [ ] Admin headings are excluded from the public outline (`role="dialog"` + `aria-modal`)
- [ ] **Every media card is keyboard-reachable** (was R18 — the grid was a bare `div onClick`)
- [ ] **Toasts are announced** (`role="status"`, `aria-live="polite"`)
- [ ] `:focus-visible` ring visible on every interactive element, including inputs (was R21 — `.premium-input:focus` removed it)
- [ ] Focus never escapes an open dialog
- [ ] Focus returns to the trigger on close
- [ ] Background is `inert` while a dialog is open
- [ ] Nav drawer: Escape closes, focus trapped, `aria-expanded` correct
- [ ] Chatbot: `role="log"`, `aria-live`, focus returns to the launcher
- [ ] Every game fully playable by keyboard alone
- [ ] Tic-Tac-Toe: `role="grid"` with real `row`/`gridcell`; filled cells use `aria-disabled`, not `disabled`
- [ ] Snake: status and score in a live region; arrow keys do not steal focus from the D-pad button
- [ ] 200% zoom, no clipped text, no horizontal scroll
- [ ] Screen-reader pass: VoiceOver or NVDA, hero → nav → one dialog → chatbot

---

## 6. SEO

- [ ] `dist/index.html` contains the prerendered block (`<!--prerendered-->`)
- [ ] **Text extraction of the prerendered HTML shows the name, role, bio, every section heading, and internal links**
- [ ] Word count > 250 (was effectively 0)
- [ ] Internal anchor links ≥ 8 (was 3)
- [ ] Exactly one `<h1>` in the static HTML
- [ ] `<title>` matches the saved `seoSettings.title` at runtime
- [ ] `<meta name="description">` matches `seoSettings.description`
- [ ] `rel="canonical"` resolves to the configured site URL
- [ ] OG + Twitter tags complete, including `og:image` and `twitter:image`
- [ ] JSON-LD parses; `Person`, `WebSite`, `ProfilePage` present; validate at validator.schema.org
- [ ] `seoSettings.jsonLdEnabled = false` → the `<script data-seo="jsonld">` is removed
- [ ] `seoSettings.indexable = false` → `noindex, nofollow` emitted; `true` → `index, follow`
- [ ] `dist/robots.txt` and `dist/sitemap.xml` exist and are served
- [ ] `dist/apple-touch-icon.png`, `og-image.png`, `favicon.svg`, `site.webmanifest` exist
- [ ] Lighthouse SEO = 100
- [ ] HTML validator: no errors (was: nested `<section>` inside `<section>`, invalid `role="grid"`)
- [ ] `vercel.json` rewrite keeps `/api/*` reachable (was: no config at all)
- [ ] Deep link to `/#portfolio` loads on a hard refresh

---

## 7. CLOUD SYNC & API

`api/portfolio.js` is framework-free, so it was verified directly against a
mocked JSONBin — 53 assertions, all passing.

| Property | Result |
|---|---|
| GET never returns `__adminAuth` or `adminPassword` | 2/2 |
| `__adminAuth` is re-attached from the **stored** hash on PUT, patch and import | 3/3 |
| `adminPassword` is never written | pass |
| Forged and malformed session cookies rejected | 2/2 |
| Cookie is an HMAC, not the password; HttpOnly + SameSite=Lax + Path=/ | 2/2 |
| PUT / import / change-password without a session → 401 | 3/3 |
| Login rate limited, and the limit is **per IP** | 2/2 |
| `extra` expands, `follow` drops, unknown ids strip, all 10 sections present | 4/4 |
| Legacy `guestbook` visibility key maps to `community` | pass |
| Absent visibility key stays absent (absent == visible) | pass |
| Scoped `patch` writes only its key and preserves the rest | 3/3 |
| Guestbook trims, strips HTML, derives an avatar, clamps to 500 chars | 4/4 |
| Honeypot returns 200 with an empty entry and stores nothing | 2/2 |
| `PORTFOLIO_GUESTBOOK_AUTOAPPROVE=false` marks entries unapproved | pass |
| Guestbook and visitor are rate limited | 2/2 |
| Change-password rejects short values and stores a hash, not plaintext | 3/3 |
| Missing credentials → 503 naming the env var; rejected → 502 naming it | 2/2 |
| 405 on unsupported method, 400 on unknown action and bad payload | 3/3 |

Still worth confirming against a **real** bin:

- [ ] GET returns `sectionOrder` + `sectionVisibility`, never `__adminAuth`
- [ ] PUT without a session → 401
- [ ] POST `login` with a wrong password → 401, no session cookie
- [ ] POST `guestbook` 6× in a minute → 429 on the 6th
- [ ] POST `visitor` rate-limited
- [ ] Honeypot field filled → 200 with an empty entry, **nothing stored**
- [ ] Guestbook message containing `<script>` → stored with tags stripped
- [ ] `PORTFOLIO_GUESTBOOK_AUTOAPPROVE=false` → new entries hidden until approved
- [ ] Scoped `patch` PUT touches only the keys sent
- [ ] POST `import` without a session → 401
- [ ] `__adminAuth` survives login, change-password, PUT, patch and import

---

## 8. CHATBOT

- [ ] Assistant opens, sends, closes; focus returns to the launcher
- [ ] "who is Mayank", "what has he built", "where can I read the writing", "how can I contact" all hit their FAQ
- [ ] **No flirt entry, no flattery copy** (removed)
- [ ] Answers carry a "Take me to …" button, and it scrolls to the right section
- [ ] A jump button never points at a hidden section
- [ ] Source tag ("Portfolio") shows on FAQ answers
- [ ] Quick replies and section chips are admin-editable and persist
- [ ] Disabling `chatbotSettings.enabled` removes the widget entirely
- [ ] `fallbackStyle: minimal` / `professional` tone changes the fallback copy
- [ ] Session survives reload; capped at 60 messages
- [ ] Private-browsing storage failure does not throw
- [ ] `role="log"` + `aria-live` announces bot replies
- [ ] Mobile 320px: panel fits, input usable, chips scroll horizontally

---

## 9. GAMES

For each of the six games:

- [ ] Loads lazily; chunk not in the initial bundle
- [ ] Chunk is fetched near-viewport, not at page load
- [ ] Skeleton matches the real board height → no layout shift
- [ ] Fully playable by keyboard
- [ ] Fully playable by touch
- [ ] Reduced motion does not break it
- [ ] Auto-pauses when off-screen or the tab is hidden

Per game:

- [ ] **Tic-Tac-Toe** — smart mode never loses on 3×3; 4×4 board works; medium beats random; difficulty switches take effect
- [ ] **Snake** — three difficulties differ; arrow keys and D-pad both work; **no silent restart from an arrow key after game over** (was a bug); pause on tab hide; best score persists; canvas sharp on retina
- [ ] **Memory Match** — pairs must be distinguishable without colour alone
- [ ] **2048** — swipe and arrow keys both work; rapid input does not drop or double-apply a move; undo works; win overlay
- [ ] **Rock Paper Scissors** — first to 5; opponent does not repeat identically every round
- [ ] **Reaction Tap** — early tap punished; randomised 1200–3200ms delay; best time persists

### Tic-Tac-Toe engine — already verified

`src/components/games/engine.ts` is pure and framework-free, so it was verified
directly against an independently written exhaustive solver rather than by hand.

| Property | Result |
|---|---|
| 3×3 smart vs exhaustive solver | **400 games: 0 wins, 400 draws, 0 losses** — provably optimal |
| 3×3 smart blocks all immediate threats | 8/8 threat positions |
| 4×4 smart takes an available win | 60/60 |
| 4×4 smart blocks the only defence | 40/40 |
| 4×4 smart, 12 cells empty (worst case) | **5.3 ms per move** |
| 4×4 medium, 12 cells empty | 0.3 ms per move |
| 3×3 smart, empty board | 12 ms (one-off; the whole game fits in one search) |
| `easy` always returns a legal move | 500/500 |
| Full board returns `null` | pass |

Three real bugs were found and fixed by this exercise, all of which would have
shipped as "the AI is dumb" with no obvious cause:

1. **Win length was `size + 1` instead of `size`.** No diagonal could ever reach
   the required length, so *every diagonal win was undetectable* — the AI could
   neither create nor block one.
2. **The transposition table cached alpha-beta *bounds* as exact values.** The
   engine still returned legal moves, it just silently stopped finding wins and
   blocks. Only full-window nodes are cached now.
3. **4×4 `smart` searched to `Infinity`.** A full 16-ply search from the empty
   board does not terminate in useful time, so the mode would have frozen the
   tab. Depth is now table-driven, and 4×4 sits at 5 because every tactic that
   matters is visible within 3 plies.

Note that 4×4 is deliberately *not* guaranteed optimal at depth 5 — that is the
trade for a 5 ms move. Its tactics are verified above.

Plus:

- [ ] Per-game enable/disable in Admin → Games persists
- [ ] Featured game renders inline; the rest are cards
- [ ] Hiding all games hides the whole section
- [ ] A legacy custom section with `game: 'tic-tac-toe'` still renders

### Chatbot engine — already verified

`src/lib/chatbot.ts` is framework-free, so it was verified directly rather than by hand.

| Property | Result |
|---|---|
| 18 recruiter/reader questions route to the right FAQ | 18/18 |
| Those answers carry the right section-jump action | 6/6 |
| Word-boundary guard: `architecture` does not trigger `hi` | pass |
| Word-boundary guard: `support` does not trigger `sup` | pass |
| Flirt entry and flattery copy are gone | pass |
| Off-topic entries (black holes, pyramids, stoicism) are gone | pass |
| Partial admin override does **not** delete other defaults | pass (this was the old shadowing bug) |
| Complete override removes exactly that one default | pass |
| Absent / all-disabled / blank admin FAQ set falls back to the embedded set | 3/3 |
| Legacy `{ keywords, response }` payload shape still accepted | pass |
| Fallback reply carries no bogus section action | pass |
| Deep conversation → multi-turn reply with a contact action | pass |
| Empty message → greeting | pass |

The greeting and the "what is this site" overview deliberately have **no** section
target — a jump button on "Hi there" would be noise.

---

## 10. PERFORMANCE

- [ ] `npm run build` → main entry chunk < 200 KB (was 332 KB)
- [ ] `react`, `gsap`, `icons` split into their own chunks
- [ ] Admin chunk never fetched on a public page load
- [ ] Game chunks not fetched until near-viewport
- [ ] Lighthouse Performance ≥ 90 desktop, ≥ 80 mobile
- [ ] No long task > 50 ms during scroll
- [ ] ≥ 55 FPS scrolling on a mid-range phone
- [ ] `backdrop-filter` never active at ≤1023px (check DevTools computed styles)
- [ ] Site grain and grid hidden at ≤1023px
- [ ] Fonts load without blocking render (`media="print"` swap in `index.html`)
- [ ] No `transform` on `<body>` or `<main>` (breaks every fixed overlay)
- [ ] DevTools Rendering → Paint flashing shows no unexpected repaint on scroll

---

## 11. BROWSER COMPATIBILITY

- [ ] Chrome, Safari, Firefox, Edge — current versions
- [ ] iOS Safari 16+ and Android Chrome current
- [ ] Safari < 16: Snake `roundRect` fallback path renders
- [ ] `backdrop-filter` absent → panels stay legible (opaque backgrounds, not transparent)
- [ ] `@supports not (mask-composite)` → card sheen hidden, not a solid bar
- [ ] `IntersectionObserver` absent → all reveals visible
- [ ] `matchMedia` absent → motion defaults on, nothing crashes
- [ ] No `dvh` support → panels still usable (`max-height` in `vh`)
- [ ] Deep link + hard refresh works on every browser

---

## 12. EXPORT / BACKUP / RESTORE

- [ ] Export downloads valid JSON containing `sectionOrder` + `sectionVisibility`
- [ ] Import accepts that file and restores it
- [ ] Import warns before overwriting
- [ ] Import preserves `__adminAuth`
- [ ] Per-section reset for all 19 resettable keys
- [ ] Full reset still works, with confirmation

---

## 13. VISUAL CONSISTENCY

- [ ] One accent (teal), one secondary (iris), one editorial tone (ember), neutrals elsewhere
- [ ] One elevation ladder; no ad-hoc shadows
- [ ] One radius scale (`rounded-card` / `rounded-panel`)
- [ ] One easing vocabulary
- [ ] **No hover state is frozen** — hover every coloured button and confirm the colour actually changes (the deleted `.premium-bg` shim had `[class*="text-cyan-"]` beating `hover:` rules, so several buttons rendered permanently in their hover colour)
- [ ] Eyebrow labels are one shared class, not seven copies
- [ ] Every section header uses `<Section>`
- [ ] Body text never uses a clipped gradient (selection would be invisible)
- [ ] No dead CSS: `aurora-orb`, `noise-overlay`, `animate-fade-up`, `shimmer` are gone

---

## ROLLOUT

### Order

1. **Export the live JSONBin record.** Keep it. This is the only step that cannot be undone.
2. Merge this branch. It ships the new server allowlist **with** the new client — the single hardest dependency in the migration (1.16).
3. Deploy, then immediately confirm: admin login, one content edit, one reload, sync indicator green.
4. Watch the sync status and admin save behaviour for the first session of real use.

### Why that order

Phase 2 (data model) is the only phase that can lose data, and its safety depends
on the server allowlist being updated in the same deploy. Splitting it across two
deploys reintroduces risk R5, where `validVisibility` silently strips a new toggle
id on the first save.

### Reversible independently

| Change | Blast radius | Revert |
|---|---|---|
| Data model + normalizers | Every read path | Revert the commit; old records still load (all new keys are optional) |
| Server allowlists | Section order + visibility only | Revert `api/portfolio.js`; the client falls back to defaults |
| Section promotion | Public structure only | Revert `sectionOrder.ts`; the `'extra'` expansion handles both shapes |
| Prerender + SEO assets | Static HTML only | Remove the plugin from `vite.config.ts`; `index.html` still has a `<noscript>` |
| Design tokens + `.premium-bg` removal | Every visual | Revert `index.css` + `tailwind.config.js` |
| Chatbot | Widget only | Revert `chatbot.ts` + `AIChatbot.tsx` |
| Games | Games section only | Revert the games tree; `MiniGameKind` keeps the original two valid |

### Post-deploy, in the first hour

1. Admin → SEO: set the real site URL, title, description, and OG image.
2. Admin → Contact: set a **real** email. It ships empty on purpose — shipping `example.com` reads as a broken contact.
3. Admin → Study Material: attach real files. Entries without one are labelled as drafts rather than linking to nowhere.
4. Admin → Achievements / Profile: review the demo seed content. Awards and publication claims are demo values, not verified facts, and are presented publicly.
5. Toggle `seoSettings.indexable` off while reviewing, then on when ready.

### Known limitation

`visitorCount` ships at `0` instead of the previous fake `1247`, and `studyMaterials`
carry no `url`. Both were deliberate: a visitor counter seeded with a made-up
number and four dead `#` download links are the kind of detail a recruiter notices.
