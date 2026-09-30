import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { DataProvider, useData } from '@/lib/DataContext';
import { ToastProvider } from '@/lib/ToastContext';
import { sounds, setSoundEnabled, isSoundEnabled, initSoundPreference, setSoundVolume, setGameSoundEnabled } from '@/lib/sound';
import type { SectionId, SeoSettings } from '@/lib/types';
import type { PortfolioSearchResult } from '@/lib/search';
import { SectionRule } from '@/components/Section';
import { applyHead } from '@/lib/seo';
import { isBlockHidden } from '@/lib/sectionOrder';

import CustomCursor from '@/components/CustomCursor';
import ReadingProgress from '@/components/ReadingProgress';
import Navigation from '@/components/Navigation';
import AIChatbot from '@/components/AIChatbot';
import Hero from '@/sections/Hero';
import ProfileSection from '@/sections/Profile';
import PortfolioSection from '@/sections/Portfolio';
import Literature from '@/sections/Literature';
import Media from '@/sections/Media';
import StudyMaterialSection from '@/sections/StudyMaterial';
import AchievementsSection from '@/sections/Achievements';
import CertificatesSection from '@/sections/Certificates';
import FollowMeSection from '@/sections/FollowMe';
import ContactSection from '@/sections/Contact';
import CommunitySection from '@/sections/Community';
import GamesSection from '@/sections/Games';
import CustomSections from '@/sections/CustomSections';
import Footer from '@/sections/Footer';

// The admin dashboard is heavy and never needed on first paint.
const AdminPanel = lazy(() => import('@/components/AdminPanel'));

/** Height reserved for the fixed nav, matching `scroll-padding-top`. */
const NAV_OFFSET = 96;

