# MAYANK PAWAR — Personal Platform

A cloud-synced personal site that works as both a **recruiter-facing portfolio** and a **reading room for published writing**. Built with React 18, TypeScript, Vite and Tailwind, backed by a serverless JSONBin proxy. Every section is editable from an in-page admin dashboard — no rebuild required.

```
npm install
npm run dev      # http://localhost:5173
```

---

## What it does

| | |
|---|---|
| **Portfolio layer** | Professional summary, availability, case studies, resume download, contact CTA |
| **Resume** | Education with marks, experience timeline, languages, skills, certificates, achievements — plus custom text blocks you add yourself |
| **Literature** | Poems and novels with a distraction-free reader, reading progress, related works, share and copy |
| **Media** | Photos, video and audio with a full-screen viewer and keyboard navigation |
| **Play Break** | 8 self-contained mini-games, each lazy-loaded, with per-game leaderboards |
| **Assistant** | A site guide that answers in English or Hinglish, across three tones, and can jump you to any section |
| **Admin CMS** | 19 tabs covering every field on the site, with draft autosave, ordering, visibility and per-section reset |

---

## Stack

| | |
|---|---|
| Framework | React 18.3 · TypeScript 5.5 (strict) · Vite 5.4 |
| Styling | Tailwind 3.4 + a 1,341-line token layer in `src/index.css` |
| Icons | `lucide-react` |
| Motion | `gsap` (2 effects) + CSS transitions |
| Cloud | JSONBin, behind a Vercel serverless proxy at `api/portfolio.js` |

**Four runtime dependencies.** No UI kit, no state library, no animation library beyond GSAP, no component framework. The Tic-Tac-Toe AI, the particle field, the search index, the sound synthesis and the 3D chatbot are all hand-written.

---

## Architecture

```
Browser ──► /api/portfolio ──► JSONBin
   │              │
   │              ├─ strips __adminAuth before returning anything
   │              ├─ HMAC-signed HttpOnly session cookie for admin writes
   │              └─ allowlists every section id it will accept
   │
   ├─ localStorage mirror  (always written, survives the cloud being down)
   └─ DataContext          single source of truth for all content
```

### The migration rule

Every content key added since the first release is **optional on the wire**, and one rule governs all of them:

> **A key that is absent from the cloud snapshot means "this record predates the feature — keep whatever the client already has."**

Implemented once, as a loop over `SETTINGS_KEYS` in `src/lib/DataContext.tsx`. A key that *is* present wins, even if it is empty.

This exists because the obvious alternative — `snapshot.x ?? seed.x` — silently replaces an admin's saved value with a default every time an older record is read. `src/lib/normalize.ts` returns `undefined` for absent keys specifically so the two cases stay distinguishable.

### Section registry

`src/lib/sectionOrder.ts` is the single source of truth for section ids, labels and ordering. `api/portfolio.js` mirrors the allowlist — and **both must ship together**, because the server silently strips any id it does not recognise.

Retired ids are absorbed rather than dropped, so upgrading never loses content:

| Old | Becomes |
|---|---|
| `extra` | `achievements`, `certificates`, `contact`, `community` |
| `follow` | folded into the Contact section's social grid |

---

## Project layout

```
api/portfolio.js          serverless proxy: auth, allowlists, rate limits, moderation
scripts/compat-scan.mjs   45-check cross-browser guard scan
src/
  App.tsx                 section registry → renderer map, head sync, motion flags
  components/
    Overlay.tsx           the one dialog primitive: focus trap, Escape stack, scroll lock
    Reveal.tsx            shared IntersectionObserver reveal system
    Section.tsx           the one section shell
    SocialGrid.tsx        32-platform social cards
    admin/                24 files, 19 panels, one tab registry
    games/                8 games + registry + a pure Tic-Tac-Toe engine
  lib/
    DataContext.tsx       all content state, cloud merge, debounced writes
    normalize.ts          migration-safe normalisers
    gameScores.ts         localStorage leaderboards (deliberately not in the cloud)
    socialPlatforms.ts    the 32-platform catalogue
    chatbotVoice.ts       language and tone layers
  sections/               14 public sections
```

### Size

| Group | Files | Lines |
|---|---:|---:|
| `src/components/admin/` | 24 | 5,319 |
| `src/components/games/` | 9 | 2,321 |
| `src/components/` (rest) | 14 | 2,639 |
| `src/sections/` | 14 | 3,082 |
| `src/lib/` | 15 | 4,034 |
| `src/hooks/` | 3 | 189 |
| `api/` | 1 | 387 |
| **Source total** | **86** | **19,401** |

