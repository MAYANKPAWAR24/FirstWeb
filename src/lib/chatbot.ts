import type { ChatbotFAQ, ChatbotLanguage, ChatbotTone, SectionId } from './types';
import { fallbackFor, flavourAnswer, multiTurnFor, welcomeFor } from './chatbotVoice';

/**
 * The assistant engine.
 *
 * Design constraints, in priority order:
 *
 *  1. No network, no API key, no model. Everything resolves locally against a
 *     keyword index, so the widget cannot fail, cannot leak a conversation, and
 *     costs nothing to run. This is a deliberate property, not a limitation.
 *  2. An absent admin FAQ set must fall back to the embedded dataset rather
 *     than leaving the bot unable to answer anything.
 *  3. Replies may carry *actions* — a section to jump to — which is what turns
 *     the widget from a FAQ reader into a site guide.
 *
 * The previous dataset was a novelty persona: it answered questions about black
 * holes, pyramids and jungle survival, included a flirting entry, and flattered
 * the visitor ("your brain is ahead of 99% of people"). Nothing in it matched
 * the site's actual identity or a recruiter's questions, so the dataset has
 * been replaced rather than extended.
 */

export type ChatbotCategory = ChatbotFAQ['category'];

export interface EmbeddedFAQ {
  keywords: string[];
  synonyms?: string[];
  response: string;
  /**
   * A genuinely different line, not a word-substituted one. Hinglish is a
   * register rather than a wrapper, so every entry carries one and falls back
   * to `response` only when it is missing.
   */
  hinglish?: string;
  category?: ChatbotCategory;
  /** Section the widget offers a jump button for. */
  section?: SectionId;
}

export type EngineFAQ = EmbeddedFAQ | ChatbotFAQ;

export interface ChatTurn {
  from: 'bot' | 'user';
  text: string;
}

export interface ChatbotAction {
  label: string;
  target: SectionId;
}

export type ChatbotReplyKind = 'faq' | 'multi-turn' | 'fallback' | 'greeting';

export interface VoiceOptions {
  language: ChatbotLanguage;
  tone: ChatbotTone;
  /** Rotates openers, closers and fallbacks so replies do not repeat. */
  rotation?: number;
}

export interface ChatbotReply {
  text: string;
  kind: ChatbotReplyKind;
  fromCloud: boolean;
  faq?: ChatbotFAQ;
  actions?: ChatbotAction[];
}

export const CHATBOT_NAME = 'Site Assistant';

export const TYPING_LABEL = 'Looking that up…';

export const CHATBOT_OPENING_LINE =
  "Hi — I'm the assistant for this site. Ask me about Mayank's work, writing, skills, or how to get in touch.";

export const HELP_FALLBACKS = [
  "I don't have an answer for that one yet. Try asking who Mayank is, what he builds, or how to get in touch — or use the buttons below.",
  "That's outside what I know. I'm best with questions about the portfolio, the writing, skills and contact details.",
  "Not sure I can help with that. Ask about the work, the writing, or where to find contact details.",
];

export const MINIMAL_FALLBACK = "I don't have an answer for that. Try asking about the portfolio, the writing, or how to contact Mayank.";

/**
 * The permanent dataset.
 *
 * Every entry carries `section`, which is what lets the widget render a
 * "take me there" button. Questions a recruiter actually asks come first; the
 * philosophical and pop-culture entries that used to dominate this list are
 * gone, because answering them competently is not what this widget is for.
 */