function AppContent() {
  const {
    data, sectionOrder, sectionVisibility, isSectionVisible,
    updateSectionOrder, addGuestbookEntry,
  } = useData();

  const [adminOpen, setAdminOpen] = useState(false);
  // The persisted preference is read during the first render so the nav toggle
  // never flashes the wrong state on load.
  const [soundOn, setSoundOn] = useState(() => initSoundPreference());
  const [activeSection, setActiveSection] = useState<SectionId>('home');
  const [searchSelection, setSearchSelection] = useState<PortfolioSearchResult | null>(null);

  const { animationSettings } = data;

  const visibleSectionOrder = useMemo(
    () => sectionOrder.filter((id) => isSectionVisible(id)),
    [sectionOrder, isSectionVisible],
  );

  const sectionRenderers: Partial<Record<SectionId, () => JSX.Element>> = {
    profile: () => <ProfileSection profile={data.profile} skillGroups={data.skillGroups} email={data.contactSettings.email || data.profile.email} />,
    portfolio: () => (
      <PortfolioSection
        settings={data.portfolioSettings}
        blocks={data.portfolioBlocks}
        onNavigate={handleNavigate}
        contactVisible={isSectionVisible('contact')}
      />
    ),
    literature: () => (
      <Literature
        poems={data.poems}
        searchTarget={searchSelection?.kind === 'literature' ? searchSelection.id : null}
      />
    ),
    media: () => (
      <Media items={data.media} searchTarget={searchSelection?.kind === 'media' ? searchSelection.id : null} />
    ),
    study: () => (
      <StudyMaterialSection
        materials={data.studyMaterials}
        searchTarget={searchSelection?.kind === 'study' ? searchSelection.id : null}
      />
    ),
    achievements: () => (
      <AchievementsSection
        items={data.achievements}
        searchTarget={searchSelection?.kind === 'achievement' ? searchSelection.id : null}
      />
    ),
    certificates: () => <CertificatesSection items={data.certificates} />,
    follow: () => <FollowMeSection profile={data.profile} />,
    contact: () => (
      <ContactSection
        settings={data.contactSettings}
        profile={data.profile}
        socials={data.profile.socials}
        showVisitorCard={isSectionVisible('visitors')}
        visitorCount={data.visitorCount}
        onSubmitted={(entry) => addGuestbookEntry({ ...entry, date: new Date().toISOString(), avatar: entry.name.charAt(0).toUpperCase() })}
      />
    ),
    community: () => (
      <CommunitySection
        entries={data.guestbook}
        onSubmit={(entry) => addGuestbookEntry({ ...entry, date: new Date().toISOString(), avatar: entry.name.charAt(0).toUpperCase() })}
      />
    ),
    games: () => (
      <GamesSection settings={data.gameSettings} leaderboard={data.leaderboardSettings} />
    ),
  };

  /* ---- Motion configuration ---------------------------------------- *
   * Written once onto <html> so every CSS and JS effect can read it.
   * `data-motion="off"` also short-circuits the custom cursor and the
   * ambient layers, so the admin's toggle genuinely stops work rather
   * than just hiding it.                                          */
  useEffect(() => {
    const level = !animationSettings.enabled || animationSettings.intensity === 'off'
      ? 'off'
      : animationSettings.intensity;
    document.documentElement.dataset.motion = level;
    document.documentElement.dataset.ambient = String(animationSettings.ambientEffects);
    document.documentElement.dataset.cursor = String(animationSettings.cursorEffects);
  }, [animationSettings]);

  /* ---- Sound policy ------------------------------------------------
   * The admin controls whether sound is permitted at all, what a first-time
   * visitor hears, and whether games may be richer. The visitor's own on/off
   * choice is local and was already restored during the first render, so
   * changing the admin policy here must not clobber it.
   *                                                               */
  useEffect(() => {
    const { allowed, gameSounds, defaultVolume } = data.soundSettings;
    setGameSoundEnabled(gameSounds);
    setSoundVolume(defaultVolume);
    // Turning the policy off always mutes. Turning it back on does *not*
    // unmute: that would override a visitor who deliberately muted.
    if (!allowed && isSoundEnabled()) {
      setSoundEnabled(false);
      setSoundOn(false);
    }
  }, [data.soundSettings]);

  /* ---- Document head ------------------------------------------------
   * The static <head> in index.html is a fallback. Everything an admin
   * controls — title, description, canonical, Open Graph, JSON-LD and
   * the noindex opt-out — is applied here so it stays in sync with the
   * record rather than drifting from it.                          */
  useEffect(() => {
    applyHead(data.seoSettings as SeoSettings, {
      name: data.profile.name,
      title: data.profile.title,
      tagline: data.profile.tagline,
      bio: data.profile.bio,
      location: data.profile.location,
      socials: data.profile.socials.filter((social) => social.visible !== false && social.url),
      works: data.poems.filter((poem) => poem.visible !== false).map((poem) => ({
        title: poem.title,
        type: poem.type,
        date: poem.date,
        category: poem.category,
      })),
      awards: data.achievements.filter((item) => item.visible !== false).map((item) => ({
        title: item.title,
        description: item.description,
        date: item.date,
      })),
    });
  }, [data.seoSettings, data.profile, data.poems, data.achievements]);

  /* ---- Active section tracking ------------------------------------- */
  useEffect(() => {
    const ids: SectionId[] = ['home', ...visibleSectionOrder];
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top of the viewport rather than the
        // last one to fire, which was how the nav could latch onto the wrong
        // section during a fast scroll.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id as SectionId);
      },
      { threshold: 0.15, rootMargin: '-96px 0px -55% 0px' },
    );
    ids.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [visibleSectionOrder]);

  const handleNavigate = useCallback((id: SectionId) => {
    const element = document.getElementById(id);
    if (!element) return;
    const top = Math.max(0, element.getBoundingClientRect().top + window.scrollY - NAV_OFFSET);
    // Native smooth scroll: no scroll hijacking, and it stays inside the
    // user's reduced-motion preference because CSS overrides `scroll-behavior`.
    window.scrollTo({ top, behavior: 'smooth' });
    setActiveSection(id);
  }, []);

  const handleSearchSelect = useCallback((result: PortfolioSearchResult) => {
    setSearchSelection(result);
    handleNavigate(result.sectionId === 'custom' ? 'home' : result.sectionId);
  }, [handleNavigate]);

  const toggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) sounds.click();
  }, [soundOn]);

  const availableTargets = useMemo(() => new Set<SectionId>(
    visibleSectionOrder as SectionId[],
  ), [visibleSectionOrder]);

  const isHidden = useCallback(
    (id: string) => isBlockHidden(sectionVisibility, id),
    [sectionVisibility],
  );

  // Only shown when the admin turned the cursor layer on AND the device is a
  // fine pointer; otherwise nothing mounts and no listeners are attached.
  const cursorEnabled = typeof document !== 'undefined'
    && document.documentElement.dataset.cursor === 'true'
    && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches === true
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches !== true;

  return (
    <div className="site-shell">
      <div className="site-drift ambient-only" aria-hidden="true" />
      <div className="site-bg" aria-hidden="true" />
      <div className="site-grid ambient-only" aria-hidden="true" />
      <div className="site-grain ambient-only" aria-hidden="true" />

      {/* Portalled to <body>, so it stays pinned to the viewport regardless of
          the layout of this tree. */}
      {cursorEnabled && <CustomCursor />}
      <ReadingProgress />

      <Navigation
        onNavigate={handleNavigate}
        onSearchSelect={handleSearchSelect}
        activeSection={activeSection}
        soundOn={soundOn}
        soundAllowed={data.soundSettings.allowed}
        onToggleSound={toggleSound}
      />

      {/* NOTE: no transform / `will-change` on <main>. It would become the
          containing block for every `position: fixed` descendant (dialogs, the
          chatbot, the nav), stranding them off-screen on long pages. */}
      <main className="relative z-10">
        <Hero
          profile={data.profile}
          hero={data.heroSettings}
          visitorCount={data.visitorCount}
          availableTargets={availableTargets}
          onNavigate={handleNavigate}
        />

        {visibleSectionOrder.map((id, index) => {
          const render = sectionRenderers[id];
          if (!render) return null;
          return (
            <div key={id}>
              {render()}
              {index < visibleSectionOrder.length - 1 && <SectionRule />}
            </div>
          );
        })}

        <SectionRule />
        <CustomSections sections={data.customSections ?? []} />

        {/* The chatbot lives inside <main> on purpose: <main> is its own
            stacking context, so section dialogs cover the launcher instead of
            it floating over the reader. */}
        <AIChatbot onNavigate={handleNavigate} isHidden={isHidden} />
      </main>

      <Footer
        settings={data.footerSettings}
        profile={data.profile}
        socials={data.profile.socials}
        onOpenAdmin={() => setAdminOpen(true)}
      />

      {adminOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-[9500] bg-[var(--page)]" aria-hidden="true" />}>
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
