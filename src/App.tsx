import { lazy, Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { DataProvider, useData } from '@/lib/DataContext';
import { ToastProvider, useToast } from '@/lib/ToastContext';
import { sounds, setSoundEnabled, isSoundEnabled } from '@/lib/sound';
import type { SectionId } from '@/lib/types';
import type { PortfolioSearchResult } from '@/lib/search';

import MagneticCursor from '@/components/MagneticCursor';
import ReadingProgress from '@/components/ReadingProgress';
import Navigation from '@/components/Navigation';
import Hero from '@/sections/Hero';
import ProfileSection from '@/sections/Profile';
import Literature from '@/sections/Literature';
import Media from '@/sections/Media';
import StudyMaterialSection from '@/sections/StudyMaterial';
import FollowMe from '@/sections/FollowMe';
import Extra from '@/sections/Extra';

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
    <div className="premium-bg noise-overlay min-h-screen relative app-root gpu-accelerated">
      {/* Premium effects */}
      <MagneticCursor />
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
      <main className="relative z-10 gpu-layer">
        <Hero profile={data.profile} visitorCount={data.visitorCount} onNavigate={handleNavigate} />
        {visibleSectionOrder.map((id) => {
          const render = sectionRenderers[id];
          return render ? render() : null;
        })}
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
