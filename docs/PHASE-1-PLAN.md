# PHASE 1 — Architecture Understanding, Risk Assessment & Implementation Plan

Branch: `feat/premium-futuristic-evolution`
Audit date: 2026-10-01
Status: **Analysis only — no code modified in this phase.**

---

## 1. CURRENT ARCHITECTURE UNDERSTANDING

### 1.1 Stack reality

| Concern | Reality |
|---|---|
| Framework | React 18.3 + TypeScript 5.5 + Vite 5.4 |
| Styling | Tailwind 3.4 with **`theme.extend = {}` (completely empty)** + 865 lines of hand-written `src/index.css` |
| Component library | `lucide-react` only |
| Animation | **GSAP 3.15 is a dependency but only 2 real usages** — `HeroAtmosphere.tsx:26-48` (particle drift + pointer lerp) and `Literature.tsx:29-36` (deck-stack tilt). No ScrollTrigger. |
| Dead dependency | `@supabase/supabase-js` — **zero imports anywhere in `src/`** |
| Routing | **None.** Single page, anchor-scroll only. No router. |
| Build chunking | **No `build` config at all in `vite.config.ts`** — no `manualChunks`. Current output: one 332 KB `index` chunk + lazy `AdminPanel` (53 KB), `Snake` (6 KB), `TicTacToe` (3.7 KB), 59 KB CSS. |
| Tests | **None.** No test framework, no test script, no test files. |
| Lint/typecheck | `npm run lint` (eslint), `npm run typecheck` (tsc `--noEmit`). `noUnusedLocals: false`, `noUnusedParameters: false` — dead code passes silently. |

### 1.2 Data & sync architecture (the most important subsystem)

```
useData()                          DataContext.tsx:260
  ├─ loadData()                    :200  read localStorage 'portfolio_data_v1'
  │    └─ normalizeData()          :119  seed-merge + per-field normalize
  ├─ fetchCloudSnapshot()          cloudData.ts:29  GET /api/portfolio
  │    └─ cloud-merge              DataContext.tsx:278-306  ← the critical merge
  ├─ save effect                   :322-333  every data/order/visibility change
  │    └─ saveCloudSnapshot()      cloudData.ts:33  PUT  ← writes WHOLE RECORD
  └─ localStorage mirror           saveData() :252  every change
```

**Server side** (`api/portfolio.js`, 238 lines) — Vercel serverless function:
- `GET` → `readRecord()` from JSONBin → `publicSnapshot()` strips `__adminAuth`/`adminPassword`, normalizes `sectionOrder`/`sectionVisibility`.
- `POST {action:'login'}` → pbkdf2-SHA512/210k verify, sets HttpOnly HMAC cookie, 8 h TTL.
- `POST {action:'guestbook'}` / `{action:'visitor'}` → **read-modify-write of the whole bin, unauthenticated**.
- `PUT` → requires admin cookie; `readRecord()` then re-attaches `previous.__adminAuth`, writes merged record.

**Client-side auth is derived from the server.** `DataContext.tsx:307` sets `isAdmin` from the GET response. `sessionStorage.setItem('portfolio_admin')` at `:351` and `removeItem` at `:361` are **written but never read anywhere** — dead code.

### 1.3 Section architecture

`SectionId` (`types.ts:137-144`) = `home | profile | literature | media | study | follow | extra`.
`PublicSectionId` (`sectionOrder.ts:5`) = `SectionId` minus `home`.
`DEFAULT_SECTION_ORDER` (`sectionOrder.ts:20`) = `['profile','literature','media','study','extra','follow']`.

`App.tsx:39-51` holds a `sectionRenderers` map keyed by `SectionId`. `App.tsx:116-119` maps `visibleSectionOrder` through it. **`achievements`, `certificates`, `guestbook`, `contact`, `visitors` are `SubSectionId`s** rendered *inside* `Extra.tsx`.

Consequences that matter:
- `Achievements.tsx:41` opens `<section id="achievements">` **nested inside** `<section id="extra">` (`Extra.tsx:104`). Invalid-ish nesting, and it makes the peer headings a level-3 vs level-2 clash.
- `App.tsx:55` builds the active-section observer from `['home', ...visibleSectionOrder]` — **`#achievements` is never observed**, so the nav never highlights it.
- `search.ts:45` maps achievement results to `sectionId: 'extra'` (not `'achievements'`) because `'achievements'` is not a `SectionId`. Two-stage scroll: `handleNavigate` jumps instantly, then the section effect smooth-scrolls.

### 1.4 Admin panel

11 tabs (`AdminPanel.tsx:21-33`): `poems · media · study · achievements · certificates · guestbook · profile · section-order · sections · chatbot · settings`.
Lazy + mount-gated (`App.tsx:22,141`). Auth gate is one ternary at `:60`.
Reusable in-file primitives: `AdminHeader` (:842), `ItemCard` (:860), `FormField` (:899), `inputCls` (:908), `ModalEditor` (:918).
Canonical list+modal pattern: `const [editing, setEditing] = useState<T|null>(null)` + `const [showForm, setShowForm] = useState(false)`.

### 1.5 Visual system reality — this is the core Phase-5 finding

The site was **authored dark and then flipped to light**. Every component uses `text-white/50`, `text-cyan-300`, `bg-white/5`, `border-white/10`. The reconciliation is `index.css:843-864` — a `.premium-bg`-scoped block that **rewrites Tailwind utilities by attribute selector**:

```css
.premium-bg [class~="text-white/70"], [class~="text-white/60"], [class~="text-white/50"],
[class~="text-white/40"], [class~="text-white/35"], [class~="text-white/30"] { color: var(--muted); }
.premium-bg [class*="text-cyan-"], .premium-bg [class*="text-violet-"] { color: #176d79; }
.premium-bg [class*="text-rose-"]   { color: #a34553; }
```

This produces **hard, visible bugs today**:

1. **Dead hover states.** `[class*="text-cyan-"]` is a *substring* match with **no `:hover` qualifier**, and it is declared *after* the `text-white/70` token rule (same specificity, later wins). So `Literature.tsx:285,295` (`hover:text-cyan-600`), `Media.tsx:207` and `Literature.tsx:305` (`hover:text-rose-500`) are **frozen teal/rose from mount**. Buttons look hovered permanently.
2. **Opacity modifiers silently discarded.** The section eyebrow `text-cyan-400/60` (7 copies: `Extra:108`, `Literature:82`, `Media:49`, `Profile:15`, `StudyMaterial:70`, `FollowMe:32`, `Achievements:45`) has no token rule, so only the substring rule applies → renders at **full opacity `#176d79`**. Same for `Hero:49` `text-cyan-300/80`.
3. **A 6-step opacity scale collapses to 2 values.** `/70 /60 /50 /40 /35 /30` all → `#68686d`. `Extra:111`, `Extra:120`, `Extra:153`, `Extra:245` are visually identical despite differing by 20 points of opacity.
4. **Three tokens for one role.** `text-white/50` → `#68686d`, `text-slate-500` → `#64748b`, `text-slate-600` → `#475569`. Same "caption" role, three greys.
5. **`text-navy-deep` is not a Tailwind class** (`tailwind.config.js` defines no `navy`). `Navigation:74`, `Extra:158`, `AdminPanel:86` resolve only because `index.css:859` rescues them inside `.premium-bg`. Any refactor that moves them out silently breaks them.
6. **`.btn-premium` has two contradictory foreground conventions.** Callers use `text-white` (`Extra:144,228`, `StudyMaterial:118`, `Hero:69`) *and* `text-slate-800/700` (`Literature:171`, `Media:158`, `TicTacToe:130`, `Snake:284,299`). Two different primary-button looks from one class.
7. **Six independent shadow systems** and **two radius scales for the same role** (`rounded-3xl` for section shells, `rounded-2xl` for items — but `Extra:200,238` and `Profile:24` mix both).
8. **Dead CSS.** `.reveal` / `.hero-enter` / `data-hero-enter` / `data-parallax` are applied on **32 elements across 9 files** but **have no CSS rule at all** (only a comment at `index.css:371-375` explaining the GSAP ScrollTrigger hook that was deleted). `.pulse-glow` is defined with `animation: none` and a static shadow (`:350-353`). `.aurora-orb`/`.aurora-1/2/3` are fully defined (`:94-129`) then unconditionally `display: none` (`:102`) and again hidden at `:78` and `:542`. `.noise-overlay::after` is defined at `:652` and then `display: none` at `:865`. **`.animate-fade-up` and `.shimmer` are defined but never used.**
9. **Six independent elevation + the topmost element is the reading progress bar** (`index.css:597` → `z-index: 10000`), above toasts (`9999`), the admin panel (`9500`) and every modal (`9000`/`9200`).

