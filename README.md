# MAYANK PAWAR — Personal Portfolio

An Apple-inspired, cloud-synced portfolio built with **React 18 + TypeScript + Vite 5 + Tailwind CSS 3**, backed by a serverless JSONBin proxy. Everything is editable at runtime from an in-page admin dashboard — no rebuild required.

---

## 📊 Lines of Code Report

### Total

| Category | Lines |
|---|---:|
| **Total (source: `src/` + `api/`)** | **7,499** |
| **Total (incl. CSS + HTML)** | **8,386** |
| Files (TS / TSX / JS) | 35 |
| Design system CSS | 865 |
| Entry HTML | 22 |

### By module group

| Group | Files | Lines | % of source |
|---|---:|---:|---:|
| `src/components/` | 10 | 3,406 | 45.4% |
| `src/sections/` | 9 | 1,712 | 22.8% |
| `src/lib/` | 11 | 1,914 | 25.5% |
| `api/` (serverless) | 2 | 252 | 3.4% |
| `src/App.tsx` + `main.tsx` | 2 | 173 | 2.3% |
| **Source total** | **34** | **7,457** | |
| `src/index.css` | 1 | 865 | — |
| `index.html` | 1 | 22 | — |
| **Grand total** | **36** | **8,344** | |

### Code vs. comments vs. blanks

| Bucket | Lines | % |
|---|---:|---:|
| Code (non-blank, non-comment) | ~5,380 | 67% |
| Comments & documentation | ~1,720 | 21% |
| Blank lines | ~1,240 | 12% |

> High comment ratio is intentional — the perf-critical files (`CustomCursor`, `index.css`, `DataContext`, `api/portfolio.js`) document *why*, not *what*.

### Every file, largest first

| # | File | Lines | Purpose |
|---:|---|---:|---|
| 1 | `src/components/AdminPanel.tsx` | 1,794 | Full admin dashboard (11 tabs) |
| 2 | `src/index.css` | 865 | Design system + animations |
| 3 | `src/lib/DataContext.tsx` | 606 | Global state + cloud sync |
| 4 | `src/sections/Extra.tsx` | 366 | Guestbook, contact, certs, visitors |
| 5 | `src/components/AIChatbot.tsx` | 351 | Floating AI chatbot widget |
| 6 | `src/sections/Literature.tsx` | 337 | Poems/novels + reader modal |
| 7 | `src/components/games/Snake.tsx` | 325 | Canvas snake game |
| 8 | `src/lib/chatbot.ts` | 313 | Local keyword engine + 18 FAQs |
| 9 | `src/components/CustomCursor.tsx` | 278 | rAF/LERP custom cursor |
| 10 | `src/sections/CustomSections.tsx` | 266 | Runtime-built section renderer |
| 11 | `src/lib/seedData.ts` | 260 | Default portfolio content |
| 12 | `api/portfolio.js` | 237 | JSONBin serverless proxy |
| 13 | `src/sections/Media.tsx` | 229 | Photos/videos/music + lightbox |
| 14 | `src/components/Navigation.tsx` | 209 | Nav + search + mobile menu |
| 15 | `src/App.tsx` | 163 | Section orchestration |
| 16 | `src/lib/types.ts` | 149 | TypeScript data model |
| 17 | `src/sections/StudyMaterial.tsx` | 143 | Downloadable resources |
| 18 | `src/components/games/TicTacToe.tsx` | 140 | Tic-tac-toe game |
| 19 | `src/sections/Achievements.tsx` | 109 | Timeline achievements |
| 20 | `src/sections/Profile.tsx` | 101 | Bio, skills, highlights |
| 21 | `src/sections/Hero.tsx` | 97 | Landing section |
| 22 | `src/lib/sectionOrder.ts` | 97 | Section order + visibility |
| 23 | `src/lib/utils.ts` | 78 | Shared helpers |
| 24 | `src/lib/search.ts` | 77 | Portfolio search |
| 25 | `src/components/HeroAtmosphere.tsx` | 76 | SVG particle field |
| 26 | `src/lib/ToastContext.tsx` | 71 | Toast notifications |
| 27 | `src/lib/sound.ts` | 67 | WebAudio SFX (no assets) |
| 28 | `src/sections/FollowMe.tsx` | 64 | Social links grid |
| 29 | `src/lib/cloudData.ts` | 60 | Cloud API client |
| 30 | `src/hooks/useResponsiveItemLimit.ts` | 41 | Responsive "See all" limit |
| 31 | `src/components/ReadingProgress.tsx` | 36 | Scroll progress bar |
| 32 | `api/portfolio.d.ts` | 15 | API types |
| 33 | `src/main.tsx` | 10 | React entry |
| 34 | `src/vite-env.d.ts` | 1 | Vite ambient types |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│  Browser                                             │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │ ToastProvider│─▶│ DataProvider │  42-member ctx   │
│  └──────────────┘  └──────┬───────┘                 │
│                          │ fetch /api/portfolio     │
│  ┌───────────────────────┴──────────────────────┐   │
│  │  AppContent  → section order map + modals    │   │
│  │  CustomCursor · ReadingProgress · Navigation  │   │
│  │  Hero → Profile → Literature → Media → …     │   │
│  │  AIChatbot · CustomSections (lazy)           │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────┘
                          │ HTTPS (JSON only)
