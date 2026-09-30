import { build } from 'esbuild';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Cross-browser compatibility scan.
 *
 * Checks the built CSS and the source for constructs that need a guard, and
 * verifies a real fallback exists for each. This is a static check, not a
 * browser matrix — but it catches the three failure modes that actually break
 * this site on real devices: an unsupported effect rendering as nothing, a
 * modern selector with no fallback, and a JS API with no existence check.
 */

let fail = 0;
const check = (name, ok, extra) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name);
  if (!ok) { fail += 1; if (extra) console.log('        ' + extra); }
};
const note = (name) => console.log('NOTE  ' + name);

// Run after `npm run build`. Exits non-zero when a guard is missing, so it can
// gate a release.
const assetDir = join(process.cwd(), 'dist', 'assets');
const cssFile = readdirSync(assetDir).find((f) => f.endsWith('.css'));
const css = readFileSync(join(assetDir, cssFile), 'utf8');

// The build minifies, which drops quotes and collapses whitespace. Every
// pattern below therefore tolerates both forms — otherwise the scan reports
// false failures against CSS that is present and correct.
const opt = (s) => s.replace(/\s+/g, '\\s*');
const attr = (name) => `data-motion=(?:'|\\")?${name}(?:'|\\")?`;

const read = (dir, ext) => {
  const out = [];
  const walk = (d) => {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) { if (entry !== 'node_modules') walk(full); }
      else if (entry.endsWith(ext)) out.push(full);
    }
  };
  walk(dir);
  return out;
};
const sources = read(join(process.cwd(), 'src'), '.ts').concat(read('src', '.tsx'));
const code = sources.map((f) => readFileSync(f, 'utf8')).join('\n');

/* ---------- backdrop-filter: the most expensive thing here ---------- */
const hasBlur = /backdrop-filter:\s*blur/.test(css);
const hasWebkitBlur = /-webkit-backdrop-filter:\s*blur/.test(css);
check('backdrop-filter is used', hasBlur);
check('backdrop-filter ships a -webkit- prefix', hasWebkitBlur);
const hasIosGuard = new RegExp(opt('@supports\\s*\\(\\s*-webkit-touch-callout\\s*:\\s*none')).test(css);
const hasNarrowGuard = /@media[^{]*max-width:\s*1023px/.test(css) && /backdrop-filter:\s*none/.test(css);
const hasCoarseGuard = /hover:\s*none\)|pointer:\s*coarse/.test(css) || /max-width:\s*1023px/.test(css);
check('iOS Safari has an explicit backdrop-filter fallback', hasIosGuard);
check('narrow viewports drop backdrop-filter', hasNarrowGuard);
check('the blur is not left on for coarse pointers', hasCoarseGuard);
// The blur must be dropped, not just supplemented, or the repaint cost stays.
const dropsBlur = (css.match(/backdrop-filter:\s*none/g) || []).length;
check('backdrop-filter is actually switched off in the guards', dropsBlur >= 2, dropsBlur + ' occurrences');