---

## 2. KEY CONSTRAINTS & RISKS

### 2.1 Data-integrity risks (highest severity)

| # | Risk | Location | Severity |
|---|---|---|---|
| **R1** | **Every `data` change PUTs the entire record.** One keystroke in the socials URL field (`AdminPanel.tsx:296-304`) writes the whole bin. No debounce, no scoped update. | `DataContext.tsx:322-333` | **Critical** |
| **R2** | **Unauthenticated write amplification.** `guestbook` and `visitor` actions do a full JSONBin read-modify-write each, with no rate limit, no captcha, no origin check. Guestbook entries are saved **`approved: true` hardcoded** (`:190`) so unauthenticated input lands pre-approved. | `api/portfolio.js:176-202` | **Critical** |
| **R3** | **Last-writer-wins across devices.** Two admin tabs, or an admin + a guestbook submit, race. The `pendingGuestbook` guard (`DataContext.tsx:458-476`) only protects within one tab. | `api/portfolio.js:176-222` | High |
| **R4** | **Clobbering between sibling editors.** `ProfileAdmin.saveProfile` writes `{...form, socials: data.profile.socials}` from a render-time snapshot (`AdminPanel:1455`) while `SectionOrderAdmin` writes `{...data.profile, socials}` (`AdminPanel:145`). The two can overwrite each other. | `AdminPanel.tsx:145,1455` | High |
| **R5** | **Server allowlists silently drop new keys.** `api/portfolio.js:11-15` hardcodes `DEFAULT_SECTION_ORDER` and `TOGGLEABLE_BLOCKS`. `validVisibility` (`:118-125`) drops any id not in the list. Adding a toggleable block **requires a server redeploy** or it is silently stripped. | `api/portfolio.js:11-15` | High |
| **R6** | **Inverted visibility semantics.** `sectionVisibility[id] === true` means **hidden**; `toggleSectionVisible` **deletes** the key to show. Trivially easy to invert in new code. | `sectionOrder.ts:80-82`, `DataContext.tsx:374-381` | Medium |
| **R7** | **Deletion has no confirmation anywhere.** The `ItemCard` ✕ fires immediately; no id is retained. Only `resetData` uses `window.confirm`. | `AdminPanel.tsx:886-892` | Medium |
| **R8** | **Escape inside `ModalEditor` closes the whole admin panel**, silently discarding the in-progress form. No focus trap anywhere. | `AdminPanel.tsx:46-52` | Medium |
| **R9** | **Export has no importer.** The exported envelope is not round-trippable. `utils.downloadJSON` exists but is unused. | `AdminPanel.tsx:1756-1769`, `utils.ts:16-24` | Medium |
| **R10** | **Cloud write is gated on `isAdmin`**, so logged-out edits mutate localStorage only with no user-visible signal. | `DataContext.tsx:327` | Low |

### 2.2 SEO risks

| # | Risk | Evidence |
|---|---|---|
| **R11** | **The site is a JS-only SPA with zero prerendered content.** `index.html` has an empty `<div id="root">`. Googlebot does render JS, but every audit tool that does not will report **0 words, no H1, no headings, very few links**. | `index.html:19` |
| **R12** | **No `public/` directory at all.** Therefore no `robots.txt`, no `sitemap.xml`. Verified: `ls public` → not found. | — |
| **R13** | **No canonical, no `og:image`, no `twitter:image`, no `og:url`, no `og:site_name`, no JSON-LD.** Zero `schema.org` markup anywhere. | `index.html:11-16` |
| **R14** | **Head is 100% static and never reflects admin edits.** No `document.title =` anywhere in `src/`. | verified |
| **R15** | **No `vercel.json`, no `_redirects`, no `_headers`.** SPA fallback relies entirely on Vercel's framework auto-detection for Vite. Deep links are not explicitly guaranteed. | verified |
| **R16** | **No X-Robots-Tag anywhere** (no headers config exists), so this is not a blocker — but there is also no `robots meta`. | verified |
| **R17** | **Title/description say "portfolio — developer, designer, creator"** while the actual profile is "Writer · Developer · Creator" and the content is literature-first. Title–content mismatch. | `index.html:9-16` vs `seedData.ts:8` |

### 2.3 Accessibility risks

| # | Risk | Location | Severity |
|---|---|---|---|
| **R18** | **`Media.tsx:77-90` — the entire media grid is a `div onClick` with no role, no tabIndex, no keydown.** Every photo and video is **unreachable by keyboard and invisible as an interactive element to AT**, while `data-cursor="link"` makes it *look* clickable. | `Media.tsx:77-90` | **Critical** |
| **R19** | **Toasts have no live region.** No `role="status"` / `aria-live`. Every `notify()` — all admin feedback — is **silently dropped for screen readers**. The only live region in the codebase is the admin sync pill. | `ToastContext.tsx:52-69` | **Critical** |
| **R20** | **No focus trap or focus restore in any of the 4 overlays.** Only `aria-modal="true"` (advisory). Background content is never `inert`. | `Literature:266`, `Media:192`, `Extra:348`, `AdminPanel:57` | High |
| **R21** | **`.premium-input:focus` kills the global focus ring** (`:813-817`) on mouse *and* keyboard, substituting a border-colour change. Affects 8 inputs. `.btn-premium` has `transition: all`, so the outline animates on focus. | `index.css:813-817` | High |
| **R22** | **Six placeholder-only form fields** with no `<label>`/`aria-label`: guestbook name+message, contact name+email+message, literature search. | `Extra:124-139,204-224`, `Literature:105` | High |
| **R23** | **Icon-only buttons without accessible names.** Nav sound toggle (`title` only, no `aria-pressed`), nav mobile toggle (**no label at all**), `ModalEditor` ✕. | `Navigation:162-176`, `AdminPanel:925` | High |
| **R24** | **Heading hierarchy defects.** `CustomSections:44` h2 renders *smaller* than sibling h3s; `Extra:259` "Certificates" is an h3 at `text-2xl/3xl` while peers are h3 at `text-xl`; `Achievements` is an h2 that is a *peer* of those h3s. Reading order jumps h2 → h3(small) → h3(huge) → h2 → h3. | 4 locations | High |
| **R25** | **Admin panel's 7 `h2`s enter the public document outline.** `AdminPanel` is a sibling of `<main>` with no `role`, no `aria-modal`, no heading of its own. | `App.tsx:141-150` | Medium |
| **R26** | **Modals name themselves via `aria-label`, not `aria-labelledby`.** The visible `h3` inside each dialog is decorative to AT. | `Literature:268`, `Media:194`, `Extra:350` | Medium |
| **R27** | **Game accessibility gaps.** `TicTacToe` declares `role="grid"` with bare `<button>` cells (no row/gridcell); occupied cells are `disabled` so their `aria-label` becomes unreachable. `Snake` status/score have no `aria-live`; `containerRef.current?.focus()` on every keydown **yanks focus off the D-pad button just clicked**, killing its `:focus-visible` ring. | `TicTacToe:105-120`, `Snake:244-258` | Medium |
| **R28** | **Audio play control inside a click-capturing card** with no `stopPropagation` — divergent behaviour between the control and its padding. | `Media.tsx:83-88,141-146` | Medium |

### 2.4 Performance / motion risks