┌─────────────────────────▼───────────────────────────┐
│  Vercel Serverless  api/portfolio.js                │
│  • session cookie (HMAC-SHA256, 8h TTL)             │
│  • strips __adminAuth before responding              │
│  • validates order/visibility on every write        │
└─────────────────────────┬───────────────────────────┘
                          │ X-Master-Key
                    ┌─────▼─────┐
                    │  JSONBin  │
                    └───────────┘
```

**Layer rules**

- **State** — one `DataProvider`. Sections are pure, props-driven; no section touches the cloud directly.
- **Persistence** — localStorage is the instant mirror (`portfolio_data_v1`), cloud is the durable copy. Every render passes through `normalizeData()`, so a corrupt or ancient record can never crash the page.
- **Writes** — serialized through a promise chain in `cloudData.ts` (no overlapping PUTs), not debounced.
- **Fallbacks** — every new key defaults to `[]`/`{}`; older JSONBin records load unchanged.

---

## 🧩 Section-Wise Report (`src/sections/`)

| Section | Lines | ID | Props | Notes |
|---|---:|---|---|---|
| `Hero.tsx` | 97 | `home` | `profile`, `visitorCount`, `onNavigate` | Time-based greeting, SVG atmosphere, parallax wordmark, stat grid, visitor counter. Always rendered. |
| `Profile.tsx` | 101 | `profile` | `profile` | TiltCard photo + About / Skills / Highlights. Staggered skill-pill animation. |
| `Literature.tsx` | 337 | `literature` | `poems`, `searchTarget` | Type filters + text search, GSAP fanned-deck hover, **GSAP-free `ReadingModal`** with reading progress, copy, share. |
| `Media.tsx` | 229 | `media` | `items`, `searchTarget` | Photo/video/music filter, lazy images, `MediaLightbox`, music placeholder on image error. |
| `StudyMaterial.tsx` | 143 | `study` | `materials`, `searchTarget` | File-type icons/colors, tag chips, download with empty-link toast. |
| `Achievements.tsx` | 109 | `achievements` | `achievements`, `searchTarget` | Alternating timeline, 3 cycling node colors, category icon map. |
| `Extra.tsx` | 366 | `extra` | `searchTarget`, `showAchievements` | Most complex: guestbook (approve/delete), `mailto:` contact, visitor card, certificate lightbox, footer. |
| `FollowMe.tsx` | 64 | `follow` | `socials` | Filters to visible + valid `http(s)` URLs, 10-icon map, 2/4/8-col grid. |
| `CustomSections.tsx` | 266 | dynamic | `sections` | Renders admin-built sections: `text` (escape-safe markdown subset), `media`, `widget` (JSON card grid, max 12), `game` (lazy). |

**Section order** is admin-controlled and persisted separately (`portfolio_section_order_v2`). **Visibility** is a per-block map — 6 sections + 5 sub-blocks (`achievements`, `certificates`, `guestbook`, `contact`, `visitors`).

---

## 🧱 Component-Wise Report (`src/components/`)

| Component | Lines | Props | Notes |
|---|---:|---|---|
| `AdminPanel.tsx` | 1,794 | `open`, `onClose`, `sectionOrder`, `onSectionOrderChange` | Lazy-loaded. 11 tabs: Literature, Media, Study Material, Achievements, Certificates, Guestbook, Profile, Section Order, Section Builder, Chatbot Manager, Settings. Includes PBKDF2-free local auth gate, per-keystroke form drafts, JSON export, reset-to-defaults. |
| `AIChatbot.tsx` | 351 | — | Zero-cost widget: greeting popup, quick-reply chips, typing indicator, sessionStorage thread, DM redirect. |
| `CustomCursor.tsx` | 278 | — | Portal to `<body>`, rAF loop, frame-rate-independent LERP, fully inert (`pointer-events: none`), hot-swaps on reduced-motion / pointer-type change. |
| `Navigation.tsx` | 209 | `onNavigate`, `data`, `onSearchSelect`, `activeSection`, `soundOn`, `onToggleSound` | Sticky glass nav, live search over 5 content kinds (respects visibility), rAF-coalesced scroll state, full-screen mobile menu. |
| `VideoEmbed.tsx` | 116 | `url`, `title` | `VideoPlayer`, `MediaPreview`, `ExternalLinkCard` — embed vs. native file vs. link card. |
| `TiltCard.tsx` | 81 | `children`, `className`, `intensity`, `glow`, `onClick` | rAF-coalesced 3D tilt, keyboard-accessible when clickable. |
| `HeroAtmosphere.tsx` | 76 | — | SVG dashed traces + 10 particles, GSAP yoyo tweens, `gsap.quickTo` pointer parallax. |
| `ReadingProgress.tsx` | 36 | — | Passive scroll listener, writes `transform` directly to the DOM — **zero React re-renders**. |
| `games/TicTacToe.tsx` | 140 | — | 8-line winner table, beatable AI, ARIA grid, score persistence in-state. |
| `games/Snake.tsx` | 325 | — | Canvas renderer, rAF loop repaints without re-rendering React, `IntersectionObserver` + `visibilitychange` auto-pause, D-pad + arrows + WASD, waits for explicit Start. |

---

## 🧠 Library Report (`src/lib/`)

| Module | Lines | Exports |
|---|---:|---|
| `DataContext.tsx` | 606 | `DataProvider`, `useData` — 5 state fields + 37 methods, cloud sync, normalization, visitor counter, drafts |
| `chatbot.ts` | 313 | `DEFAULT_CHATBOT_FAQS` (18), `getSmartChatResponse`, `resolveChatReply`, `mergeChatbotFAQs`, `QUICK_REPLIES`, `MULTI_TURN_DM_FALLBACK`, `WITTY_FALLBACKS` |
| `seedData.ts` | 260 | `seedData` — default profile, 5 poems, 3 media, study materials, achievements, certificates, guestbook |
| `types.ts` | 149 | 12 interfaces, 5 type aliases, 2 const arrays |
| `media.ts` | 136 | `resolveVideoSource`, `extractYouTubeId`, `extractVimeoId` (internal), `normalizeUrl`, `isDirectVideoUrl/AudioUrl`, `isImageUrl`, `isEmbeddableVideoUrl` |
| `sectionOrder.ts` | 97 | `PUBLIC_SECTIONS`, `TOGGLEABLE_BLOCKS`, `loadSectionOrder`, `saveSectionOrder`, `loadSectionVisibility`, `isSectionVisible` |
| `utils.ts` | 78 | `uid`, `formatDate`, `cls`, `downloadJSON`, `copyToClipboard`, `lockPageScroll` |
| `search.ts` | 77 | `searchPortfolio` — profile + 4 content kinds |
| `ToastContext.tsx` | 71 | `ToastProvider`, `useToast`, `ToastContainer` (3.5s auto-dismiss) |
| `sound.ts` | 67 | `sounds.{click,hover,open,close,success,error,toggle}`, `setSoundEnabled` — synthesized WebAudio, zero files |
| `cloudData.ts` | 60 | `fetchCloudSnapshot`, `saveCloudSnapshot`, `loginCloudAdmin`, `logoutCloudAdmin`, `changeCloudAdminPassword`, `addCloudGuestbookEntry`, `incrementCloudVisitorCount` |

**Hook:** `src/hooks/useResponsiveItemLimit.ts` (41) — 2 items on mobile, 5 on desktop, rAF-coalesced `matchMedia`.

---

## 🔌 API Layer (`api/portfolio.js`, 237 lines)

A Vercel serverless function. Vite mounts it locally in dev via a custom middleware plugin (no `server.proxy` needed).

| Method | Action | Auth | Purpose |
|---|---|---|---|
| `GET` | — | optional | `{ data, sectionOrder, sectionVisibility, isAdmin }` |
| `POST` | `login` | — | Validates password, sets session cookie |
| `POST` | `logout` | — | Clears cookie |
| `POST` | `change-password` | ✅ session | ≥ 8 chars, re-hashes with new salt |
| `POST` | `guestbook` | public | Validates, trims (50/500), auto-approves, prepends |
| `POST` | `visitor` | public | Increments counter |
| `PUT` | — | ✅ session | Full snapshot write; strips `adminPassword`/`__adminAuth`, validates order + visibility |

**Security**

- Password hashed with `pbkdf2Sync(password, salt, 210_000, 64, 'sha512')` + 16-byte random salt
- Comparison uses `timingSafeEqual` with a length pre-check (length-check-then-compare on both password and session)
- Session token = `expiresAt.hmacSha256(expiresAt)`, TTL 8 h, `HttpOnly; SameSite=Lax; Secure` in production
- `__adminAuth` is destructured out of every response and preserved across writes
- All responses `Cache-Control: no-store`

---

## 🔑 Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `JSONBIN_BIN_ID` | server + local | Target bin |
| `JSONBIN_MASTER_KEY` | server + local | Write/read auth to JSONBin |
| `PORTFOLIO_ADMIN_PASSWORD` | server + local | Fallback admin password (used until changed in Settings) |
| `PORTFOLIO_SESSION_SECRET` | server + local | HMAC key for session cookies |

Create `.env.local` at the project root. **Never commit it** — it is git-ignored.

> ⚠️ If `JSONBIN_MASTER_KEY` is invalid the app still renders, but every cloud read/write fails with *"JSONBin rejected its configured credentials."* Local data continues to work; the admin panel cannot save.

---

## 🚀 Getting Started

```bash
git clone https://github.com/MAYANKPAWAR24/FirstWeb.git
cd FirstWeb
npm install

