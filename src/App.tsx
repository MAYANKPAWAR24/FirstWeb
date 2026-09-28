import { Fragment, useEffect, useState, useCallback } from 'react';
import { DataProvider, useData } from '@/lib/DataContext';
import { ToastProvider, useToast } from '@/lib/ToastContext';
import { sounds, setSoundEnabled, isSoundEnabled } from '@/lib/sound';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import type { SectionId } from '@/lib/types';
import type { PortfolioSearchResult } from '@/lib/search';

import MagneticCursor from '@/components/MagneticCursor';
import ReadingProgress from '@/components/ReadingProgress';
import Navigation from '@/components/Navigation';
import AdminPanel from '@/components/AdminPanel';
import Hero from '@/sections/Hero';
import ProfileSection from '@/sections/Profile';
import Literature from '@/sections/Literature';
import Media from '@/sections/Media';
import StudyMaterialSection from '@/sections/StudyMaterial';
import FollowMe from '@/sections/FollowMe';
import Extra from '@/sections/Extra';

function AppContent() {
  const { data, sectionOrder, updateSectionOrder } = useData();
  const { notify } = useToast();
  useScrollReveal();

  const [loading, setLoading] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [activeSection, setActiveSection] = useState<SectionId>('home');
  const [searchSelection, setSearchSelection] = useState<PortfolioSearchResult | null>(null);

  const sectionRenderers = {
    profile: () => <ProfileSection profile={data.profile} />,
    literature: () => <Literature poems={data.poems} searchTarget={searchSelection?.kind === 'literature' ? searchSelection.id : null} />,
    media: () => <Media items={data.media} searchTarget={searchSelection?.kind === 'media' ? searchSelection.id : null} />,
    study: () => <StudyMaterialSection materials={data.studyMaterials} searchTarget={searchSelection?.kind === 'study' ? searchSelection.id : null} />,
    follow: () => <FollowMe socials={data.profile.socials} />,
    extra: () => <Extra searchTarget={searchSelection?.kind === 'achievement' ? searchSelection.id : null} />,
  };

  // Loading screen
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(false);
      sounds.success();
    }, 1800);
    return () => clearTimeout(t);
  }, []);

  // Active section tracking via IntersectionObserver
  useEffect(() => {
    const sections: SectionId[] = ['home', ...sectionOrder];
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
  }, [loading, sectionOrder]);

  const handleNavigate = useCallback((id: SectionId) => {
    const el = document.getElementById(id);
    if (el) {
      const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 90);
      window.scrollTo({ top, behavior: 'instant' });
    }
  }, []);

  const toggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) sounds.click();
    notify(next ? 'Sound effects enabled' : 'Sound effects muted', 'info');
  }, [soundOn, notify]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="premium-bg noise-overlay min-h-screen relative">
      {/* Aurora orbs */}
      <div className="aurora-orb aurora-1" />
      <div className="aurora-orb aurora-2" />
      <div className="aurora-orb aurora-3" />

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
      <main className="relative z-10">
        <Hero profile={data.profile} visitorCount={data.visitorCount} onNavigate={handleNavigate} />
        {sectionOrder.map((id) => (
          <Fragment key={id}>{sectionRenderers[id]()}</Fragment>
        ))}
      </main>

      <footer className="relative z-10 flex justify-center py-5">
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
      <AdminPanel
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        sectionOrder={sectionOrder}
        onSectionOrderChange={updateSectionOrder}
      />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[99999] premium-bg flex flex-col items-center justify-center">
      <div className="aurora-orb aurora-1" />
      <div className="relative z-10 flex flex-col items-center">
        <div className="loader-orbit mb-6" />
        <div className="font-display text-xl font-bold gradient-text mb-2 animate-fade-in">Loading Portfolio</div>
        <div className="text-xs text-white/40">Preparing something beautiful...</div>
      </div>
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