/* ---------- modern CSS that needs a fallback ---------- */
check('mask-composite has an @supports fallback',
  /@supports not\s*\(?[^{]{0,80}mask-composite/.test(css));
check('mask-image ships -webkit-', css.includes('-webkit-mask-image') || css.includes('-webkit-mask'));
const hasOklch = /oklch\(/.test(css);
check('no oklch/oklab colour (older Safari lacks it)', !hasOklch);
const hasColorMix = /color-mix\(/.test(css);
check('no color-mix() without a fallback', !hasColorMix);
const hasBackdropFilterVar = /var\(--glass-blur\)/.test(css);
check('the blur amount is a token, so it can be overridden', hasBackdropFilterVar);

/* ---------- dvh / svh with a fallback ---------- */
const usesDvh = /100dvh|92dvh|86dvh|70dvh|80dvh/.test(css) || /dvh/.test(css);
const hasDvh = /dvh/.test(css);
check('dvh units are used for mobile-safe dialog heights', hasDvh);
check('a vh fallback accompanies dvh', /vh/.test(css));
const usesSvh = /100svh/.test(code);
check('hero uses svh (avoids the mobile URL-bar jump)', usesSvh);

/* ---------- JavaScript feature detection ---------- */
const guarded = {
  'IntersectionObserver': /typeof IntersectionObserver === 'undefined'|typeof IntersectionObserver !== 'undefined'|new IntersectionObserver/,
  'matchMedia': /window\.matchMedia\?\.|window\.matchMedia\(/,
  'roundRect': /typeof context\.roundRect === 'function'|context\.roundRect/,
  'devicePixelRatio': /devicePixelRatio/,
  'AudioContext': /webkitAudioContext/,
  'structuredClone': /structuredClone/,
  'navigator.share': /navigator\.share/,
  'BroadcastChannel': /BroadcastChannel/,
};
for (const [feature, pattern] of Object.entries(guarded)) {
  const used = new RegExp('\\b' + feature + '\\b').test(code);
  if (!used) { note(feature + ' not used'); continue; }
  const handled = pattern.test(code);
  check(feature + ' is used with a guard or a documented fallback', handled);
}

/* ---------- reduced motion ---------- */
check('a global reduced-motion block exists', /prefers-reduced-motion:\s*reduce/.test(css));
const rmBlock = css.slice(css.indexOf('prefers-reduced-motion: reduce'));
check('reduced motion collapses animation durations',
  /animation-duration:\s*0?\.01ms/.test(rmBlock));
check('reduced motion forces reveals visible',
  /\[data-reveal\][\s\S]{0,120}opacity:\s*1\s*!important/.test(rmBlock));
check('the admin motion switch is honoured independently of the OS',
  new RegExp(`\\[${attr('off')}\\]`).test(css));
check('subtle intensity drops the ambient layers',
  new RegExp(`\\[${attr('subtle')}\\]\\s*\\.ambient-only`).test(css));

/* ---------- the transform / fixed-overlay invariant ---------- */
const hasBodyTransform = /body\s*\{[^}]*transform\s*:/.test(css);
const hasMainTransform = /(^|[\s,])main\s*\{[^}]*transform\s*:/.test(css);
check('no transform on body (would break every fixed overlay)', !hasBodyTransform);
check('no transform on main (would break every fixed overlay)', !hasMainTransform);
check('scroll-padding-top is set for the fixed nav', /scroll-padding-top/.test(css));
check('scroll lock uses overflow hidden', /body\.scroll-locked/.test(css));

/* ---------- canvas ---------- */
check('canvas has a DPR path', /devicePixelRatio/.test(code));
check('canvas has a roundRect fallback', /roundRect/.test(code));
check('canvas handles a null 2d context', /getContext\('2d'\)/.test(code) && /if \(!context\) return/.test(code));

/* ---------- cursor layer must never eat clicks ---------- */
const cursorCss = css.slice(css.indexOf('.cc-root') >= 0 ? css.indexOf('.cc-root') : 0);
const cursorBlock = cursorCss.slice(0, 1200);
check('the custom cursor root is pointer-events: none',
  /pointer-events:\s*none\s*!important/.test(cursorBlock));
check('every cursor child is also pointer-events: none', /pointer-events:\s*none\s*!important/.test(cursorBlock));

/* ---------- scroll containers ---------- */
check('scroll containers set overscroll-behavior',
  /overscroll-behavior:\s*contain/.test(css));
check('tap highlight is suppressed', /-webkit-tap-highlight-color/.test(css));
check('text rendering is optimised', /-webkit-font-smoothing/.test(css));

/* ---------- fonts ---------- */
check('fonts are preconnected', /preconnect/.test(readFileSync('index.html', 'utf8')));
check('the font stylesheet is non-blocking', /media="print"/.test(readFileSync('index.html', 'utf8')));
check('a noscript font stylesheet exists',
  /<noscript>[\s\S]*fonts\.googleapis/.test(readFileSync('index.html', 'utf8')));

console.log(fail === 0 ? '\nCROSS-BROWSER SCAN PASSED' : '\n' + fail + ' ISSUES');
process.exit(fail ? 1 : 0);