| # | Risk | Evidence |
|---|---|---|
| **R29** | **332 KB unsplit main chunk.** No `manualChunks`. Every public visitor downloads the whole app. | `dist/assets/index-*.js` |
| **R30** | **`searchPortfolio` walks the entire `PortfolioData` on every keystroke** with no index, no tokenization, no ranking. Also builds a dead `result.text` string per result that nothing reads. | `search.ts:48-77` |
| **R31** | **Snake rebuilds its rAF loop on every point eaten** because `speed` is a dep of the tick effect. Also has no DPR scaling → soft on retina. Also **any arrow key after game over silently restarts**, bypassing the "Play again" button. | `Snake:129,169-180,235` |
| **R32** | **`GameSkeleton` is 256 px vs a 396 px board → ~140 px layout shift** when the chunk resolves. | `CustomSections:13-20` |
| **R33** | **TicTacToe AI is uniformly random** — no win-block, no fork avoidance, no minimax. `play` also does a dead `setBoard` at `:40-42`. | `TicTacToe:37-61` |
| **R34** | **`.reveal`/`.hero-enter` on 32 elements with zero CSS** — they render statically today, which is *good for performance*, but the class names are a landmine: adding an opacity/animation rule later silently affects 32 elements. | `index.css:371-375` |
| **R35** | **`mix-blend-mode` cursor is opt-in via `[data-cursor-blend]` but the attribute is never set** — dead but documented. | `index.css:294-297` |
| **R36** | **Hard `transform` warnings in the codebase are load-bearing.** `App.tsx:110-113` and `index.css:44-49` both document that a transform on `<main>`/`<body>` makes it the containing block for every `position: fixed` descendant, stranding modals off-screen. Any "GPU acceleration" pass must respect this. | `App.tsx:110-113` |

### 2.5 Content / trust risks

| # | Risk | Evidence |
|---|---|---|
| **R37** | **Chatbot persona is a mismatched influencer/bro bot.** "Mayank AI" is Hinglish, flattery-driven, emoji-dense ("tumhara dimaag aam logo se kai aage", `chatbot.ts:91`; "tumhe baaki 99% logo se alag", `:83`), and includes a **flirt FAQ** (`chatbot.ts:133-136`). It contradicts the site's actual identity and the recruiter-friendly goal. | `chatbot.ts:38-145` |
| **R38** | **Chatbot's 18 FAQs are mostly off-topic for a portfolio**: stoicism, black holes, pyramids, Matrix/simulation, jungle survival, flirting. Only 3 are relevant (identity, hiring, skills). **Zero** for portfolio/projects/contact/email/resume/availability. | `chatbot.ts:72-145` |
| **R39** | **Chatbot is text-only.** Zero section-jump actions — a grep for `action\|navigate\|scroll\|section` in `chatbot.ts` returns exactly one hit, and it is the word "Literature" inside a *response string*. The prompt's "Take me to Portfolio" requirement has **no existing mechanism**. | `chatbot.ts` |
| **R40** | **Admin FAQ shadowing is keyword-overlap based.** One managed FAQ containing the keyword `hire` deletes embedded FAQ #3 entirely. | `chatbot.ts:249-254` |
| **R41** | **Fake content presented as real.** `seedData.ts` claims "National Poetry Award 1st Place among 2,400+ entries", "debut novel published, #3 on chart", "keynote to 800+". These are demo seed values on a site meant to be recruiter-honest. `studyMaterials` are all `url: '#'` — **dead links**, directly violating the "no broken links" principle. | `seedData.ts:208-234,182-207` |
| **R42** | **Visitor count is fake precision** (`1247` seeded, `:4`) and is presented as a stat. | `seedData.ts:4` |
| **R43** | **`certificates: []`** but the section renders with a generic empty state. Fine, but must stay a *polished* empty state. | `seedData.ts:235` |
| **R44** | **"Extra" is a vague name for the section holding achievements + certificates + contact + guestbook + visitor count.** Explicitly called out in the brief as something to replace. | `Extra.tsx:109` |
| **R45** | **Email is `mayank.pawar@example.com`** — `example.com` is a reserved non-routable domain. Shipping this as the primary contact breaks trust. | `seedData.ts:11`, `DataContext.tsx:240` |

---

## 3. PUBLIC INFORMATION ARCHITECTURE — RESTRUCTURING PLAN

### 3.1 Target flow

```
Home (Hero)
About        ← was Profile
Portfolio    ← NEW, first-class professional layer
Literature
Media
Study        ← conditional
Achievements ← promoted out of Extra, peer-level section
Certificates ← conditional on content
Contact      ← promoted out of Extra, peer-level section
Community    ← renamed from "Visitor Wall / Guestbook", lowest priority
Footer
```

### 3.2 How to achieve it without breaking the order/visibility registries

**Decision: do NOT add new `SectionId`s.** Instead, promote `SubSectionId`s to first-class sections **while keeping their existing `ToggleableId` strings unchanged** so every saved record stays valid.

Mechanism:
1. `sectionOrder.ts`: extend `PublicSectionId` with the promoted ids, and extend `DEFAULT_SECTION_ORDER` — but via a **merge-on-load** function, not a bare `DEFAULT_SECTION_ORDER` spread, so an existing saved order is upgraded rather than replaced.
2. `sectionOrder.ts:loadSectionOrder()` already appends missing ids (`completeOrder` at `:49`). It needs one addition: detect a *pre-promotion* saved order (i.e. it contains `'extra'` and not `'contact'`) and expand `'extra'` into the new block sequence at that position.
3. `App.tsx`: add renderers for the promoted ids; `Extra.tsx` loses those blocks and becomes either (a) deleted, or (b) retained only as a legacy-order fallback.
4. `api/portfolio.js`: `DEFAULT_SECTION_ORDER` + `TOGGLEABLE_BLOCKS` **must** be extended in the same deploy, or `validOrder`/`validVisibility` will strip the new ids (R5).

**Migration rule (hard requirement):** `'extra'` in any saved order is expanded in place to `['achievements','certificates','contact','community']`, filtered by current visibility. `'extra'` is then retired from the client registries but **still accepted** by `api/portfolio.js` `validOrder` for one release so an old client talking to a new server cannot corrupt anything.

### 3.3 Nav

Current nav labels (`Navigation.tsx:17-24`): `Profile · Literature · Media · Study · Extra · Follow Me`.
Target: `Home · About · Portfolio · Literature · Media · Study · Achievements · Contact` — with items filtered by visibility and hard-capped at ~7 on desktop with an overflow treatment. Mobile drawer becomes a proper bottom-sheet-style overlay with focus trap + Escape.

### 3.4 Hero

Current H1 (`Hero.tsx:38`) is a single correct `<h1>` with the name — that stays. Additions needed: a real identity line (currently `profile.title` = "Writer · Developer · Creator"), a short crawlable intro paragraph (currently **absent** — the bio lives only in Profile), and semantic CTAs. The current CTA "Explore My Work" navigates to `'literature'` and "Get in Touch" navigates to `'extra'` — both need retargeting to `'portfolio'` and `'contact'`.

---

## 4. SCHEMA / DATA MODEL PLAN (JSONBin-safe)

**Governing rule: every new key is optional, defaulted, normalized, and merged with `snapshot.X ?? current.X`. Never `?? seed.X` on the cloud path** — that pattern wipes a locally-seeded default when an old bin lacks the key. `DataContext.tsx:289-290` already gets this right for `customSections`/`chatbotFAQs`; every new key must follow that exact shape.

### 4.1 New interfaces (all in `src/lib/types.ts`)

