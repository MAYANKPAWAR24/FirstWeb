import { lazy, Suspense, useEffect, useState, useCallback, useMemo, Fragment } from 'react';
import { DataProvider, useData } from '@/lib/DataContext';
import { ToastProvider, useToast } from '@/lib/ToastContext';
import { sounds, setSoundEnabled, isSoundEnabled } from '@/lib/sound';
import type { SectionId } from '@/lib/types';
import type { PortfolioSearchResult } from '@/lib/search';

import CustomCursor from '@/components/CustomCursor';
import ReadingProgress from '@/components/ReadingProgress';
import Navigation from '@/components/Navigation';
import AIChatbot from '@/components/AIChatbot';
import Hero from '@/sections/Hero';
import ProfileSection from '@/sections/Profile';
import Literature from '@/sections/Literature';
import Media from '@/sections/Media';
import StudyMaterialSection from '@/sections/StudyMaterial';
import FollowMe from '@/sections/FollowMe';
import Extra from '@/sections/Extra';
import CustomSections from '@/sections/CustomSections';

// The admin dashboard is heavy and never needed on first paint.
const AdminPanel = lazy(() => import('@/components/AdminPanel'));

function AppContent() {
  const { data, sectionOrder, isSectionVisible, updateSectionOrder } = useData();
  const { notify } = useToast();

  const [adminOpen, setAdminOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [activeSection, setActiveSection] = useState<SectionId>('home');
  const [searchSelection, setSearchSelection] = useState<PortfolioSearchResult | null>(null);

  // Sections hidden by the admin are dropped from the public render entirely.
  const visibleSectionOrder = useMemo(
    () => sectionOrder.filter((id) => isSectionVisible(id)),
    [sectionOrder, isSectionVisible]
  );

  const sectionRenderers: Partial<Record<SectionId, () => JSX.Element>> = {
    profile: () => <ProfileSection profile={data.profile} />,
    literature: () => <Literature poems={data.poems} searchTarget={searchSelection?.kind === 'literature' ? searchSelection.id : null} />,
    media: () => <Media items={data.media} searchTarget={searchSelection?.kind === 'media' ? searchSelection.id : null} />,
    study: () => <StudyMaterialSection materials={data.studyMaterials} searchTarget={searchSelection?.kind === 'study' ? searchSelection.id : null} />,
    follow: () => <FollowMe socials={data.profile.socials} />,
    extra: () => (
      <Extra
        searchTarget={searchSelection?.kind === 'achievement' ? searchSelection.id : null}
        showAchievements={isSectionVisible('achievements')}
      />
    ),
  };

  // Active section tracking via IntersectionObserver
  useEffect(() => {
    const sections: SectionId[] = ['home', ...visibleSectionOrder];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as SectionId);
          }
        });
      },
      { threshold: 0.3, rootMargin: '-80px 0px -50% 0px' }
    );
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [visibleSectionOrder]);

  const handleNavigate = useCallback((id: SectionId) => {
    const el = document.getElementById(id);
    if (el) {
      const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 90);
      window.scrollTo({ top, behavior: 'auto' });
    }
  }, []);

  const toggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) sounds.click();
    notify(next ? 'Sound effects enabled' : 'Sound effects muted', 'info');
  }, [soundOn, notify]);

  return (
    <div className="premium-bg noise-overlay min-h-screen relative">
      {/* Premium effects. Portalled to <body>, so it stays pinned to the
          viewport regardless of the layout of this tree. */}
      <CustomCursor />
      <ReadingProgress />

      {/* Navigation */}
      <Navigation
        onNavigate={handleNavigate}
        data={data}
        onSearchSelect={(result) => {
          setSearchSelection(result);
          handleNavigate(result.sectionId);
        }}
        activeSection={activeSection}
        soundOn={soundOn}
        onToggleSound={toggleSound}
      />

      {/* Main content */}
      {/* NOTE: no transform/`will-change` on <main>. It would become the
          containing block for every `position: fixed` descendant (reading
          modal, media lightbox), which anchors them to the whole document
          instead of the viewport and strands them off-screen on long pages. */}
      <main className="relative z-10">
        <Hero profile={data.profile} visitorCount={data.visitorCount} onNavigate={handleNavigate} />
          {visibleSectionOrder.map((id) => {
            const render = sectionRenderers[id];
            return render ? <Fragment key={id}>{render()}</Fragment> : null;
          })}
          {/* Admin-built sections, rendered in the Section Builder's order. */}
          <CustomSections sections={data.customSections ?? []} />
          {/* The chatbot lives inside <main> on purpose: <main> is its own
              stacking context, so the section modals (z-9000) correctly cover
              the launcher instead of it floating over the reader. */}
          <AIChatbot />
      </main>

      <footer className="relative z-10 flex justify-center py-5 gpu-layer">
        <button
          type="button"
          onClick={() => setAdminOpen(true)}
          className="text-[10px] text-white/20 transition-colors hover:text-white/55 focus-visible:text-white/70"
          aria-label="Open admin panel"
          title="Admin"
        >
          Admin
        </button>
      </footer>

      {/* Overlays */}
      {adminOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-[9500] premium-bg gpu-accelerated" aria-hidden="true" />}>
          <AdminPanel
            open={adminOpen}
            onClose={() => setAdminOpen(false)}
            sectionOrder={sectionOrder}
            onSectionOrderChange={updateSectionOrder}
          />
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </DataProvider>
  );
}