`src/index.css` 1,341 · `scripts/` 145

### Build output

| Chunk | Size | Gzipped |
|---|---:|---:|
| `react` | 137 KB | 45 KB |
| `index` (entry) | 202 KB | 59 KB |
| CSS | 69 KB | 14 KB |
| `gsap` | 69 KB | 28 KB |
| `icons` | 38 KB | 8 KB |
| `AdminPanel` | 124 KB | 32 KB |
| each game | 4–8 KB | 2–3 KB |

Every game and the admin dashboard are separate lazy chunks. A visitor who never opens Play Break never downloads a byte of it.

---

## Setup

### 1. Environment

```bash
cp .env.example .env.local
```

| Variable | Required | Purpose |
|---|---|---|
| `JSONBIN_BIN_ID` | for cloud | Your JSONBin bin id |
| `JSONBIN_MASTER_KEY` | for cloud | Your JSONBin master key |
| `PORTFOLIO_SESSION_SECRET` | for admin | Random string; signs the session cookie |
| `PORTFOLIO_ADMIN_PASSWORD` | optional | Fallback password before a stored hash exists |
| `PORTFOLIO_GUESTBOOK_AUTOAPPROVE` | no | Set `false` to hold entries for moderation |


Without the JSONBin pair the site still runs — it falls back to seed data plus `localStorage`, and the sync indicator reads *offline*.

### 2. Deploy

```bash
npm run build
```

Vercel picks up `api/portfolio.js` as a serverless function. Set the same environment variables there.

> Deploy the API and the site **together**. The server allowlists section ids, so a server running older code than the client will strip new ones on the first save.

---

## Commands

| | |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | typecheck, then production build |
| `npm run preview` | serve the build |
| `npm run lint` | eslint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run verify` | typecheck + lint + build |
| `npm run compat` | build, then the cross-browser guard scan |

---

## Notes on a few decisions

**Shared scores live in the content record under a `leaderboard` key**, so global boards work with the setup that already exists — no second bin, no extra configuration. Two rules make that safe:

1. A score write re-reads the record immediately before writing and changes exactly one key. It never writes back a stale copy of the content.
2. An **admin save never overwrites the board.** It unions the stored board with whatever the browser sent, keyed by entry id. Without this, editing one poem while the panel was open would silently delete every score submitted in the meantime.

Entries are appended rather than replacing a ranked board. JSONBin has no transactions, so two simultaneous submissions still cost one of them a write — but append-only means the loser loses only their own row, because every client computes the top N itself. Repeat players collapse to their best score, and a score is only accepted when it *strictly* beats the current last place, so ties cannot churn an existing row.

**Sound is opt-in.** Every sound is synthesised from oscillators, so there are no audio files to fetch and no `AudioContext` is constructed until a visitor enables sound and interacts. The choice persists per device.

**The prerender exists.** The app is client-rendered, so without a build-time step a non-JavaScript crawler reads an empty `<div>`. `scripts/prerender.ts` injects ~740 words of real, semantic content into `dist/index.html`; React then mounts over it.

**Backdrops are expensive.** `backdrop-filter` is dropped below 1024px and on iOS, where it repaints on every scroll frame, with the surface alpha raised to preserve contrast.

---

## Verification

Correctness claims in this repo are tested, not asserted:

- **Tic-Tac-Toe engine** — 400 games against an independently written exhaustive solver: 0 losses, all draws. Three real bugs were found this way, including a win length of `size + 1` that made **every diagonal win undetectable**, and a transposition table caching alpha-beta bounds as exact values.
- **Migration** — an old-format record run through the real `api/portfolio.js`: 40 checks confirming poems, bio, guestbook notes, cover gradients and an unknown legacy key all survive a save untouched.
- **Data model** — 53 assertions on normalisers: the absent-key invariant, idempotence, dense ordering, Unicode round-tripping.
- **Leaderboards** — 52 assertions: name sanitising, per-player bests, corrupt-storage recovery, private-mode safety.
- **Chatbot** — 32 assertions across six language/tone combinations.
- **Accessibility** — a structural audit of the server-rendered HTML: heading hierarchy, accessible names, duplicate ids, dead anchors, invalid nesting.

---

## Credits

Written and built by [MAYANK PAWAR](https://github.com/MAYANKPAWAR24).