```ts
// — Section content settings ————————————————————————————————
export interface HeroSettings {
  eyebrow: string; greetingEnabled: boolean;
  intro: string;                        // crawlable, ≤320 chars
  ctaPrimary: { label: string; target: SectionId };
  ctaSecondary: { label: string; target: SectionId };
  ctaTertiary?: { label: string; target: SectionId };
  showStats: boolean; showVisitorCount: boolean;
}

export type SkillGroup = 'creative' | 'technical' | 'workflow' | 'communication';
export interface SkillGroups {            // additive over profile.skills
  creative: string[]; technical: string[];
  workflow: string[]; communication: string[];
}

export interface PortfolioBlock {
  id: string;
  kind: 'summary' | 'education' | 'capability' | 'case-study' | 'project' | 'resume';
  title: string; body: string;
  tags: string[]; url: string;
  visible: boolean; featured: boolean; order: number;
}
export interface PortfolioSettings {
  eyebrow: string; title: string; intro: string;
  summary: string; availability: { status: string; note: string };
  blocks: PortfolioBlock[];
  resumeUrl: string; resumeLabel: string;
}

export interface ContactSettings {
  heading: string; intro: string;
  email: string; phone: string;
  showForm: boolean; showSocials: boolean; ctaLabel: string;
}
export interface FooterSettings {
  note: string; copyright: string;
  columns: { id: string; heading: string; links: { id: string; label: string; url: string; section?: SectionId }[] }[];
}
export interface SeoSettings {
  title: string; description: string;
  ogImage: string; siteUrl: string;
  keywords: string[]; twitterHandle: string;
  jsonLdEnabled: boolean; indexable: boolean;
}
export type MotionIntensity = 'off' | 'subtle' | 'full';
export interface AnimationSettings {
  enabled: boolean; intensity: MotionIntensity;
  ambientEffects: boolean; cursorEffects: boolean;
  sectionReveal: boolean; heroParallax: boolean; sound: boolean;
}
export interface GameSettings {
  enabled: boolean; featured: MiniGameKind;
  order: MiniGameKind[]; hidden: MiniGameKind[];
}
export interface ChatbotSettings {
  enabled: boolean; name: string; greeting: string;
  tone: 'professional' | 'friendly';
  quickReplies: { id: string; label: string; query: string }[];
  sectionChips: { id: string; label: string; target: SectionId }[];
  fallbackStyle: 'helpful' | 'witty' | 'minimal';
}
```

### 4.2 New keys on `PortfolioData`

`heroSettings`, `skillGroups`, `portfolioBlocks`, `portfolioSettings`, `contactSettings`, `footerSettings`, `seoSettings`, `animationSettings`, `gameSettings`, `chatbotSettings`.

**All ten are top-level scalar/array keys, not nested inside existing objects.** This is deliberate: it makes the cloud-merge a flat `snapshot.X ?? current.X` per key with no deep-merge ambiguity, matching the existing `customSections`/`chatbotFAQs` precedent.

### 4.3 Migration-safe normalization

Extend `normalizeData` (`DataContext.tsx:119-135`) with a **per-key `normalizeX(value): X | undefined`** pattern:

```ts
// Absent key  → undefined → cloud merge keeps `current` (which is the seed)
// Present but junk → repaired field-by-field
// Present and valid → returned as-is
heroSettings: normalizeHeroSettings(source.heroSettings),
```

Rule: **`undefined` means "absent, keep local"** and must be distinguishable from `"present but empty"`. This is the single most important safety invariant in the whole migration. Field-level repair uses the existing `asString`/`asArray`/`isRecord` helpers (`DataContext.tsx:28-38`).

Also extend `normalizeData`'s array normalizers for `skillGroups`, `portfolioBlocks` (drop blocks without an `id`, coerce `order` to a finite int, `visible !== false`) and `chatbotSettings.quickReplies`/`sectionChips`.

### 4.4 Sync-path changes

| Change | File | Why |
|---|---|---|
| Extend `normalizeData` + cloud merge | `DataContext.tsx:119,278-296` | The `?? current.X` rule per new key |
| Add `updateX`/`setX` actions | `DataContext.tsx` | Settings need object-level setters, not field-by-field |
| **Debounce the cloud PUT** (450 ms idle, plus flush on `visibilitychange`/`beforeunload`) | `DataContext.tsx:322-333` | Fixes R1 write amplification |
| **Re-snapshot before PUT** | `api/portfolio.js:207-222` | Fixes R3: read-modify-write at write time, not just login time |
| **Moderation field on guestbook** | `api/portfolio.js:190` | Fixes R2: stop hardcoding `approved: true` |
| **Per-action rate limit** (in-memory best-effort + honeypot + min submit interval) | `api/portfolio.js` | Fixes R2 |
| **Extend allowlists** | `api/portfolio.js:11-15` | Fixes R5 |
| **Scoped partial PUT** (`{ patch: { path, value } }`) | `api/portfolio.js` | Lets settings save one key instead of the whole record |
| **Import endpoint** | `AdminPanel` + `api/portfolio.js` | Fixes R9 |

**Deliberately not changing:** the `__adminAuth` handling, the HMAC cookie, the pbkdf2 parameters, `publicSnapshot` stripping, and the `client→server` contract shape for existing actions. Login/logout/guestbook/visitor payloads stay byte-compatible.

---

## 5. ADMIN PANEL EXPANSION PLAN

### 5.1 Structural refactor first (must precede any new tab)

`AdminPanel.tsx` is 1794 lines and every manager is inlined. Before adding 8 tabs:

1. Extract to `src/components/admin/`:
   - `primitives.tsx` → `AdminHeader`, `ItemCard`, `FormField`, `inputCls`, `ModalEditor`, `Toggle`, `TagEditor` (the chip editor is currently duplicated 3× at `:1290`, `:1509-1524`, `:1529-1552`).
   - `ConfirmDialog.tsx` → new; fixes R7.
   - `useUnsavedChanges.ts` → new; fixes R8 partially.
2. **`ModalEditor` gains: `role="dialog"`, `aria-modal`, a real focus trap, focus restore to the opener, and a *consumed* Escape.** Fixes R8/R20/R26.
3. **Add `ConfirmDialog`** and route every `deleteX` through it. Fixes R7.
4. **Extract `AdminTab` + `TABS` into one registry** — currently declared twice (`:12` and `:21`) plus a render branch each. Adding a tab is 3 edits today.
5. **Fix the `CustomSectionForm` duplicate field** — "Button link URL" is bound to `form.mediaUrl` (`:539-541`), duplicating `:518`. Fixes a real data-loss bug.

### 5.2 New tabs

| Tab | Manages | New data keys |
|---|---|---|
| **Homepage** | Hero copy, CTAs, stat visibility, intro | `heroSettings` |
| **Portfolio** | Blocks CRUD, order, featured, resume | `portfolioSettings`, `portfolioBlocks` |
| **Contact** | Email, phone, form/social toggles, CTA | `contactSettings` |
| **Footer** | Columns, links, copyright, note | `footerSettings` |
| **SEO** | Title, description, OG image, JSON-LD toggle, indexable toggle | `seoSettings` |
| **Games** | Enable/disable per game, featured game, order | `gameSettings` |
| **Animations** | Master toggle, intensity, ambient/cursor/reveal/parallax | `animationSettings` |
| **Site Settings** | Feature toggles (curated over `TOGGLEABLE_BLOCKS`), skills grouping, export/import/reset, sync diagnostics | `skillGroups`, `featureToggles` |

Chatbot tab expands in place (Phase 6) rather than becoming a new tab — it already has the right list+modal shape.

### 5.3 Admin quality-of-life

- **Debounced writes** — fixes R1. Biggest single UX win; typing a social URL stops hammering the bin.
- **Unsaved-changes guard** on every form + `beforeunload`.
- **Per-section reset** (`resetSection('portfolio')`) in addition to full reset. Reuses `seedData` per key.
- **Import backup** matching the existing export envelope, with a schema-version check and a confirm.
- **Sync diagnostics**: real `role="status"` pill with `syncStatus`, last-synced timestamp, retry button, and a "cloud unavailable — changes are local only" warning when `syncStatus === 'offline'`.
- **Item duplication** for `portfolioBlocks`, `customSections`, `chatbotFAQs`.
- **Draft persistence extended** beyond poems (`saveDraft`/`loadDraft`/`clearDraft` already exist at `DataContext:570-589`) to every modal form.
- **`CertificatesAdmin` normalized** onto the `ModalEditor` pattern (it is the only non-modal form) and given the missing `visible` field.

