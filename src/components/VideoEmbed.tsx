import { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { isDirectAudioUrl, isImageUrl, resolveVideoSource } from '@/lib/media';

/**
 * Renders a video the only way it can actually work.
 *
 * `<iframe>` is reserved for hosts that explicitly allow framing (YouTube,
 * Vimeo). Every other URL either plays natively from a direct file link or
 * degrades to an external link card — which is what removes the
 * "Refused to connect" errors an iframe produces on X-Frame-Options-protected
 * sites.
 */
export function VideoPlayer({ url, title }: { url: string; title: string }) {
  const source = useMemo(() => resolveVideoSource(url), [url]);

  if (source.kind === 'embed') {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black/90">
        <iframe
          src={source.src}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }

  if (source.kind === 'file') {
    return (
      <video
        controls
        autoPlay
        playsInline
        preload="metadata"
        src={source.src}
        className="max-h-[75dvh] w-full rounded-2xl bg-black"
      >
        Your browser does not support HTML5 video.
      </video>
    );
  }

  return <ExternalLinkCard url={source.url} label={source.label} title={title} />;
}

/** Media preview for custom sections: image, video or audio, auto-detected. */
export function MediaPreview({ url, title }: { url: string; title: string }) {
  const value = url.trim();
  const source = useMemo(() => resolveVideoSource(value), [value]);

  if (!value) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        No media URL is set for “{title}”. Add one from the admin panel.
      </p>
    );
  }

  if (source.kind !== 'external') return <VideoPlayer url={value} title={title} />;

  if (isDirectAudioUrl(source.url)) {
    return (
      <audio controls preload="none" src={source.url} className="w-full">
        Your browser does not support audio playback.
      </audio>
    );
  }

  if (isImageUrl(source.url)) {
    return (
      <img
        src={source.url}
        alt={title}
        loading="lazy"
        decoding="async"
        className="w-full rounded-2xl border border-white/70 shadow-[0_10px_30px_rgba(29,29,31,0.08)]"
      />
    );
  }

  return <ExternalLinkCard url={source.url} label={source.label} title={title} />;
}

/** Fallback card for URLs no iframe is allowed to embed. */
export function ExternalLinkCard({ url, label, title }: { url: string; label: string; title: string }) {
  if (!url) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        No link is set for “{title}”. Add one from the admin panel.
      </p>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="external-card flex flex-col items-center gap-3 rounded-2xl px-6 py-10 text-center"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full glass text-cyan-700">
        <ExternalLink size={24} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-lg font-bold text-slate-800">Watch “{title}” on {label}</span>
        <span className="mt-1 block text-sm text-slate-500">
          This host blocks embedded playback, so it opens in a new tab instead.
        </span>
      </span>
    </a>
  );
}
