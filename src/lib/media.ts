/**
 * Media URL parsing.
 *
 * The Media section used to hand *any* video URL straight to an <iframe>, which
 * is why non-embeddable links died with "Refused to connect" (a real X-Frame
 *Options/CSP response, not a CORS error). Only providers that explicitly
 * allow framing ever get an <iframe> here; everything else degrades to a
 * native <video>/<audio> element or an elegant external link card.
 */

export type VideoSource =
  | { kind: 'embed'; src: string; provider: 'youtube' | 'vimeo'; title?: string }
  | { kind: 'file'; src: string }
  | { kind: 'external'; url: string; label: string };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

const DIRECT_VIDEO_EXTENSIONS = /\.(mp4|m4v|webm|ogv|ogg|mov)(?:[?#]|$)/i;
const DIRECT_AUDIO_EXTENSIONS = /\.(mp3|wav|m4a|aac|flac|oga|opus)(?:[?#]|$)/i;
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|avif|svg|bmp)(?:[?#]|$)/i;

export function isDirectVideoUrl(url: string) {
  return DIRECT_VIDEO_EXTENSIONS.test(url.trim());
}

export function isDirectAudioUrl(url: string) {
  return DIRECT_AUDIO_EXTENSIONS.test(url.trim());
}

export function isImageUrl(url: string) {
  return IMAGE_EXTENSIONS.test(url.trim());
}

/** Accepts "youtu.be/ID" pasted without a scheme, which admins do constantly. */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^(https?:)?\/\//i.test(trimmed)) {
    return trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
  }
  if (/^(data|blob):/i.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Host without the leading "www."/"m."/"music." prefixes YouTube likes to add. */
function hostOf(url: URL) {
  return url.hostname.toLowerCase().replace(/^(www\.|m\.|music\.)/, '');
}

export function extractYouTubeId(raw: string): string | null {
  const value = normalizeUrl(raw);
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const path = url.pathname;

  if (host === 'youtu.be' || host === 'www.youtu.be') {
    const id = path.slice(1).split('/')[0];
    return YOUTUBE_ID.test(id) ? id : null;
  }

  if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    const fromQuery = url.searchParams.get('v');
    if (fromQuery && YOUTUBE_ID.test(fromQuery)) return fromQuery;
    const match = path.match(/^\/(?:embed|shorts|live|v|e)\/([A-Za-z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  return null;
}

function extractVimeoId(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(normalizeUrl(raw));
  } catch {
    return null;
  }
  if (!/(^|\.)vimeo\.com$/.test(url.hostname.toLowerCase())) return null;
  const match = url.pathname.match(/(\d{6,})/);
  return match ? match[1] : null;
}

function hostLabel(raw: string) {
  try {
    return hostOf(new URL(normalizeUrl(raw))) || 'the web';
  } catch {
    return 'the web';
  }
}

export function getYouTubeThumbnail(videoId: string) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function getYouTubeEmbedUrl(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Resolves any media link into the safest way to display it.
 * Never throws, never returns an iframe src for a non-embeddable host.
 */
export function resolveVideoSource(raw: string): VideoSource {
  const value = raw.trim();
  if (!value) return { kind: 'external', url: '', label: '' };

  const youtubeId = extractYouTubeId(value);
  if (youtubeId) {
    return { kind: 'embed', src: getYouTubeEmbedUrl(youtubeId), provider: 'youtube' };
  }

  const vimeoId = extractVimeoId(value);
  if (vimeoId) {
    return { kind: 'embed', src: `https://player.vimeo.com/video/${vimeoId}`, provider: 'vimeo' };
  }

  if (isDirectVideoUrl(value)) {
    return { kind: 'file', src: normalizeUrl(value) };
  }

  // Not embeddable: a native <video> of an unknown host will only render a
  // broken frame, so hand the visitor a clean, honest link card instead.
  return { kind: 'external', url: normalizeUrl(value), label: hostLabel(value) };
}

export function isEmbeddableVideoUrl(raw: string) {
  return resolveVideoSource(raw).kind === 'embed';
}