---

## 6. SEO / INDEXABILITY PLAN

### 6.1 Critical path

The site is a JS-only SPA. **The single highest-leverage SEO change is prerendering crawlable content into `index.html`.** Two options:

- **Option A — build-time prerender** (recommended): a Vite plugin that renders the seed/normalized `PortfolioData` to static HTML at `npm run build` and inlines it into `dist/index.html` inside `<div id="root">`, with React hydrating over it. No new dependency required at runtime; the heavy work is build-time only.
- **Option B — accept the SPA**: add everything else and rely on Googlebot's JS rendering. Cheaper, but every non-Google audit tool still reports 0 words.

**Recommendation: Option A.** Without it, items 9-20 in the brief ("investigate and fix any reason audit tools may report 0 words, no H1, no headings, very few links") are only partially fixable.

If Option A proves too heavy for the timeline, the fallback minimum is: a `<noscript>` block with the real H1, bio, and section link list, which non-rendering crawlers and text-extraction tools will read.

### 6.2 Asset & head additions

| Asset | Location | Purpose |
|---|---|---|
| `robots.txt` | **new `public/robots.txt`** | `Allow: /`, `Disallow: /api/`, `Sitemap:` line. Also serves as the `Disallow` gate if `indexable` is off. |
| `sitemap.xml` | **new `public/sitemap.xml`** | Single URL today; trivially extensible when routes are added. |
| `site.webmanifest` | **new `public/`** | PWA basics + icons. |
| `apple-touch-icon.png` | **new `public/`** | 180×180; currently only a data-URI SVG favicon exists. |
| `og-image.png` (1200×630) | **new `public/`** | Referenced by `og:image` + `twitter:image`. |
| `canonical` | `index.html` + runtime | Fixes R13. Runtime-overridable from `seoSettings.siteUrl`. |
| `og:url`, `og:site_name`, `og:locale`, `twitter:image` | `index.html` + runtime | Fixes R13. |
| JSON-LD | `index.html` + runtime | `Person`, `WebSite`, `CreativeWork[]` for published works, `ItemList` for achievements. Gated on `seoSettings.jsonLdEnabled`. |
| `robots meta` | runtime | Only emitted when `seoSettings.indexable === false`. **No `noindex` exists today**, so this is a new opt-out, not a removal. |

### 6.3 On-page

- One H1 (`Hero:38`) — already correct, keep.
- Fix all heading-hierarchy defects in R24.
- Add `aria-label` to `<section>` elements and make the visible `h2` the region's accessible name (remove the `aria-label` override at `CustomSections:34`).
- Convert every `#section` scroll target into a real `<a href="#section">` so internal links are crawlable. Today nav items are `<button onClick>` (`Navigation:87`) — **the site has effectively no crawlable internal links**, which is the "very few links" audit failure.
- Footer: real sitemap links (`FooterSettings.columns`).
- `<noscript>` fallback.
- `vercel.json` with an explicit SPA rewrite, so deep links are guaranteed rather than assumed.

### 6.4 Fixing the "portfolio" title mismatch

`index.html:9-16` says "developer, designer, and creator". The actual seed profile is "Writer · Developer · Creator" (`seedData:8`) and the site's strongest content is literature. All SEO copy becomes **admin-managed via `seoSettings`**, defaulting to a title that reflects the real positioning: *MAYANK PAWAR — Writer, Developer & Creator · Portfolio and Writing*.

---

## 7. ACCESSIBILITY / STANDARDS PLAN

Ordered by severity:

| Priority | Fix | Files |
|---|---|---|
| P0 | Media grid → `<button>` (or `TiltCard`, which already does role/tabIndex/Enter/Space correctly) | `Media.tsx:77-90` |
| P0 | Toast container → `role="status" aria-live="polite"` | `ToastContext.tsx:52` |
| P0 | Real `<label>` for all 6 placeholder-only fields | `Extra:124-139,204-224`, `Literature:105` |
| P0 | `.premium-input:focus-visible` keeps a visible ring; drop `transition: all` from `.btn-premium` | `index.css:813-817,622` |
| P0 | Focus trap + focus restore + consumed Escape in all overlays; `aria-labelledby` instead of `aria-label` | new `src/components/Overlay.tsx`, consumed by `Literature`, `Media`, `Extra`, `AdminPanel`, `Navigation` |
| P1 | `aria-label` + `aria-pressed`/`aria-expanded` on nav toggles; label on `ModalEditor` ✕ | `Navigation:162-176`, `AdminPanel:925` |
| P1 | Fix heading hierarchy (R24) and give `AdminPanel` `role="dialog" aria-modal` so its h2s leave the public outline | 5 files |
| P1 | `stopPropagation` on the audio control | `Media:141-146` |
| P1 | TicTacToe: proper `role="row"`/`role="gridcell"`; `aria-disabled` instead of `disabled`; `aria-live` result | `TicTacToe:105-120` |
| P1 | Snake: `aria-live` status/score; stop stealing focus from D-pad buttons | `Snake:244-272` |
| P2 | Mobile drawer: `aria-modal`, trap, Escape, `aria-controls` | `Navigation:183-206` |
| P2 | Chat panel: `aria-live="polite"` on the log, `role="log"`, focus return to launcher | `AIChatbot` |
| P2 | `aria-hidden="true"` on decorative emoji; drop hardcoded name in `FollowMe` aria-labels | `Profile:37`, `FollowMe:52` |
| P2 | `role="progressbar"` on the modal reading progress bar | `Literature:255-259` |
| P2 | Centralised z-index scale; fix `.reading-progress` being the topmost element (10000) | `index.css:597` |

**Browser compatibility:** `backdrop-filter` is already correctly stripped on iOS (`index.css:467-504`) and on ≤1023px (`:507-528`). New glass work must go through those same guards. Canvas (`Snake`) needs a DPR fallback and a no-`roundRect` path (already present at `:90-96`). Any new CSS (`@supports`, `:has()`, container queries, `mask-composite`) needs an explicit fallback — the codebase already uses `-webkit-mask` + `mask-composite` correctly in `.glow-border`.

---

## 8. CHATBOT UPGRADE PLAN

### 8.1 The honest framing

The current bot is not a site assistant; it is a novelty persona. Rebuilding the *content* while keeping the *engine* is cheap and safe. The engine (`buildKnowledge`, `scoreOf`, `hasKeyword`, `resolveChatReply`) is ~120 lines, well-commented, and correct in its basics — `hasKeyword`'s 3-character word-boundary guard (`:177-184`) is genuinely careful. **Keep the engine shape, replace the dataset, add an action channel.**

### 8.2 Rebrand

- Name: `Mayank AI` → configurable via `chatbotSettings.name`, default something aligned with a portfolio assistant.
- **Delete the flirt FAQ** and the majority-flattery copy. Replace with recruiter- and reader-appropriate tone.
- Remove "0 rupees, 0 API keys, bas ek dumb keyword engine" from the opening line (`chatbot.ts:43`) — it reads as unserious to a recruiter.
- Default tone → `professional`; `friendly` opt-in via admin.

### 8.3 New FAQ set (admin-overridable, 12 defaults)

who is Mayank · what does he do · what is this site · where is the portfolio · where can I read the writing · how do I contact him · what are the skills · what has he built · what can I explore here · how is this site managed · is he available for work · is there a resume/CV.

Each becomes a richer record: `{ id, question, answer, keywords, synonyms, category, section?: SectionId, enabled }`.

Categories: `general · recruiter · writing · media · contact · work` — the brief's requirement, and they drive the chips.

### 8.4 Action channel (new — nothing exists today)

Add an optional `actions` field to `ChatbotReply`:

```ts
export interface ChatbotAction {
  label: string;
  type: 'navigate' | 'external' | 'search';
  target: SectionId | string;
}
```

`AIChatbot` renders these as real buttons below the bubble. `navigate` reuses `App.handleNavigate`. `ChatbotReply` becomes `{ text, kind, fromCloud, faq?, actions? }`.

