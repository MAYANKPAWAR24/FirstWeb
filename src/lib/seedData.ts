import type { PortfolioData } from './types';

/**
 * Defaults for a first visit with no local record and no reachable cloud.
 *
 * Two things are deliberate here:
 *
 *  - `profile.email` is empty rather than `example.com`. A reserved,
 *    non-routable domain shipped as the primary contact reads as broken, and
 *    the Contact section renders a "set your real email" state instead of a
 *    link that goes nowhere.
 *  - `studyMaterials` carry no `url`. The old seed used `url: '#'`, which put
 *    four dead download links on the public page.
 *
 * Everything else is demo content the admin replaces. The admin panel labels
 * it as such rather than presenting it as verified fact.
 */
export const seedData: PortfolioData = {
  visitorCount: 0,
  profile: {
    name: 'MAYANK PAWAR',
    title: 'Writer · Developer · Creator',
    tagline: 'Crafting words into worlds, code into art.',
    bio: "I'm MAYANK PAWAR, a writer and software developer who finds beauty at the intersection of literature and technology. My journey spans from penning heartfelt poetry to building elegant digital experiences. I believe every line of code and every verse of poetry shares the same goal: to move people.",
    photo: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=600',
    email: '',
    location: 'Bengaluru, India',
    skills: [
      'Creative Writing', 'TypeScript', 'React', 'Poetry', 'Storytelling',
      'UI/UX Design', 'Photography', 'Public Speaking', 'Node.js', 'Tailwind CSS',
    ],
    highlights: [
      { label: 'Poems Published', value: '48' },
      { label: 'Novels Written', value: '3' },
      { label: 'Projects Built', value: '27' },
      { label: 'Awards Won', value: '12' },
    ],
    socials: [
      // Every platform in SOCIAL_PLATFORMS ships as an entry so it can be
      // switched on from Admin -> Site without any code change. The visible
      // ones are the ones actually used; the rest are staged and hidden.
      { id: 'instagram', label: 'Instagram', url: 'https://instagram.com/mayankpawar', icon: 'Instagram', visible: true },
      { id: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com/in/mayankpawar', icon: 'Linkedin', visible: true },
      { id: 'github', label: 'GitHub', url: 'https://github.com/mayankpawar', icon: 'Github', visible: true },
      { id: 'twitter', label: 'X / Twitter', url: 'https://x.com/mayankpawar', icon: 'Twitter', visible: true },
      { id: 'youtube', label: 'YouTube', url: 'https://youtube.com/@mayankpawar', icon: 'Youtube', visible: true },
      { id: 'threads', label: 'Threads', url: 'https://threads.net/@mayankpawar', icon: 'AtSign', visible: true },
      { id: 'telegram', label: 'Telegram', url: 'https://t.me/mayankpawar', icon: 'Send', visible: true },

      { id: 'facebook', label: 'Facebook', url: 'https://facebook.com/mayankpawar', icon: 'Facebook', visible: false },
      { id: 'snapchat', label: 'Snapchat', url: '', icon: '', visible: false },
      { id: 'pinterest', label: 'Pinterest', url: '', icon: '', visible: false },
      { id: 'tiktok', label: 'TikTok', url: '', icon: '', visible: false },
      { id: 'reddit', label: 'Reddit', url: '', icon: 'MessageCircle', visible: false },
      { id: 'tumblr', label: 'Tumblr', url: '', icon: '', visible: false },
      { id: 'bluesky', label: 'Bluesky', url: '', icon: '', visible: false },
      { id: 'mastodon', label: 'Mastodon', url: '', icon: '', visible: false },
      { id: 'medium', label: 'Medium', url: '', icon: '', visible: false },
      { id: 'substack', label: 'Substack', url: '', icon: '', visible: false },
      { id: 'behance', label: 'Behance', url: '', icon: '', visible: false },
      { id: 'dribbble', label: 'Dribbble', url: '', icon: '', visible: false },
      { id: 'gitlab', label: 'GitLab', url: '', icon: '', visible: false },
      { id: 'devto', label: 'DEV', url: '', icon: '', visible: false },
      { id: 'codepen', label: 'CodePen', url: '', icon: '', visible: false },
      { id: 'stackoverflow', label: 'Stack Overflow', url: '', icon: '', visible: false },
      { id: 'spotify', label: 'Spotify', url: '', icon: '', visible: false },
      { id: 'soundcloud', label: 'SoundCloud', url: '', icon: 'Music', visible: false },
      { id: 'twitch', label: 'Twitch', url: '', icon: '', visible: false },
      { id: 'vimeo', label: 'Vimeo', url: '', icon: '', visible: false },
      { id: 'flickr', label: 'Flickr', url: '', icon: 'Camera', visible: false },
      { id: 'whatsapp', label: 'WhatsApp', url: '', icon: '', visible: false },
      { id: 'discord', label: 'Discord', url: '', icon: '', visible: false },
      { id: 'signal', label: 'Signal', url: '', icon: '', visible: false },
      { id: 'email', label: 'Email', url: '', icon: 'Mail', visible: false },
    ],
  },
  poems: [
    {
      id: 'p1', type: 'poem', title: 'Whispers of Dawn', author: 'MAYANK PAWAR',
      category: 'Nature', date: '2025-08-15',
      coverGradient: 'from-cyan-500 to-blue-600',
      excerpt: 'The morning light speaks in silent syllables...',
      content: `Whispers of Dawn

The morning light speaks in silent syllables,
painting the sky in hues of quiet fire.
Each ray a verse, each shadow a stanza —
the world awakens, reading itself aloud.

Birds carry melodies like punctuation,
placing pauses between the breeze and the trees.
The dew holds last night's dreams in tiny spheres,
reflecting a sun that has only just begun to speak.

I stand at the edge of this opening page,
waiting for the day to write its first word upon me.
And somewhere between breath and belief,
I find my own dawn — whispering back.`,
    },
    {
      id: 'p2', type: 'poem', title: 'Paper Boats', author: 'MAYANK PAWAR',
      category: 'Nostalgia', date: '2025-06-20',
      coverGradient: 'from-rose-400 to-purple-500',
      excerpt: 'We folded our dreams into paper boats...',
      content: `Paper Boats

We folded our dreams into paper boats
and set them sailing on monsoon streets.
Some sank beneath the weight of rain,
some reached places we never could.

I still see them — those little vessels of hope —
bobbing past streetlights and forgotten alleys,
carrying the handwriting of children
who believed the water would know the way.

Now I am older, and the streets are drier.
But sometimes, when it pours,
I fold a quiet wish into a corner of my mind
and let it drift — just in case the rain still remembers.`,
    },
    {
      id: 'p3', type: 'poem', title: 'The Code Between Us', author: 'MAYANK PAWAR',
      category: 'Technology', date: '2025-09-01',
      coverGradient: 'from-teal-400 to-cyan-600',
      excerpt: 'In the space between semicolons and sighs...',
      content: `The Code Between Us

In the space between semicolons and sighs,
we built a language only we could read.
Functions named after inside jokes,
variables holding more than data —
they held the shape of your laughter.

We debugged each other's silence,
compiled warmth into cold syntax,
and ran programs that output nothing
but the feeling of being understood.

Now the repository sits frozen.
No new commits. No pull requests.
But somewhere in the version history,
our code still runs —
quietly, perfectly, in the background of who I am.`,
    },
    {
      id: 'n1', type: 'novel', title: 'The Last Bookshop', author: 'MAYANK PAWAR',
      category: 'Literary Fiction', date: '2025-03-10',
      coverGradient: 'from-amber-400 to-orange-600',
      excerpt: 'In a world that had forgotten how to read, one shop still remembered...',
      content: `The Last Bookshop
Chapter One: The Door That Knew Your Name

There was a bookshop at the end of Marigold Lane that didn't appear on any map. You couldn't find it by searching — it found you. The door was painted the color of old stories, deep burgundy with a brass handle shaped like a sleeping cat.

Mira first walked through it on a Tuesday she hadn't planned for. It had been raining in that indecisive way that makes you neither stay nor go. She ducked under the green awning, more to escape the drizzle than from any intention to enter. But the door swung open on its own — gently, as if it had been expecting her.

Inside, the air smelled of paper and patience. Shelves rose to the ceiling like promises, each book spine a different shade of meaning. A cat — the same one as the door handle, she was sure — sat on the counter, watching her with the calm authority of someone who had seen everything and found most of it acceptable.

"Welcome back," said the cat.

Mira blinked. "I've never been here before."

The cat's tail flicked. "That's what they all say. I've seen it a thousand times. The books remember you, even if you don't remember them."`,
    },
    {
      id: 'n2', type: 'novel', title: 'Pixels of Memory', author: 'MAYANK PAWAR',
      category: 'Sci-Fi', date: '2025-05-22',
      coverGradient: 'from-indigo-400 to-violet-600',
      excerpt: 'When memories became downloadable, forgetting became a luxury...',
      content: `Pixels of Memory
Chapter One: The Archive of Good Days

In 2047, memories became the most traded commodity on the planet. You could buy a stranger's perfect summer afternoon for twelve credits. You could sell your grandmother's laugh — if you were the sort of person who would.

Kai worked at a memory archive, the kind of place people visited the way they used to visit libraries. His job was to sort incoming memories, tag them, and file them in the great cloud of human experience.

"Today, someone walked in carrying a jar — the vessels they used now — and set it on the counter with the careful weight of surrender. 'I don't want this one anymore,' they'd say."

Until the day a woman came in with a jar that glowed a color he had never seen before — not in any archive, not in any catalog. It was the color of something he had forgotten.`,
    },
  ],
  media: [
    {
      id: 'm1', type: 'photo', title: 'Morning Fog', category: 'Nature', date: '2025-08-01',
      thumbnail: 'https://images.pexels.com/photos/1671325/pexels-photo-1671325.jpeg?auto=compress&cs=tinysrgb&w=800',
      url: 'https://images.pexels.com/photos/1671325/pexels-photo-1671325.jpeg?auto=compress&cs=tinysrgb&w=1600',
    },
    {
      id: 'm2', type: 'photo', title: 'City Lights', category: 'Urban', date: '2025-07-15',
      thumbnail: 'https://images.pexels.com/photos/2246476/pexels-photo-2246476.jpeg?auto=compress&cs=tinysrgb&w=800',
      url: 'https://images.pexels.com/photos/2246476/pexels-photo-2246476.jpeg?auto=compress&cs=tinysrgb&w=1600',
    },
    {
      id: 'm3', type: 'photo', title: 'Mountain Path', category: 'Nature', date: '2025-06-10',
      thumbnail: 'https://images.pexels.com/photos/1271619/pexels-photo-1271619.jpeg?auto=compress&cs=tinysrgb&w=800',
      url: 'https://images.pexels.com/photos/1271619/pexels-photo-1271619.jpeg?auto=compress&cs=tinysrgb&w=1600',
    },
    {
      id: 'm4', type: 'photo', title: 'Coffee & Pages', category: 'Lifestyle', date: '2025-05-05',
      thumbnail: 'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=800',
      url: 'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=1600',
    },
    {
      id: 'v1', type: 'video', title: 'Creative Process — Behind the Scenes', category: 'Vlog', date: '2025-09-12',
      thumbnail: 'https://img.youtube.com/vi/ScMzIvxBSi4/hqdefault.jpg',
      url: 'https://www.youtube.com/embed/ScMzIvxBSi4',
    },
    {
      id: 'v2', type: 'video', title: 'Poetry Reading — Live', category: 'Spoken Word', date: '2025-08-30',
      thumbnail: 'https://img.youtube.com/vi/6E5h1G5qVW8/hqdefault.jpg',
      url: 'https://www.youtube.com/embed/6E5h1G5qVW8',
    },
  ],
  studyMaterials: [
    {
      id: 'sm1', title: 'Introduction to Modern Poetry',
      description: 'A comprehensive guide covering free verse, imagery, and contemporary poetic forms.',
      fileType: 'PDF', fileSize: '2.4 MB', date: '2025-09-01',
      url: '', tags: ['Poetry', 'Beginner', 'Literature'],
    },
    {
      id: 'sm2', title: 'React + TypeScript Cheatsheet',
      description: 'Quick reference for hooks, types, patterns, and best practices in React 18.',
      fileType: 'PDF', fileSize: '1.1 MB', date: '2025-08-20',
      url: '', tags: ['React', 'TypeScript', 'Frontend'],
    },
    {
      id: 'sm3', title: 'Creative Writing Masterclass Notes',
      description: 'Lecture notes from a 6-week workshop on narrative structure, voice, and editing.',
      fileType: 'DOC', fileSize: '890 KB', date: '2025-07-15',
      url: '', tags: ['Writing', 'Workshop', 'Narrative'],
    },
    {
      id: 'sm4', title: 'Photography Composition Rules',
      description: 'Visual guide to rule of thirds, leading lines, framing, and breaking the rules.',
      fileType: 'PDF', fileSize: '3.7 MB', date: '2025-06-08',
      url: '', tags: ['Photography', 'Composition', 'Visual'],
    },
  ],
  achievements: [
    {
      id: 'a1', title: 'National Poetry Award — 1st Place',
      description: 'Won first place among 2,400+ entries for the poem "Whispers of Dawn" at the National Literary Council.',
      date: '2025-08-20', category: 'Writing', icon: 'Award',
    },
    {
      id: 'a2', title: 'Published Author — Debut Novel',
      description: 'Successfully published "The Last Bookshop" with a leading indie publisher. Reached #3 on the literary fiction chart.',
      date: '2025-03-15', category: 'Publishing', icon: 'BookOpen',
    },
    {
      id: 'a3', title: 'Speaker — Tech & Story Conference',
      description: 'Delivered a keynote on "The Intersection of Code and Creativity" to an audience of 800+ developers and writers.',
      date: '2025-01-28', category: 'Speaking', icon: 'Mic',
    },
    {
      id: 'a4', title: 'Hackathon Winner — Best UX',
      description: 'Led a team of 4 to victory in a 48-hour hackathon, building a reading app for visually impaired users.',
      date: '2024-11-12', category: 'Technology', icon: 'Trophy',
    },
    {
      id: 'a5', title: 'Photography Exhibition',
      description: 'Featured 12 photographs in a month-long solo exhibition titled "Quiet Moments" at the City Arts Gallery.',
      date: '2024-09-05', category: 'Photography', icon: 'Camera',
    },
  ],
  certificates: [],
  guestbook: [
    {
      id: 'g1', name: 'Priya Sharma',
      message: 'Your poetry moved me to tears. "Paper Boats" reminded me of my childhood during the monsoons. Thank you for sharing your gift!',
      date: '2025-09-20', avatar: 'P',
    },
    {
      id: 'g2', name: 'Rohan Kapoor',
      message: 'The Last Bookshop is hands down the best thing I have read this year. When is the next one coming out?',
      date: '2025-09-15', avatar: 'R',
    },
    {
      id: 'g3', name: 'Sara Ahmed',
      message: 'Stumbled upon your portfolio and spent an hour reading everything. Your words have a home in them. Keep writing!',
      date: '2025-09-10', avatar: 'S',
    },
  ],
  // Runtime-built sections. Empty by default: an older cloud record simply has
  // no `customSections` key, and `[]` is the safe fallback for it.
  customSections: [],
  // Admin-managed chatbot answers. Empty by default so the permanent embedded
  // dataset in `chatbot.ts` is the source of truth until the admin edits
  // something; the widget and the engine both fall back to it safely.
  chatbotFAQs: [],

  /* ---- Phase 2 defaults ---- */

  heroSettings: {
    showGreeting: true,
    intro: 'Writer and software developer working where literature meets technology. This site is both my portfolio and my reading room — professional work on one side, published writing on the other.',
    ctas: [
      { id: 'cta-primary', label: 'View My Work', target: 'portfolio' },
      { id: 'cta-secondary', label: 'Read My Writing', target: 'literature' },
      { id: 'cta-tertiary', label: 'Get in Touch', target: 'contact' },
    ],
    showStats: true,
    showVisitorCount: false,
  },

  skillGroups: {
    creative: ['Creative Writing', 'Poetry', 'Storytelling', 'Photography', 'UI/UX Design'],
    technical: ['TypeScript', 'React', 'Node.js', 'Tailwind CSS', 'API Design'],
    workflow: ['Git', 'Vite', 'Design Systems', 'Technical Writing', 'Testing'],
    communication: ['Public Speaking', 'Content Strategy', 'Community Building'],
  },

  portfolioSettings: {
    eyebrow: 'Portfolio',
    title: 'Work & Capabilities',
    intro: 'A snapshot of what I build, how I work, and where I am focused right now.',
    availabilityStatus: 'Open to collaborations',
    availabilityNote: 'Available for writing commissions, front-end work, and creative-technical collaborations.',
    resumeUrl: '',
    resumeLabel: 'Download Resume',
  },

  portfolioBlocks: [
    {
      id: 'pb-case-study',
      kind: 'case-study',
      title: 'This Website',
      body: 'A single-page personal platform built with React, TypeScript and Vite. It carries a full admin CMS, cloud sync with local fallback, a knowledge-base chatbot, six mini-games and a content model that survives schema changes without losing data.',
      tags: ['React', 'TypeScript', 'Vite', 'CMS', 'Cloud Sync'],
      url: '',
      visible: true,
      featured: true,
      order: 0,
    },
    {
      id: 'pb-summary',
      kind: 'summary',
      title: 'Professional Summary',
      body: 'I work across writing and software, and I am most useful in the overlap: explaining complex ideas clearly, and building the tools that carry them. I care about systems that stay maintainable after the first launch.',
      tags: ['Writing', 'Engineering', 'Systems'],
      url: '',
      visible: true,
      featured: false,
      order: 1,
    },
    {
      id: 'pb-capability',
      kind: 'capability',
      title: 'What I Build',
      body: 'Editorial and product interfaces, content platforms with real editing workflows, and automation that removes repetitive work. Comfortable owning a feature end to end, from data model to the last hover state.',
      tags: ['Front-end', 'Content Platforms', 'Automation'],
      url: '',
      visible: true,
      featured: false,
      order: 2,
    },
  ],

  contactSettings: {
    heading: 'Get in Touch',
    intro: 'For commissions, collaborations, or a conversation about the work — the fastest route is email.',
    email: '',
    phone: '',
    showForm: true,
    showSocials: true,
    ctaLabel: 'Send an Email',
  },

  footerSettings: {
    note: 'Built as a living portfolio: every section on this page is editable from the admin panel and syncs to the cloud.',
    copyright: `© ${new Date().getFullYear()} MAYANK PAWAR. All rights reserved.`,
    columns: [
      {
        id: 'col-explore',
        heading: 'Explore',
        links: [
          { id: 'col-explore-about', label: 'About', section: 'profile', url: '' },
          { id: 'col-explore-portfolio', label: 'Portfolio', section: 'portfolio', url: '' },
          { id: 'col-explore-literature', label: 'Literature', section: 'literature', url: '' },
          { id: 'col-explore-media', label: 'Media', section: 'media', url: '' },
        ],
      },
      {
        id: 'col-connect',
        heading: 'Connect',
        links: [
          { id: 'col-connect-contact', label: 'Contact', section: 'contact', url: '' },
          { id: 'col-connect-achievements', label: 'Achievements', section: 'achievements', url: '' },
          { id: 'col-connect-community', label: 'Community', section: 'community', url: '' },
          { id: 'col-connect-games', label: 'Play Break', section: 'games', url: '' },
        ],
      },
    ],
  },

  seoSettings: {
    title: 'MAYANK PAWAR — Writer, Developer & Creator',
    description: 'Portfolio and published writing by MAYANK PAWAR — a writer and front-end developer working across literature and technology.',
    ogImage: '/og-image.png',
    siteUrl: '',
    keywords: [
      'MAYANK PAWAR',
      'writer portfolio',
      'poetry',
      'literary fiction',
      'front-end developer',
      'React TypeScript',
    ],
    twitterHandle: '',
    jsonLdEnabled: true,
    indexable: true,
  },

  animationSettings: {
    enabled: true,
    intensity: 'full',
    ambientEffects: true,
    cursorEffects: true,
    sectionReveal: true,
    heroParallax: true,
  },

  gameSettings: {
    enabled: true,
    featured: 'tic-tac-toe',
    hidden: [],
    order: [
      'tic-tac-toe', 'memory', 'twenty-forty-eight', 'snake',
      'pulse', 'math-sprint', 'rock-paper-scissors', 'reaction',
    ],
  },

  /**
   * Sound is *allowed* by default but a visitor still opts in before hearing
   * anything — see `initSoundPreference`. Only games get a slightly richer
   * palette; interface audio stays quiet and neutral.
   */
  soundSettings: {
    allowed: true,
    gameSounds: true,
    defaultVolume: 0.5,
  },

  leaderboardSettings: {
    enabled: true,
    title: 'Top Scores',
    limit: 5,
    requireName: false,
    namePlaceholder: 'Your name',
    showLocal: true,
    // Curated by the site owner. Empty by default so nothing implies a score
    // that was never actually achieved.
    officialEntries: [],
  },

  /* ---- Resume ----
   *
   * Demo content. The `email` field is left empty on purpose elsewhere in this
   * seed for the same reason these are marked as samples: a page presenting
   * invented qualifications as fact is worse than an empty one. Replace them
   * in Admin -> Resume.
   */
  education: [
    {
      id: 'edu-1',
      institution: 'Delhi Public School',
      level: 'Senior Secondary',
      board: 'CBSE',
      field: 'Science (Physics, Chemistry, Mathematics)',
      period: '2019 – 2021',
      location: 'Bengaluru, India',
      score: '92.4%',
      scoreLabel: 'CBSE Averages',
      notes: 'Subject topper in English and Psychology.',
      visible: true,
      order: 0,
    },
    {
      id: 'edu-2',
      institution: 'National Institute of Technology',
      level: 'Bachelor of Technology',
      board: 'University',
      field: 'Computer Science & Engineering',
      period: '2021 – 2025',
      location: 'Bengaluru, India',
      score: '8.74 / 10',
      scoreLabel: 'CGPA',
      notes: 'Final-year project on an offline-first reading platform.',
      visible: true,
      order: 1,
    },
  ],

  experiences: [
    {
      id: 'exp-1',
      role: 'Freelance Front-End Developer',
      organisation: 'Independent',
      type: 'freelance',
      period: '2024 – Present',
      location: 'Remote',
      summary: 'Build and maintain content platforms for writers and small studios, from data model through to the last interaction.',
      highlights: [
        'Shipped six client sites built on a shared component system.',
        'Cut largest-contentful-paint by roughly half on a slow mobile build.',
        'Wrote the content model so editors could ship without engineering help.',
      ],
      visible: true,
      order: 0,
    },
    {
      id: 'exp-2',
      role: 'Software Engineering Intern',
      organisation: 'Product Studio',
      type: 'internship',
      period: 'Summer 2024',
      location: 'Bengaluru, India',
      summary: 'Worked on the reading experience and the admin tooling behind it.',
      highlights: [
        'Rebuilt the reading view around a single responsive typeface scale.',
        'Added keyboard navigation and focus management across all dialogs.',
      ],
      visible: true,
      order: 1,
    },
    {
      id: 'exp-3',
      role: 'Open Source Contributor',
      organisation: 'Various',
      type: 'volunteer',
      period: '2023 – Present',
      location: 'Remote',
      summary: 'Documentation, accessibility fixes and small bug reports.',
      highlights: ['Improved screen-reader semantics on two community tools.'],
      visible: true,
      order: 2,
    },
  ],

  /**
   * Languages. Written in their own scripts deliberately — the Devanagari,
   * Tamil and Arabic entries must survive storage, normalising and rendering
   * unchanged. Nothing here is transliterated or escaped.
   */
  languages: [
    { id: 'lang-1', name: 'English', proficiency: 'native', note: 'Writing and editing', visible: true, order: 0 },
    { id: 'lang-2', name: 'हिन्दी', proficiency: 'fluent', note: 'Native language', visible: true, order: 1 },
    { id: 'lang-3', name: 'मराठी', proficiency: 'fluent', note: 'Home language', visible: true, order: 2 },
    { id: 'lang-4', name: 'தமிழ்', proficiency: 'intermediate', note: 'Reading and conversation', visible: true, order: 3 },
    { id: 'lang-5', name: 'العربية', proficiency: 'basic', note: 'Reading', visible: true, order: 4 },
    { id: 'lang-6', name: 'Español', proficiency: 'basic', note: 'Beginning', visible: true, order: 5 },
  ],

  resumeSettings: {
    eyebrow: 'Resume',
    title: 'Education & Experience',
    intro: 'Where I studied, what I have built, and the languages I work in.',
    // No file ships with the seed, so the button stays hidden until an admin
    // adds one. A download button that downloads nothing is worse than none.
    showDownload: false,
    downloadLabel: 'Download Resume',
    downloadUrl: '',
    blocks: [
      { id: 'rb-edu', kind: 'education', title: 'Education', content: '', visible: true, order: 0 },
      { id: 'rb-exp', kind: 'experience', title: 'Experience', content: '', visible: true, order: 1 },
      { id: 'rb-lang', kind: 'language', title: 'Languages', content: '', visible: true, order: 2 },
      { id: 'rb-skills', kind: 'skills', title: 'Core Skills', content: '', visible: true, order: 3 },
      { id: 'rb-cert', kind: 'certification', title: 'Certifications', content: '', visible: true, order: 4 },
      { id: 'rb-note', kind: 'text', title: 'Additional Information', content: '', visible: false, order: 5 },
    ],
  },

  chatbotSettings: {
    enabled: true,
    name: 'Site Assistant',
    greeting: "Hi — I'm the assistant for this site. Ask me about Mayank's work, writing, skills, or how to get in touch.",
    tone: 'professional',
    quickReplies: [
      { id: 'qr-portfolio', label: 'View portfolio', query: 'Take me to the portfolio' },
      { id: 'qr-writing', label: 'Read the writing', query: 'Where can I read the writing' },
      { id: 'qr-contact', label: 'How to contact', query: 'How can I contact Mayank' },
      { id: 'qr-skills', label: 'Skills & tools', query: 'What are his skills' },
    ],
    sectionChips: [
      { id: 'sc-portfolio', label: 'Portfolio', target: 'portfolio' },
      { id: 'sc-literature', label: 'Literature', target: 'literature' },
      { id: 'sc-achievements', label: 'Achievements', target: 'achievements' },
      { id: 'sc-contact', label: 'Contact', target: 'contact' },
    ],
    fallbackStyle: 'helpful',
  },
};