cp .env.local.example .env.local   # fill in the 4 keys
npm run dev                        # http://localhost:5173
```

### Scripts

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server + the API function mounted locally |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the built output |
| `npm run typecheck` | `tsc --noEmit` (strict mode) |
| `npm run lint` | ESLint flat config |

### Stack

React 18.3 · TypeScript 5.5 (strict) · Vite 5.4 · Tailwind 3.4 · GSAP 3.15 (hero + literature only) · lucide-react 0.446 · Vercel serverless + JSONBin

---

## ✨ Feature Highlights

**Content** — 6 reorderable sections · 5 hideable sub-blocks · type filters + full-text search · per-item visibility · resume-safe form drafts

**Literature** — immersive reader (bottom sheet on mobile, card on desktop) · reading-progress bar · copy with success/failure toast · Web Share API with clipboard fallback

**Media** — YouTube in every URL shape (`watch?v=`, `youtu.be`, `/embed/`, `/shorts/`, `/live/`) · Vimeo · direct `mp4/webm/mov` files · non-embeddable links become elegant "opens in a new tab" cards · no `Refused to connect` errors

**Section Builder** — create sections at runtime with 4 types (text / media / widget / game) · escape-safe markdown subset (headings, lists, quotes, code fences, bold, italic, inline code) · JSON widget grids · lazy-loaded Tic-Tac-Toe and Snake

**AI Chatbot** — 100% local keyword engine, 0 API keys, 0 cost · 18-entry permanent dataset · admin-managed FAQs merged *over* the defaults · quick-reply chips · typing indicator · greeting popup · sessionStorage thread · multi-turn DM redirect

**Performance** — `ReadingProgress` and `CustomCursor` write transforms directly to the DOM, never re-rendering React · `IntersectionObserver` + `visibilitychange` pause off-screen games and particles · frame-rate-independent LERP · rAF-coalesced scroll handlers throughout

**Accessibility** — `role="dialog"` + `aria-modal` on all modals · Escape-to-close everywhere · ARIA grid on Tic-Tac-Toe · focus-visible outlines · `prefers-reduced-motion` disables cursor, particles, tweens and smooth scroll

**Responsive** — 2 items mobile / 5 desktop before "See all" · full-screen mobile nav · sheet-style modals · 375 px → 2560 px verified

---

## 🎨 Design System

Light Apple-inspired theme. Tokens live in `src/index.css` (legacy dark-theme names, remapped values):

`--ink #1d1d1f` · `--muted #68686d` · `--silver #86868b` · `--line #e5e5ea` · `--cyan-accent #147c8a` · `--purple-accent #586a8f` · `--rose-accent #a34553`