**Wiring:** `AIChatbot` currently sits inside `<main>` (`App.tsx:125`) and knows nothing about navigation. Cleanest route: `App.tsx` passes an `onNavigate` prop into `AIChatbot` rather than using a global event bus. One prop, no new context.

**Knowledge-source enrichment:** the engine currently reads *zero* portfolio content. Add a small set of *derived* FAQs built from live data at resolve time — "show me the poems" lists actual titles; "what are his skills" reads `profile.skills`. This makes the assistant actually about *this* site rather than a static script.

### 8.5 Matching improvements

- **Synonyms map** per FAQ (e.g. `cv`→`resume`, `job`→`work`, `hire`→`available`).
- **Ranking:** currently first-match-wins on `keyword.length + wordCount*4`. Add a specificity tiebreak so a 2-token exact phrase beats a 1-token substring.
- **Fix the shadow rule** (R40): require overlap on *all* of a managed entry's keywords, or move to explicit `shadowsDefaultId`. A single shared keyword must not delete a default.
- **Contextual suggestions** driven by `chatbotSettings.sectionChips` filtered by *currently visible* sections, so chips never point at a hidden section (same guard the nav already does at `Navigation:33-35`).

### 8.6 Admin + UX

`ChatbotSettings` (enabled, name, greeting, tone, quickReplies, sectionChips, fallbackStyle) joins the existing chatbot tab. Global disable → the widget does not mount at all. Accessibility: `role="log"` + `aria-live="polite"` on the message list, `aria-busy` while typing, focus return to the launcher on close.

---

## 9. GAMES EXPANSION PLAN

### 9.1 Current state

Games mount only through `CustomSections` with `type: 'game'` (`CustomSections:77-83`), dispatched by a two-way ternary at `:80`. Both are `React.lazy` but **not scroll-gated** — the chunk fires as soon as any visible game section renders. Game identity is hardcoded in 4 places: `MINI_GAME_KINDS` (`types:92`), the admin select (`AdminPanel:510-512`), the display ternary (`:390`), the component switch (`CustomSections:80`).

### 9.2 Tic-Tac-Toe

- Real AI: **minimax with alpha-beta pruning** + difficulty (`easy` = 30% random, `medium` = depth-limited, `smart` = full). ~60 lines, zero dependencies, runs in well under a millisecond on a 4×4 board.
- **4×4 mode**: `boardSize: 3 | 4`, winning line count = `boardSize + 1`. `LINES` must be **generated**, not hardcoded — a 4×4 board has 10 rows + 10 cols + 2 long diagonals (+ 4 short diagonals at size 4 for a nicer game; decision: long diagonals only, to keep win rates sane).
- Fix the dead `setBoard` (`TicTacToe:40-42`), add `result` states for `lost` vs `won`, and accessibility from §7.
- Mobile: cells must stay ≥44 px. A 4×4 grid at 320 px viewport → 68 px cells. Fine.

### 9.3 Snake

- **Add difficulty** (`relaxed`/`classic`/`fast`) as a starting-speed + floor pair, replacing the hardcoded `START_SPEED`/`MIN_SPEED`.
- **DPR scaling**: set canvas backing store to `SIZE * devicePixelRatio`, CSS size stays `100%`. Fixes R31's blur.
- **Fix the rAF rebuild**: keep the loop mounted and read `speed` from a ref, so eating a pellet no longer tears down the effect.
- **Fix auto-restart on any key after game over** (`:235`) — gate `steer` so it only restarts from an explicit "start" state.
- Score UI: best-score persisted to `localStorage` per game, shown inline; nicer pause overlay.

### 9.4 New games — curated set of 4

Chosen for: low CPU, no assets, mobile-native input, visual consistency with the glass system, and each mapping to a distinct input model so the "Play Break" section is not repetitive.

| Game | Why | Size | Input |
|---|---|---|---|
| **Memory Match** | Zero CPU, pure CSS 3D flip, reads well on the glass aesthetic, universally understood | ~180 lines | Tap |
| **2048** | Highest replay value, keyboard + swipe, tile motion reuses the GSAP deck trick | ~260 lines | Keys + swipe |
| **Rock Paper Scissors** | Instant, animated, and a natural "versus" visual with the chatbot | ~150 lines | Tap |
| **Reaction Tap** | Adds a skill dimension the others lack; trivial to implement well | ~130 lines | Tap |

Rejected: Word Guess (needs a dictionary asset), Typing Speed (a11y-heavy), Maze-lite (canvas complexity), Simon-lite (too close to Memory Match).

### 9.5 Framework

New `src/components/games/registry.ts` — the single source of truth:

```ts
export const GAME_REGISTRY: Record<MiniGameKind, {
  id: MiniGameKind; title: string; blurb: string;
  icon: LucideIcon; tags: string[];
  load: () => Promise<{ default: ComponentType<GameProps> }>;
}>
```

This kills the 4-place hardcoding, makes `CustomSections:80` a registry lookup, gives the admin tab a real list to render, and makes future additions a one-file change.

`MiniGameKind` becomes `'tic-tac-toe' | 'snake' | 'memory' | 'twenty-forty-eight' | 'rps' | 'reaction'`. **Backward-compatible**: `normalizeCustomSections` (`DataContext:53`) already falls back to `'tic-tac-toe'` for an unknown value, and unknown ids from old bins are preserved verbatim — so old records keep working and `gameSettings.hidden` simply won't match them.

New "Play Break" section: a dedicated game-collection section (not a custom section), rendering enabled games as cards with `featured` promoted to an inline playable panel. `CustomSections` of `type: 'game'` keeps working unchanged.

### 9.6 Performance

Wrap game mounting in an `IntersectionObserver` with a generous `rootMargin` so the chunk is fetched shortly before the section enters view, not at mount. Make `GameSkeleton` size-match the real board to kill the 140 px shift.

---

## 10. MOTION / ANIMATION SYSTEM PLAN

### 10.1 The load-bearing constraint (R36)

`App.tsx:110-113` and `index.css:44-49` both document: **a transform or `will-change: transform` on `<body>`/`<main>` makes it the containing block for every `position: fixed` descendant**, stranding modals and the pinned nav off-screen on long pages. Every new motion effect must respect this. No parallax on any ancestor of a fixed overlay.

### 10.2 Realise the dead hooks — deliberately, and only once

`.reveal`/`.hero-enter`/`data-hero-enter`/`data-parallax` are on 32 elements across 9 files with **zero CSS**. Adding rules now would be a silent global change. The correct move is a **single new IntersectionObserver-driven reveal system** in `src/hooks/useReveal.ts`:

- Observes `[data-reveal]` elements, adds a `.is-visible` class once, then **unobserves**.
- `IntersectionObserver` + a single shared observer, `rootMargin: '0px 0px -10% 0px'`.
- Only `opacity` + `transform: translate3d()` — compositor-only, no layout.
- Bails entirely when `prefers-reduced-motion: reduce` (sets visible immediately).
- Falls back to "visible immediately" if `IntersectionObserver` is missing.
- Then **remove** the dead `.reveal` / `.hero-enter` / `data-hero-enter` / `data-parallax` attributes from 32 sites in a single mechanical pass, so no misleading hooks survive. This satisfies the brief's "no dead class names or fake animation hooks".

### 10.3 Motion language

One easing vocabulary, defined once:

```css
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);   /* entrances, reveals */
--ease-in-out-quart: cubic-bezier(0.76, 0, 0.24, 1); /* transforms, drawers */
--ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);  /* hovers, micro */
```

Durations: micro 140 ms · hover 220 ms · reveal 620 ms · drawer 380 ms · modal 320 ms. Replaces the current scatter (0.16, 0.2, 0.28, 0.3, 0.4, 0.42, 0.5, 0.7, 1.0, 2.0, 8.0, 20-30s).

### 10.4 Intensity levels (admin-controlled)

`animationSettings.intensity` maps to a `data-motion` attribute on `<html>`:

