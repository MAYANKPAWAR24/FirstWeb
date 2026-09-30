import { seedData } from '../src/lib/seedData';
import { DEFAULT_SECTION_ORDER, PUBLIC_SECTIONS } from '../src/lib/sectionOrder';

/**
 * Build-time prerender.
 *
 * THE PROBLEM THIS SOLVES
 * =======================
 * The app is a client-rendered SPA. `index.html` shipped an empty
 * `<div id="root">`, so any crawler or audit tool that does not execute
 * JavaScript saw a page with zero words, no H1, no headings and three links.
 * Adding meta tags and JSON-LD does not fix that: metadata is not content.
 *
 * WHAT IT DOES
 * ============
 * At the end of the build it injects a real, semantic, styled HTML snapshot of
 * the site's content into `<div id="root">`. React mounts over it on the client
 * and the injected markup is discarded, so there is no hydration contract to
 * break and no duplicate content at runtime.
 *
 * The snapshot comes from `seedData`, because that is what a build can see
 * without network access. `applyHead` then rewrites the title, description,
 * canonical and JSON-LD at runtime from the live record, so the served metadata
 * always reflects what the admin actually saved.
 *
 * The injected markup is deliberately plain — no blur, no transforms, no
 * animation. It needs to render usefully with CSS disabled, which is the whole
 * point of having it.
 */

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const labelOf = (id: string) => PUBLIC_SECTIONS.find((entry) => entry.id === id)?.label ?? id;

function visible<T extends { visible?: boolean }>(items: T[]) {
  return items.filter((item) => item.visible !== false);
}

/** Strips the `# Title` line and markdown headings into a clean body. */
function prose(content: string, limit = 3): string[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 40)
    .slice(0, limit)
    .map((line) => escapeHtml(line));
}

export function renderStaticHtml(): string {
  const { profile, poems, media, achievements, studyMaterials, portfolioBlocks } = seedData;
  const sections = visible(portfolioBlocks).sort((a, b) => a.order - b.order);
  const navLabels = DEFAULT_SECTION_ORDER.map(labelOf);

  return `
<header id="home">
  <h1>${escapeHtml(profile.name)}</h1>
  <p>${escapeHtml(profile.title)}</p>
  <p>${escapeHtml(profile.tagline)}</p>
  <p>${escapeHtml(seedData.heroSettings.intro)}</p>
  <nav aria-label="Site sections">
    <ul>${navLabels.map((label) => `<li><a href="#${labelOf(label).toLowerCase().replace(/\s+/g, '-')}">${escapeHtml(label)}</a></li>`).join('')}</ul>
  </nav>
</header>

<section id="profile">
  <h2>About</h2>
  <p>${escapeHtml(profile.bio)}</p>
  ${profile.location ? `<p>Based in ${escapeHtml(profile.location)}.</p>` : ''}
  <h3>Skills</h3>
  <ul>${Object.values(seedData.skillGroups).flat().map((skill) => `<li>${escapeHtml(skill)}</li>`).join('')}</ul>
</section>

<section id="portfolio">
  <h2>${escapeHtml(seedData.portfolioSettings.title)}</h2>
  <p>${escapeHtml(seedData.portfolioSettings.intro)}</p>
  ${seedData.portfolioSettings.availabilityStatus ? `<p><strong>${escapeHtml(seedData.portfolioSettings.availabilityStatus)}</strong> — ${escapeHtml(seedData.portfolioSettings.availabilityNote)}</p>` : ''}
  ${sections.map((block) => `
  <article>
    <h3>${escapeHtml(block.title)}</h3>
    <p>${escapeHtml(block.body)}</p>
    ${block.tags.length ? `<ul>${block.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join('')}</ul>` : ''}
  </article>`).join('')}
</section>

<section id="literature">
  <h2>Literature</h2>
  <p>Published poems, novels and articles by ${escapeHtml(profile.name)}.</p>
  ${visible(poems).map((poem) => `
  <article>
    <h3>${escapeHtml(poem.title)}</h3>
    <p>${escapeHtml(poem.excerpt)}</p>
    ${prose(poem.content, 1).map((line) => `<p>${line}</p>`).join('')}
  </article>`).join('')}
</section>

<section id="media">
  <h2>Media</h2>
  <p>Photography, video and audio.</p>
  <ul>${visible(media).map((item) => `<li>${escapeHtml(item.title)} — ${escapeHtml(item.type)}, ${escapeHtml(item.category)}</li>`).join('')}</ul>
</section>

<section id="study">
  <h2>Study Material</h2>
  <p>Notes, guides and reference material.</p>
  <ul>${visible(studyMaterials).map((item) => `<li>${escapeHtml(item.title)} — ${escapeHtml(item.fileType)}</li>`).join('')}</ul>
</section>

<section id="achievements">
  <h2>Achievements</h2>
  <ul>${visible(achievements).map((item) => `<li><strong>${escapeHtml(item.title)}</strong> (${escapeHtml(item.date)}): ${escapeHtml(item.description)}</li>`).join('')}</ul>
</section>

<section id="contact">
  <h2>${escapeHtml(seedData.contactSettings.heading)}</h2>
  <p>${escapeHtml(seedData.contactSettings.intro)}</p>
  ${profile.email ? `<p><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a></p>` : ''}
  ${profile.socials.filter((social) => social.visible !== false).map((social) => `<p><a href="${escapeHtml(social.url)}" rel="noopener">${escapeHtml(social.label)}</a></p>`).join('')}
</section>

<section id="community">
  <h2>Community Notes</h2>
  <p>Notes left by visitors.</p>
  <ul>${visible(seedData.guestbook).map((entry) => `<li><strong>${escapeHtml(entry.name)}</strong>: ${escapeHtml(entry.message)}</li>`).join('')}</ul>
</section>

<footer>
  <p>${escapeHtml(seedData.footerSettings.copyright)}</p>
  <nav aria-label="Footer">
    <ul>${seedData.footerSettings.columns.flatMap((column) => column.links).filter((link) => link.section).map((link) => `<li><a href="#${escapeHtml(link.section)}">${escapeHtml(link.label)}</a></li>`).join('')}</ul>
  </nav>
</footer>
`.trim();
}

const SCRIPT_OPEN = /<div id="root"><\/div>/;
const MARKER = '<!--prerendered-->';

export function prerenderHtml(html: string): string {
  if (!SCRIPT_OPEN.test(html)) return html;
  if (html.includes(MARKER)) return html;
  return html.replace(
    SCRIPT_OPEN,
    `<div id="root">${MARKER}\n${renderStaticHtml()}\n<!--/prerendered-->`,
  );
}
