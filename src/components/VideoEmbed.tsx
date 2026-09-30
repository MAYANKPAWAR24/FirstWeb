import { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { isDirectAudioUrl, isImageUrl, resolveVideoSource, hostLabel, normalizeUrl } from '@/lib/media';

/**
 * Media rendering.
 *
 * `resolveVideoSource` is the single decision point for what a URL is, so the
 * card and the lightbox can never disagree about whether something is
 * embeddable. Only hosts that permit framing are ever put in an `<iframe>`;
 * anything else gets an explicit external card rather than a broken player.
 */
export function VideoPlayer({ url, title }: { url: string; title: string }) {
  const source = useMemo(() => resolveVideoSource(url), [url]);

  if (source.kind === 'embed') {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-panel border border-[var(--line)] bg-black">
        <iframe
          src={source.src}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          loading="lazy"
          className="h-full w-full border-0"
        />
      </div>
    );
  }

  if (source.kind === 'file') {
    return (
      <video
        src={source.src}
        controls
        playsInline
        preload="metadata"
        className="max-h-[70dvh] w-full rounded-panel border border-[var(--line)] bg-black"
      >
        <track kind="captions" />
      </video>
    );
  }

  return <ExternalLinkCard url={normalizeUrl(url)} label={source.label} title={title} />;
}

export function MediaPreview({ url, title }: { url: string; title: string }) {
  if (!url.trim()) {
    return (
      <p className="rounded-card border border-dashed border-[var(--line-strong)] bg-[var(--surface-2)] px-4 py-6 text-center text-[13px] text-[var(--muted)]">
        No media source set yet. Add one in <strong>Admin → Section Builder</strong>.
      </p>
    );
  }

  const source = resolveVideoSource(url);
  if (source.kind !== 'external') return <VideoPlayer url={url} title={title} />;

  if (isDirectAudioUrl(url)) {
    return (
      <div className="rounded-panel border border-[var(--line)] bg-[var(--surface-2)] p-4">
        <label className="sr-only" htmlFor={`preview-audio-${title}`}>Play {title}</label>
        <audio id={`preview-audio-${title}`} controls preload="none" src={source.url} className="w-full" />
      </div>
    );
  }

  if (isImageUrl(url)) {
    return (
      <img
        src={source.url}
        alt={title}
        loading="lazy"
        decoding="async"
        className="w-full rounded-panel border border-[var(--line)] object-cover"
      />
    );
  }

  return <ExternalLinkCard url={source.url} label={source.label} title={title} />;
}

export function ExternalLinkCard({ url, label, title }: { url: string; label?: string; title: string }) {
  if (!url) {
    return (
      <p className="rounded-card border border-dashed border-[var(--line-strong)] bg-[var(--surface-2)] px-4 py-6 text-center text-[13px] text-[var(--muted)]">
        No link set for this item yet.
      </p>
    );
  }

  const host = label || hostLabel(url);

  return (
    <div className="card card-sheen rounded-panel px-6 py-10 text-center">
      <span
        aria-hidden="true"
        className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface-2)] text-[var(--accent)]"
      >
        <ExternalLink size={22} />
      </span>
      <p className="mt-4 font-display text-[15px] font-bold tracking-tight text-[var(--ink)]">
        Watch “{title}” on {host}
      </p>
      <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-[var(--muted)]">
        This host blocks embedded playback, so it opens in a new tab instead.
      </p>
      <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary mt-5">
        Open on {host}
        <ExternalLink size={14} aria-hidden="true" />
      </a>
    </div>
  );
}