**Core utilities** — `.glass` / `.glass-strong` (frosted surfaces) · `.glass-card` · `.btn-premium` · `.premium-input` · `.section-shell` (responsive rhythm) · `.heading-line` · `.external-card` · `.reader-scroll` (momentum, 75vh cap) · `.ios-scroll` · `.scrollbar-hide` · `.on-gradient-text`

**Keyframes** — `fade-up` · `fade-in` · `scale-in` · `slide-in-right` · `toast-enter` · `chat-panel-in` · `chat-bubble-in` · `greeting-pop` · `chat-typing` · `shimmer` · `spin-slow`

**Three non-negotiable rules documented in the CSS:**
1. Never put `transform` / `will-change: transform` on `<body>` or a page-level wrapper — it becomes the containing block for every `position: fixed` descendant and strands modals off-screen.
2. `backdrop-filter` is dropped on iOS and below 1024 px — it forces expensive compositing.
3. `lockPageScroll()` uses `overflow`, never `position: fixed` — the latter is the classic iOS blank-page bug.

---

## ✅ Quality Status

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ 0 errors (strict mode) |
| `npm run lint` | ✅ 0 errors (3 pre-existing react-refresh warnings) |
| `npm run build` | ✅ succeeds in ~2.4 s |
| Browser console | ✅ 0 errors across all sections |
| Engine unit tests | ✅ 75/75 passing |
| Bundle split | Admin 53.7 kB · Snake 6.1 kB · TicTacToe 3.6 kB (lazy) |

---

## 🗂️ Deployment

Vercel (recommended — the `api/` directory is picked up automatically):

1. Import the repo
2. Add the 4 env vars in **Settings → Environment Variables**
3. Deploy

No `vercel.json` needed. The dev-only API middleware is skipped in production builds.

---

## 📄 License

Private project. All rights reserved.
