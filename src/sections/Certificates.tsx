import { useMemo, useState } from 'react';
import { Award, ExternalLink, ShieldCheck, Star } from 'lucide-react';
import Section from '@/components/Section';
import { RevealGroup } from '@/components/Reveal';
import Overlay from '@/components/Overlay';
import TiltCard from '@/components/TiltCard';
import { sounds } from '@/lib/sound';
import { formatDate } from '@/lib/utils';
import type { Certificate } from '@/lib/types';

interface CertificatesProps {
  items: Certificate[];
}

/**
 * Rendered only when there is at least one published certificate. An empty
 * credentials section reads as "nothing here", which is worse than absent —
 * so the section hides itself entirely rather than showing a placeholder.
 */
export default function CertificatesSection({ items }: CertificatesProps) {
  const [preview, setPreview] = useState<Certificate | null>(null);

  const visible = useMemo(
    () => items
      .filter((item) => item.visible !== false)
      .sort((a, b) => Number(b.featured === true) - Number(a.featured === true)
        || b.issuedDate.localeCompare(a.issuedDate)),
    [items],
  );

  if (visible.length === 0) return null;

  return (
    <Section
      id="certificates"
      eyebrow="Credentials"
      title="Certificates"
      lede="Verified credentials, with a link to the issuing body wherever one exists."
    >
      <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((certificate) => (
          <div key={certificate.id} data-reveal-item>
            <TiltCard lit maxTilt={2} className="h-full">
              <button
                type="button"
                onClick={() => { sounds.open(); setPreview(certificate); }}
                onMouseEnter={() => sounds.hover()}
                className="card card-interactive card-sheen flex h-full w-full flex-col overflow-hidden rounded-panel text-left"
              >
                {certificate.imageUrl ? (
                  <div className="relative aspect-[3/2] overflow-hidden bg-[var(--surface-2)]">
                    <img
                      src={certificate.imageUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-[var(--dur-drawer)] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
                    />
                  </div>
                ) : (
                  <span
                    aria-hidden="true"
                    className="grid aspect-[3/2] w-full place-items-center bg-gradient-to-br from-[rgba(10,130,189,0.07)] to-[rgba(97,70,223,0.07)] text-[var(--accent)]"
                  >
                    <Award size={30} />
                  </span>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {certificate.featured && (
                      <span className="chip chip-accent">
                        <Star size={10} aria-hidden="true" /> Featured
                      </span>
                    )}
                    {certificate.credentialId && (
                      <span className="chip">
                        <ShieldCheck size={10} aria-hidden="true" /> Verified
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2.5 font-display text-[15px] font-bold leading-snug tracking-tight text-[var(--ink)]">
                    {certificate.title}
                  </h3>
                  {certificate.issuer && (
                    <p className="mt-1 text-[12.5px] font-medium text-[var(--ink-2)]">{certificate.issuer}</p>
                  )}
                  <p className="mt-auto pt-3 text-[11px] text-[var(--faint)]">
                    Issued {formatDate(certificate.issuedDate)}
                  </p>
                </div>
              </button>
            </TiltCard>
          </div>
        ))}
      </RevealGroup>

      {preview && (
        <Overlay open onClose={() => { sounds.close(); setPreview(null); }} labelledBy="certificate-title" variant="sheet">
          <div className="relative z-10 shrink-0 border-b border-[var(--line)] bg-[var(--surface-2)] px-5 py-4 pr-14">
            <h2 id="certificate-title" className="font-display text-lg font-bold tracking-tight text-[var(--ink)]">
              {preview.title}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {preview.issuer ? `${preview.issuer} · ` : ''}Issued {formatDate(preview.issuedDate)}
            </p>
          </div>
          <div className="scroll-y min-h-0 flex-1 p-5">
            {preview.imageUrl && (
              <img
                src={preview.imageUrl}
                alt={preview.title}
                className="w-full rounded-card border border-[var(--line)]"
              />
            )}
            <dl className="mt-5 space-y-3 text-sm">
              {preview.credentialId && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--faint)]">Credential ID</dt>
                  <dd className="mt-0.5 font-mono text-[13px] text-[var(--ink-2)]">{preview.credentialId}</dd>
                </div>
              )}
              {preview.credentialUrl && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--faint)]">Verify</dt>
                  <dd className="mt-1">
                    <a
                      href={preview.credentialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onMouseEnter={() => sounds.hover()}
                      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent)] hover:underline"
                    >
                      Open credential <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </Overlay>
      )}
    </Section>
  );
}