- `off` → all motion disabled; reveals become instant.
- `subtle` → reveals + hover only; no ambient layers, no parallax, no particles.
- `full` → everything, desktop-enhanced.

### 10.5 Desktop enhancements (progressive, never required)

- Ambient hero layer: extend `HeroAtmosphere` with a second orbital ring group. Already correctly gated on `(hover: hover) and (pointer: fine)` **and** `prefers-reduced-motion` (`:23-24`) — that pattern is the template for all of it.
- Cursor-reactive accent: `CustomCursor` already does rAF/LERP with `pointer-events: none !important` throughout (`:188-217`) and states hovering via a class without cancelling events (`:270-288`). That is the correct, non-blocking pattern; the cursor's *visual* states get upgraded, never its hit-testing.
- Card hover: a single `--mx/--my` custom-property light-follow, driven by one `pointermove` on the card, updated in rAF, **not** a per-mouse-move listener per card. Disabled on coarse pointers.
- Nav morph: the existing `scrolled` boolean (`Navigation:44-56`, already rAF-throttled and passive) drives shell height, blur, and border — extend it rather than adding a scroll listener.
- Magnetic buttons: transform-only, capped at ~4 px, desktop-only, and **must not** affect hit-testing (the repo already has a commit history of "magnetic cursor blocking clicks" and "non-blocking rAF/LERP" — these are regressions to not repeat).

### 10.6 Mobile

- No parallax, no cursor layer, no particles (already true for `HeroAtmosphere`).
- `backdrop-filter: none` and opaque backgrounds at ≤1023px and on iOS — the guards already exist at `index.css:467-528` and must be extended to every new glass surface.
- Reveals shortened to opacity-only.
- Drawers/modals become bottom sheets with `dvh` units (already the pattern at `Literature:265`, `Media:191`).
- `touch-action` discipline preserved; `overscroll-behavior: contain` on every new scroll container.

### 10.7 Smooth scrolling

`html { scroll-behavior: smooth; scroll-padding-top: 90px }` (`index.css:25-27`) plus `App.handleNavigate`'s manual `scrollY - 90` offset (`App.tsx:76`). Keep native smooth scroll — **no scroll hijacking, no custom scroll library**. The existing instant-jump-then-glide two-stage scroll is jarring and becomes one coherent motion by making `handleNavigate` respect the anchor's real offset.

### 10.8 Reduced motion

Already global at `index.css:531-543`. Verify every new effect honours it, and add an explicit `animationSettings.enabled === false` path that is independent of the OS preference.

---

## 11. PERFORMANCE & MAINTAINABILITY PLAN

| Action | Fixes |
|---|---|
| Add `build.rollupOptions.output.manualChunks` — split `react`/`react-dom`, `gsap`, `lucide-react`, and per-section chunks | 332 KB main chunk |
| Remove `@supabase/supabase-js` (zero imports) | Dead dep |
| Remove dead CSS: `.aurora-orb`/`.aurora-1/2/3`, `.noise-overlay::after`, `.animate-fade-up`, `.shimmer`, the duplicated iOS/mobile `backdrop-filter` blocks (`index.css:467-504` and `:781-804` are near-identical) | §1.5 item 8 |
| Build a real search index (memoized per `data`) with tokenization + ranking; delete the dead `result.text` | R30 |
| Debounce cloud PUT; flush on unload | R1 |
| Scoped partial PUT for settings | R1, R3 |
| Games: `IntersectionObserver` prefetch + matching skeleton size | R32 |
| Snake: stable rAF loop via ref, DPR scaling | R31 |
| Add `noUnusedLocals: true` to `tsconfig.app.json` after dead code is cleared | Silent dead code |
| Extract `src/components/admin/` primitives | 1794-line file |
| Centralise section ids in one registry shared by client + server | R5 |
| Set `"noUnusedLocals": true` only after the cleanup lands, so it doesn't block the whole migration | — |

**Guardrail: no new runtime dependency.** GSAP is already present and sufficient (it powers the two best motion effects in the app). Everything else — minimax, particles, reveal, tilt, light-follow — is hand-writable and small.

---

## 12. FILE-BY-FILE CHANGE MAP

### New files

| Path | Purpose | Phase |
|---|---|---|
| `public/robots.txt` | Crawl policy + sitemap pointer | 4 |
| `public/sitemap.xml` | URL list | 4 |
| `public/site.webmanifest` | PWA manifest | 4 |
| `public/apple-touch-icon.png`, `public/og-image.png` | Head assets | 4 |
| `scripts/prerender.ts` + `build` hook | Static crawlable HTML | 4 |
| `vercel.json` | Explicit SPA rewrite + headers | 4 |
| `src/lib/normalize.ts` | **Extracted normalization** for all new keys | 2 |
| `src/hooks/useReveal.ts` | Shared IntersectionObserver reveal | 5 |
| `src/hooks/useFocusTrap.ts` | Focus trap + restore | 4 |
| `src/components/Overlay.tsx` | Shared premium dialog shell (scrim, panel, header, close) | 4/5 |
| `src/components/Section.tsx` | Shared section shell + heading (kills 7× duplicated eyebrow/h2/heading-line) | 3/5 |
| `src/components/admin/primitives.tsx` | Extracted admin primitives + `TagEditor` | 2 |
| `src/components/admin/ConfirmDialog.tsx` | Delete confirmation | 2 |
| `src/components/admin/useUnsavedChanges.ts` | Form guard | 2 |
| `src/components/admin/panels/*` | One file per new tab | 2 |
| `src/components/games/registry.ts` | Single game source of truth | 7 |
| `src/components/games/{MemoryMatch,TwentyFortyEight,RockPaperScissors,ReactionTap}.tsx` | New games | 7 |
| `src/components/games/TicTacToeEngine.ts` | Pure minimax + line generation | 7 |

### Modified files

| Path | Phases | Change |
|---|---|---|
| `src/lib/types.ts` | 2, 6, 7 | +10 settings interfaces, `MiniGameKind` expansion, `ChatbotFAQ` enrichment |
| `src/lib/seedData.ts` | 2 | Defaults for all 10 new keys; `url: '#'` removal; honest placeholder flags |
| `src/lib/normalize.ts` *(new, then wired)* | 2 | `undefined` = absent = keep local |
| `src/lib/DataContext.tsx` | 2, 6, 7 | Extend `normalizeData`, cloud merge, add setters, debounce PUT, fix socials clobber |
| `src/lib/sectionOrder.ts` | 2, 3 | Promoted sections, `'extra'` expansion migration, single registry |
| `src/lib/cloudData.ts` | 2 | Partial-PUT support |
| `src/lib/search.ts` | 3, 4 | Real index, ranking, `<a href="#...">` targets |
| `src/lib/chatbot.ts` | 6 | Rebrand, new dataset, synonyms, categories, actions, shadow-rule fix |
| `src/lib/utils.ts` | 4 | Keep `lockPageScroll` as-is; add `debounce`, `rafThrottle` |
| `src/lib/ToastContext.tsx` | 4 | Live region |
| `api/portfolio.js` | 2 | Extend allowlists, re-snapshot before PUT, moderation, rate limit, partial PUT, import |
| `src/App.tsx` | 3, 4, 5, 6 | New section map, `onNavigate` → chatbot, footer, JSON-LD/head sync |
| `src/components/Navigation.tsx` | 3, 4, 5 | Real `<a>` links, drawer overlay, labels |
| `src/components/AIChatbot.tsx` | 6 | Actions, `role="log"`, settings-driven chips |
| `src/components/Hero.tsx` | 3, 5 | Intro, CTAs, semantic, layered atmosphere |
| `src/components/HeroAtmosphere.tsx` | 5 | Optional orbital ring layer |
| `src/components/CustomCursor.tsx` | 5 | Visual state upgrade only |
| `src/components/TiltCard.tsx` | 5, 7 | Reuse for Media cards; light-follow |
| `src/components/ReadingProgress.tsx` | 5, 4 | Premium treatment, `aria-hidden` |
| `src/components/VideoEmbed.tsx` | 3 | Shared overlay, image/audio guards |
| `src/components/AdminPanel.tsx` | 2 | **Shrink to a shell**; tabs + managers extracted |
| `src/sections/Profile.tsx` | 3, 5 | → About; skill groups |
| `src/sections/Extra.tsx` | 3 | **Dissolved** — blocks promoted to peer sections |
| `src/sections/Achievements.tsx` | 3, 5 | Peer section; timeline upgrade |
| `src/sections/Literature.tsx` | 3, 5 | Reading-lounge treatment, shared overlay |
| `src/sections/Media.tsx` | 3, 4, 5 | **P0 keyboard fix**, gallery treatment |
| `src/sections/StudyMaterial.tsx` | 3, 5 | Card treatment |
| `src/sections/FollowMe.tsx` | 3, 5 | → folded into Contact/Footer |
| `src/sections/CustomSections.tsx` | 3, 5, 7 | Heading fix, registry lookup, shared overlay |
| `src/sections/Portfolio.tsx` *(new)* | 3 | Professional layer |
| `src/sections/Contact.tsx` *(new)* | 3 | Promoted contact |
| `src/sections/Footer.tsx` *(new)* | 3 | Premium footer, sitemap links |
| `src/components/games/TicTacToe.tsx` | 7 | Minimax, 4×4, a11y |
| `src/components/games/Snake.tsx` | 7 | Difficulty, DPR, stable loop |
| `src/index.css` | 2, 4, 5 | **Token layer, remove `.premium-bg` override block, remove dead CSS, motion language** |
| `tailwind.config.js` | 5 | Extend with the real palette/radius/shadow scale |
| `index.html` | 4 | Canonical, OG/Twitter, JSON-LD, preloads |
| `package.json` | 2, 11 | Remove `@supabase`; add any scripts |
| `tsconfig.app.json` | 11 | `noUnusedLocals: true` at the end |
| `vite.config.ts` | 4, 11 | Prerender hook + `manualChunks` |