export const DEFAULT_CHATBOT_FAQS: EmbeddedFAQ[] = [
  {
    keywords: ['who is mayank', 'who are you', 'about mayank', 'about you', 'introduce', 'who is this', 'tell me about'],
    synonyms: ['who r u', 'your name', 'bio', 'about the author', 'who owns this site'],
    hinglish:
      'Mayank Pawar — writer aur developer, dono. Matlab ek taraf se poetry aur novels, doosri taraf se front-end aur product engineering. Kaam literature aur technology ke beech se nikalta hai. Poora background About section mein hai.',
    category: 'general',
    section: 'profile',
    response:
      "Mayank Pawar is a writer and software developer who works where literature meets technology — poetry and long-form fiction on one side, front-end and product engineering on the other. The About section has the full background.",
  },
  {
    keywords: ['portfolio', 'my work', 'show me the work', 'projects', 'what has he built', 'case study'],
    synonyms: ['your work', 'showcase', 'builds', 'made', 'portfolio work', 'examples'],
    hinglish:
      'Portfolio wahi section hai jo pehle padhna chahiye. Usme professional summary hai, kya kya build karta hai, aur case studies — is website ki bhi, jo React aur TypeScript se bani hai, poori admin CMS ke saath, cloud sync, knowledge-base chatbot aur aath games.',
    category: 'work',
    section: 'portfolio',
    response:
      'The Portfolio section is the one to read first. It covers a professional summary, what he builds, and case studies — including this site, which is a React and TypeScript single-page app with a full admin CMS, cloud content sync, a knowledge-base chatbot and six mini-games.',
  },
  {
    keywords: ['skills', 'tech stack', 'what can he do', 'languages', 'tools', 'expertise', 'stack'],
    synonyms: ['what does he know', 'technologies', 'framework', 'languages he knows', 'skillset'],
    hinglish:
      'Skills ek flat list mein nahi, groups mein hain — Creative, Technical, Workflow aur Tools, aur Communication. Isliye poora range ek nazar mein dikhta hai.',
    category: 'recruiter',
    section: 'profile',
    response:
      'Skills are grouped into Creative, Technical, Workflow and Tools, and Communication on the About section — so you can see the whole range rather than one flat list.',
  },
  {
    keywords: ['where can i read', 'literature', 'poems', 'writing', 'novel', 'books', 'read'],
    synonyms: ['show me the writing', 'poetry', 'published work', 'your writing', 'shayari'],
    hinglish:
      'Literature section mein poems aur novels hain. Har ek distraction-free reader mein khulta hai, saath reading progress bar bhi. Har piece ke end pe related works bhi suggest hote hain.',
    category: 'writing',
    section: 'literature',
    response:
      'The Literature section has the poems and novels, each opening in a distraction-free reader with a reading-progress bar. Related works are suggested at the end of every piece.',
  },
  {
    keywords: ['media', 'photos', 'videos', 'gallery', 'photography', 'music', 'watch'],
    synonyms: ['show me photos', 'images', 'youtube', 'video gallery', 'what does it look like'],
    hinglish:
      'Media gallery mein photography, video aur audio hai, full-screen viewer ke saath, aur keyboard se bhi items ke beech navigate kar sakte ho.',
    category: 'media',
    section: 'media',
    response:
      'The Media gallery holds photography, video and audio, with a full-screen viewer and keyboard navigation between items.',
  },
  {
    keywords: ['how can i contact', 'contact', 'email', 'get in touch', 'reach', 'hire', 'available'],
    synonyms: ['email address', 'message', 'talk to', 'work together', 'freelance', 'collaborate', 'commission'],
    hinglish:
      'Contact section mein direct email hai, ek message form hai jo aapka apna mail app kholega, aur saare social profiles. Naye kaam ke liye availability Portfolio section ke top par hai.',
    category: 'contact',
    section: 'contact',
    response:
      'The Contact section has a direct email line, an optional message form that opens your own mail app, and every social profile. Availability for new work is listed at the top of the Portfolio section.',
  },
  {
    keywords: ['resume', 'cv', 'download', 'credentials', 'certificate'],
    synonyms: ['resume link', 'download cv', 'qualification', 'certificates'],
    hinglish:
      'Resume link Portfolio section ke top par dikhta hai, jab admin ne ek file upload ki ho. Saare certificates list hote hain, har ek ke saath verify karne ka link.',
    category: 'recruiter',
    section: 'certificates',
    response:
      'A resume link appears at the top of the Portfolio section when one is uploaded, and any certificates are listed with a link to verify each one.',
  },
  {
    keywords: ['achievements', 'awards', 'milestones', 'what has he won', 'speaking'],
    synonyms: ['accomplishments', 'recognition', 'talks', 'keynote', 'published author'],
    hinglish:
      'Achievements timeline mein writing awards, publications, talks aur technical wins hain, category ke hisaab se group kiye hue.',
    category: 'general',
    section: 'achievements',
    response:
      'The Achievements timeline covers writing awards, publications, talks and technical wins, grouped by category.',
  },
  {
    keywords: ['what is this site', 'what can i explore', 'how is this built', 'what is this website'],
    synonyms: ['what is this', 'sections', 'how does this work', 'tell me about the site', 'how was this made'],
    hinglish:
      'Yeh ek personal platform hai jo portfolio bhi hai aur reading room bhi. Har section — hero, about, portfolio, literature, media, resources, achievements, certificates, contact, community — admin panel se edit hota hai aur cloud pe sync hota hai, saath local copy bhi hai taaki network na ho tab bhi kuch na kho.',
    category: 'general',
    response:
      "This is a personal platform that works as both a portfolio and a reading room. Every section — hero, about, portfolio, literature, media, resources, achievements, certificates, contact and community — is edited from an admin panel and synced to the cloud, with a local copy as a fallback so nothing is lost when the network is unavailable.",
  },
  {
    keywords: ['games', 'play', 'mini games', 'interactive', 'games section'],
    synonyms: ['play break', 'snake', 'tic tac toe', '2048', 'bored', 'have fun'],
    hinglish:
      'Play Break section hai jismein aath self-contained games hain — Tic-Tac-Toe jo real minimax AI se khelta hai 3x3 ya 4x4 board pe, Snake, 2048, Memory Match, Math Sprint aur reaction-time test.',
    category: 'general',
    section: 'games',
    response:
      'There is a small Play Break section with six self-contained games, including a Tic-Tac-Toe with real minimax AI on a 3x3 or 4x4 board, Snake, 2048, Memory Match and a reaction-time test.',
  },
  {
    keywords: ['notes', 'resources', 'study material', 'downloads', 'guides', 'cheatsheet'],
    synonyms: ['study', 'learning material', 'pdf', 'documents', 'reference'],
    hinglish:
      'Study Material ek chhoti library hai — guides, references aur workshop notes, tag ke hisaab se group kiye hue. Jin files ka wait kar rahe hain unpe saaf-saaf likha hota hai.',
    category: 'general',
    section: 'study',
    response:
      'Study Material is a small library of guides, references and workshop notes, grouped by tag. Entries still awaiting a file are clearly marked as drafts.',
  },
  {
    keywords: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'good afternoon'],
    synonyms: ['yo', 'sup', 'howdy', 'hiya'],
    hinglish:
      'Hello. Poochho portfolio, writing, skills ya contact ke baare mein — ya neeche se koi bhi suggestion chun lo.',
    category: 'general',
    response: "Hello. Ask me about the portfolio, the writing, skills, or how to get in touch — or pick one of the suggestions below.",
  },
  {
    keywords: ['thanks', 'thank you', 'cheers', 'helpful', 'nice'],
    synonyms: ['great', 'awesome', 'perfect', 'appreciate it'],
    hinglish:
      'Koi baat nahi. Kuch bhi detail mein poochna ho, Portfolio aur Contact sabse seedha raaste hain.',
    category: 'general',
    response: 'Any time. If you want the long version of anything, the Portfolio and Contact sections are the fastest route.',
  },
];

