import type { SeoSettings } from './types';

/**
 * Runtime document-head management.
 *
 * `index.html` carries a static fallback so a crawler that does not run
 * JavaScript still sees a title, a description and an H1 (see the
 * `<noscript>` block). Everything an admin controls is applied here so the
 * served metadata follows the record instead of drifting from it.
 *
 * Every write is idempotent and guarded: `setMeta` only touches `content` when
 * the value actually changed, so this does not invalidate the preload scanner
 * or churn the DOM on every render.
 */

export interface HeadProfile {
  name: string;
  title: string;
  tagline: string;
  bio: string;
  location: string;
  socials: { label: string; url: string }[];
  works: { title: string; type: string; date: string; category: string }[];
  awards: { title: string; description: string; date: string }[];
}

const ORIGIN_FALLBACK = 'https://example.com';

function originOf(siteUrl: string): string {
  const trimmed = siteUrl.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return typeof window !== 'undefined' ? window.location.origin : ORIGIN_FALLBACK;
  }
  return trimmed;
}

function upsertMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  if (typeof document === 'undefined') return;
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  if (element.content !== content) element.content = content;
}

function upsertCanonical(href: string) {
  if (typeof document === 'undefined') return;
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}

function upsertJsonLd(payload: unknown) {
  if (typeof document === 'undefined') return;
  let script = document.head.querySelector<HTMLScriptElement>('script[data-seo="jsonld"]');
  if (!payload) {
    script?.remove();
    return;
  }
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.seo = 'jsonld';
    document.head.appendChild(script);
  }
  const next = JSON.stringify(payload);
  if (script.textContent !== next) script.textContent = next;
}

function absolute(url: string, origin: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** The social profile whose host best matches a platform name. */
function sameAsOf(socials: { label: string; url: string }[]) {
  return socials.map((social) => social.url).filter((url) => /^https?:\/\//i.test(url));
}

function buildJsonLd(seo: SeoSettings, profile: HeadProfile, origin: string) {
  const person: Record<string, unknown> = {
    '@type': 'Person',
    '@id': `${origin}/#person`,
    name: profile.name,
    jobTitle: profile.title,
    description: profile.bio,
    url: `${origin}/`,
    slogan: profile.tagline,
  };

  if (profile.location) {
    person.homeLocation = { '@type': 'Place', name: profile.location };
  }
  const sameAs = sameAsOf(profile.socials);
  if (sameAs.length > 0) person.sameAs = sameAs;

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      url: `${origin}/`,
      name: profile.name,
      description: seo.description,
      inLanguage: 'en',
      publisher: { '@id': `${origin}/#person` },
    },
    {
      '@type': 'ProfilePage',
      '@id': `${origin}/#webpage`,
      url: `${origin}/`,
      name: seo.title,
      description: seo.description,
      isPartOf: { '@id': `${origin}/#website` },
      about: { '@id': `${origin}/#person` },
      dateModified: new Date().toISOString().slice(0, 10),
    },
    person,
  ];

  // Published works are the strongest signal this is a writer, so each one
  // becomes a CreativeWork rather than being summarised into a single node.
  profile.works.forEach((work, index) => {
    graph.push({
      '@type': work.type === 'novel' ? 'Book' : 'CreativeWork',
      '@id': `${origin}/#work-${index}`,
      name: work.title,
      author: { '@id': `${origin}/#person` },
      genre: work.category || undefined,
      datePublished: work.date || undefined,
      url: `${origin}/#literature`,
      isPartOf: { '@id': `${origin}/#website` },
    });
  });

  profile.awards.forEach((award, index) => {
    graph.push({
      '@type': 'Award',
      '@id': `${origin}/#award-${index}`,
      name: award.title,
      description: award.description,
      date: award.date || undefined,
      recipient: { '@id': `${origin}/#person` },
    });
  });

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

export function applyHead(seo: SeoSettings, profile: HeadProfile) {
  if (typeof document === 'undefined') return;

  const origin = originOf(seo.siteUrl);
  const canonical = `${origin}/`;
  const ogImage = absolute(seo.ogImage, origin);

  document.title = seo.title;
  upsertCanonical(canonical);

  upsertMeta('meta[name="description"]', 'name', 'description', seo.description);
  upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'profile');
  upsertMeta('meta[property="og:title"]', 'property', 'og:title', seo.title);
  upsertMeta('meta[property="og:description"]', 'property', 'og:description', seo.description);
  upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
  upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', profile.name);
  upsertMeta('meta[property="og:locale"]', 'property', 'og:locale', 'en_US');
  upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', seo.title);
  upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', seo.description);

  if (seo.twitterHandle) {
    upsertMeta('meta[name="twitter:creator"]', 'name', 'twitter:creator', `@${seo.twitterHandle}`);
    upsertMeta('meta[name="twitter:site"]', 'name', 'twitter:site', `@${seo.twitterHandle}`);
  }

  if (ogImage) {
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', ogImage);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', ogImage);
  }

  if (seo.keywords.length > 0) {
    upsertMeta('meta[name="keywords"]', 'name', 'keywords', seo.keywords.join(', '));
  }

  // The only place a noindex can appear: an admin opting out. Defaults to
  // indexable, so a missing or junk field can never de-index a live site.
  upsertMeta('meta[name="robots"]', 'name', 'robots', seo.indexable ? 'index, follow' : 'noindex, nofollow');

  upsertJsonLd(seo.jsonLdEnabled ? buildJsonLd(seo, profile, origin) : null);
}