---

## 13. PHASED ROLLOUT PLAN

| Phase | Scope | Gate before moving on |
|---|---|---|
| **0** ✅ | Deep inspection; this document | — |
| **1** | Branch + plan | User approval |
| **2** | Types, seed, normalization, DataContext, cloudData, api/portfolio.js, admin data plumbing. **Zero visual change.** | Old-bin load test; new-bin load test; offline test; partial-absent-key test |
| **3** | Public section restructure, Hero/About/Portfolio/Contact/Footer, nav, internal links | Every section still renders; section order still applies; visibility still applies |
| **4** | SEO, robots, sitemap, prerender, JSON-LD, headings, a11y, standards | Lighthouse/a11y audit; keyboard walkthrough; axe pass |
| **5** | Visual system, tokens, `.premium-bg` removal, motion, reveal, hover, mobile/desktop | Reduced-motion pass; Lighthouse perf regression check |
| **6** | Chatbot rebrand, engine, actions, admin settings | Recruiter-mode walkthrough |
| **7** | Games: TicTacToe, Snake, 4 new, registry, admin | Every game keyboard-operable; mobile tap-through |
| **8** | QA checklist + rollout strategy | Full matrix sign-off |

**Ordering rationale:** data before UI (a new section with no data contract breaks everything), data before SEO (prerender reads the normalized data model), SEO before visual (prerender output must not be invalidated by a restyle), and the `.premium-bg` removal last-but-one because it is the highest-blast-radius visual change and needs the token layer from Phase 5 to land first.

**Rollback strategy:** every phase is one or more commits on this branch, ordered, each independently revertible. Phase 2 is the only one that can lose data, and it is gated by the "absent key = keep local" invariant. **Before Phase 2 ships, export the live JSONBin record and keep it as the recovery artifact.**

---

## 14. VALIDATION STRATEGY

### 14.1 Data integrity (the real gate)

| Test | Method | Pass criterion |
|---|---|---|
| Old bin, no new keys | Load a pre-change record | All new keys fall back to seed; nothing renders `undefined`; no crash |
| New bin, all keys | Load a post-change record | Round-trips exactly |
| Partial keys | Record with `portfolioSettings` but no `seoSettings` | Each key independently defaults; **no cross-key wipe** |
| Junk values | `portfolioSettings: "hello"`, `portfolioBlocks: [{nope:1}]` | Normalized away; app still renders |
| Offline | Block `/api` | localStorage mirror works; `syncStatus: 'offline'`; no data loss |
| Re-login | Log out, log in | Cloud record matches what was saved |
| **Cross-tab** | Two tabs, admin in both | No silent loss (fixes R3) |
| Guestbook race | Submit while admin saves | Entry survives (fixes R3) |
| Socials clobber | Edit socials URL, then save profile | Both changes survive (fixes R4) |
| Export → import | Round-trip | Identical record |
| Per-section reset | Reset portfolio only | Other sections untouched |

### 14.2 SEO

Crawler text extraction on the **prerendered** HTML must show the name, role, bio, section headings, and internal links. `<noscript>` verified. JSON-LD validated against schema.org. `robots.txt` + `sitemap.xml` served in `dist/`. Lighthouse SEO = 100. Canonical resolves. One H1. No heading skips.

### 14.3 Accessibility

axe DevTools clean on all pages and all four overlay states. Full keyboard walkthrough of every interactive element including all six games. VoiceOver/NVDA spot check. Focus visible on every focusable element. No focus trap leaks. `prefers-reduced-motion` verified for all motion. 200% zoom. Contrast ≥ 4.5:1 (3:1 for large text).

### 14.4 Responsive

320 / 375 / 414 / 768 / 1024 / 1440 / 1920 px. Real iPhone + Android, real iPad. No horizontal scroll at any width. No layout shift > 100 px (CLS < 0.1). Touch targets ≥ 44 px. Drawer/modals stable on iOS Safari with the URL bar collapsing.

### 14.5 Performance

Lighthouse before/after per phase. Main chunk target < 200 KB. Games not fetched until near-viewport. Admin chunk never fetched on public pages. No long tasks > 50 ms during scroll. FPS ≥ 55 while scrolling on a mid-range device. `backdrop-filter` never active at ≤1023px.

### 14.6 High-risk areas to test first

| Area | Why it is risky |
|---|---|
| `.premium-bg` removal (`index.css:843-864`) | Highest blast radius — 22 rules rewriting utilities by attribute selector across every component. Must be replaced by real tokens, not deleted. |
| Promoted sections + `'extra'` migration | Touches `sectionOrder`, `App`, `Extra`, **and** the server allowlists simultaneously. A partial deploy silently drops ids (R5). |
| `PUT` re-snapshot | Changes write semantics for every existing client. If done wrong it reintroduces data loss. |
| Prerender + React 18 hydration | Mismatch warnings or double-render if the prerendered markup and the client tree differ. Needs `suppressHydrationWarning` discipline. |
| Overlay refactor | 4 overlays with inconsistent structures and an undocumented z-index order. Consolidating them is where focus bugs will appear. |
| `.reveal` removal | 32 mechanical edits across 9 files. A missed site leaves a bare `data-hero-enter` attribute. |
| Games registry | `MiniGameKind` expansion touches normalization, admin select, display, and dispatch simultaneously. |
| Debounced PUT | Must not lose the last edit; needs a flush path on unload. |

---

## 15. EXPLICIT NON-GOALS

Stated so they are not silently assumed:

- **No router migration.** The brief permits deferring it; the SPA + prerender path covers the SEO requirement without the churn.
- **No SSR framework.** Not needed for a single-page personal site.
- **No new runtime dependencies.**
- **No change** to admin auth internals: pbkdf2 parameters, HMAC cookie format, `__adminAuth` handling, or `publicSnapshot` stripping.
- **No fake content.** Seed data is flagged as demo content in the admin, and `example.com` email / `url: '#'` study links are replaced with a genuine "add your real links" state rather than shipped as-is.
- **No GSAP ScrollTrigger reintroduction.** IntersectionObserver does the same job at a fraction of the cost, and the old implementation was already deleted as dead code.