export const QUICK_REPLIES = [
  { id: 'qr-portfolio', label: 'View portfolio', query: 'Show me the portfolio' },
  { id: 'qr-writing', label: 'Read the writing', query: 'Where can I read the writing' },
  { id: 'qr-contact', label: 'How to contact', query: 'How can I contact Mayank' },
  { id: 'qr-skills', label: 'Skills & tools', query: 'What are his skills' },
];

export const CHATBOT_SUGGESTIONS = QUICK_REPLIES.map((reply) => reply.query);

/* ------------------------------------------------------------------ *
 * Matching
 * ------------------------------------------------------------------ */

function responseOf(faq: EngineFAQ): string {
  const value = 'answer' in faq ? faq.answer : faq.response;
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * The answer in the visitor's language.
 *
 * Only the embedded dataset carries a Hinglish variant. An admin-authored FAQ
 * stays in whatever language the admin wrote it, because silently translating
 * somebody's own words would misrepresent it — so the English answer is used
 * and the flavour layer does the framing instead.
 */
function responseFor(faq: EngineFAQ, language: ChatbotLanguage): string {
  const hinglish = 'hinglish' in faq && typeof faq.hinglish === 'string' ? faq.hinglish.trim() : '';
  if (language === 'hinglish' && hinglish) return hinglish;
  return responseOf(faq);
}

function keywordsOf(faq: EngineFAQ): string[] {
  const list = 'keywords' in faq ? faq.keywords : [];
  if (!Array.isArray(list)) return [];
  return list
    .filter((keyword): keyword is string => typeof keyword === 'string')
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
}

function synonymsOf(faq: EngineFAQ): string[] {
  const list = 'synonyms' in faq && Array.isArray(faq.synonyms) ? faq.synonyms : [];
  return list
    .filter((synonym): synonym is string => typeof synonym === 'string')
    .map((synonym) => synonym.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Keyword hit test.
 *
 * Short keywords must land on a word boundary. Without this, "hi" matches
 * inside "philosophy", "highlight" and "architecture", and "sup" matches inside
 * "support" — which is how the previous engine answered nonsense questions.
 */
function hasKeyword(query: string, keyword: string): boolean {
  if (keyword.length <= 3) {
    let from = 0;
    while (from <= query.length - keyword.length) {
      const index = query.indexOf(keyword, from);
      if (index === -1) return false;
      const before = index === 0 ? ' ' : query[index - 1];
      const after = index + keyword.length >= query.length ? ' ' : query[index + keyword.length];
      if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) return true;
      from = index + 1;
    }
    return false;
  }
  return query.includes(keyword);
}

/**
 * Score = keyword length + a bonus per word, so a multi-word phrase beats a
 * single long word. Synonyms contribute slightly less than a literal keyword,
 * which keeps an exact question match ahead of a loosely related one.
 */
function scoreOf(query: string, faq: EngineFAQ): number {
  let best = 0;
  keywordsOf(faq).forEach((keyword) => {
    if (hasKeyword(query, keyword)) {
      best = Math.max(best, keyword.length + keyword.split(/\s+/).length * 6);
    }
  });
  synonymsOf(faq).forEach((synonym) => {
    if (hasKeyword(query, synonym)) {
      best = Math.max(best, (synonym.length + synonym.split(/\s+/).length * 6) * 0.85);
    }
  });
  return best;
}

/* ------------------------------------------------------------------ *
 * Knowledge assembly
 * ------------------------------------------------------------------ */

/**
 * An admin FAQ shadows an embedded one when it covers *every* keyword of that
 * embedded entry.
 *
 * The previous rule required only a single overlapping keyword, so adding one
 * managed answer containing the word "hire" silently deleted the entire
 * default hiring answer. Requiring full coverage means an override has to be
 * deliberately complete.
 */
function shadowsDefault(managed: ChatbotFAQ[], embedded: EmbeddedFAQ): boolean {
  const managedKeywords = managed.flatMap((faq) => keywordsOf(faq));
  return embedded.keywords.length > 0
    && embedded.keywords.every((keyword) => managedKeywords.includes(keyword));
}

function isLive(faq: EngineFAQ): boolean {
  const enabled = 'enabled' in faq ? faq.enabled !== false : true;
  return enabled && responseOf(faq).length > 0;
}

function toManagedFAQ(faq: EmbeddedFAQ, index: number): ChatbotFAQ {
  return {
    id: `default-${index}-${faq.keywords[0]?.replace(/\W+/g, '-') ?? 'faq'}`,
    question: faq.keywords[0] ?? `Answer ${index + 1}`,
    answer: faq.response,
    keywords: faq.keywords,
    synonyms: faq.synonyms ?? [],
    category: faq.category ?? 'general',
    section: faq.section,
    enabled: true,
  };
}

/** Merges admin FAQs over the embedded set. Both are returned, tagged. */
export function buildKnowledge(dynamicFAQs?: ChatbotFAQ[] | null): { faq: EngineFAQ; fromCloud: boolean }[] {
  const managed = Array.isArray(dynamicFAQs) ? dynamicFAQs : [];
  const shadowed = DEFAULT_CHATBOT_FAQS.filter((embedded) => !shadowsDefault(managed, embedded));

  const combined: { faq: EngineFAQ; fromCloud: boolean }[] = [
    ...managed.map((entry) => ({ faq: entry, fromCloud: true })),
    ...shadowed.map((entry) => ({ faq: entry, fromCloud: false })),
  ];

  return combined.filter(({ faq }) => isLive(faq));
}

function countTurns(history: ChatTurn[] | unknown[]): number {
  if (!Array.isArray(history)) return 0;
  if (history.some((entry) => typeof entry === 'object' && entry !== null && 'from' in entry)) {
    return history.filter((entry) => (
      typeof entry === 'object' && entry !== null && 'from' in entry
      && (entry as ChatTurn).from === 'user'
    )).length;
  }
  return history.length;
}

function actionsFor(faq: EngineFAQ): ChatbotAction[] | undefined {
  const section = 'section' in faq ? faq.section : undefined;
  if (!section) return undefined;
  const label = section === 'literature' ? 'Read the writing'
    : section === 'contact' ? 'Get in touch'
      : section === 'profile' ? 'Read the bio'
        : section[0].toUpperCase() + section.slice(1);
  return [{ label: `Take me to ${label.toLowerCase()}`, target: section }];
}

/** Resolves a user message, in the visitor's chosen language and tone. */
export function resolveChatReply(
  userMessage: string,
  chatHistory: ChatTurn[] | unknown[] = [],
  dynamicFAQs?: ChatbotFAQ[] | null,
  voice?: Partial<VoiceOptions>,
): ChatbotReply {
  const query = userMessage.toLowerCase().trim();
  const knowledge = buildKnowledge(dynamicFAQs);
  const language = voice?.language ?? 'english';
  const tone = voice?.tone ?? 'professional';
  const rotation = voice?.rotation ?? 0;

  if (!query) {
    return {
      text: welcomeFor(language, tone, rotation),
      kind: 'greeting',
      fromCloud: false,
      actions: [{ label: 'Portfolio kholo', target: 'portfolio' }],
    };
  }

  let bestScore = 0;
  let bestMatch: { faq: EngineFAQ; fromCloud: boolean } | null = null;

  for (const candidate of knowledge) {
    const score = scoreOf(query, candidate.faq);
    // Strictly greater, so ties keep the earlier (more specific) entry.
    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  const turns = countTurns(chatHistory);

  if (bestMatch && bestScore > 0) {
    const base = responseFor(bestMatch.faq, language);
    const managedId = 'id' in bestMatch.faq ? bestMatch.faq.id : undefined;
    return {
      text: flavourAnswer(base, language, tone, rotation, turns > 2),
      kind: 'faq',
      fromCloud: bestMatch.fromCloud,
      faq: managedId ? (bestMatch.faq as ChatbotFAQ) : undefined,
      actions: actionsFor(bestMatch.faq),
    };
  }

  if (turns >= 5) {
    return {
      text: multiTurnFor(language, tone),
      kind: 'multi-turn',
      fromCloud: false,
      actions: [{ label: 'Contact section', target: 'contact' }],
    };
  }

  return {
    text: fallbackFor(language, tone, rotation),
    kind: 'fallback',
    fromCloud: false,
  };
}

/** Text-only convenience wrapper, kept for the existing call signature. */
export function getSmartChatResponse(
  userMessage: string,
  chatHistory: ChatTurn[] | unknown[] = [],
  dynamicFAQs?: ChatbotFAQ[] | null,
  voice?: Partial<VoiceOptions>,
): string {
  return resolveChatReply(userMessage, chatHistory, dynamicFAQs, voice).text;
}

/**
 * The admin list: managed entries first (in their stored order), then the
 * embedded defaults that no managed entry overrides. `managed: false` marks an
 * entry the admin has not taken ownership of yet.
 */
export function mergeChatbotFAQs(managed: ChatbotFAQ[] | null | undefined): ChatbotFAQ[] {
  const list = Array.isArray(managed) ? managed : [];
  return [
    ...list.map((faq) => ({ ...faq, managed: true as const })),
    ...DEFAULT_CHATBOT_FAQS
      .filter((embedded) => !shadowsDefault(list, embedded))
      .map(toManagedFAQ)
      .map((faq) => ({ ...faq, managed: false as const })),
  ];
}
