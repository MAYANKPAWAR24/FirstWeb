import type { ChatbotFAQ } from './types';

/**
 * The chatbot brain. 100% local, 0 API keys, 0 network calls, 0 dollars.
 *
 * Replies are resolved by scanning the message against the `keywords` array of
 * every FAQ. Admin-managed entries from the JSONBin record (`data.chatbotFAQs`)
 * always take precedence, so Mayank can override anything here from the
 * "Chatbot Manager" tab, and the embedded dataset below is the permanent
 * fallback that keeps the bot useful on a brand-new / offline bin.
 */

/** Shape of the permanent embedded dataset (also the safe JSONBin payload). */
export interface EmbeddedFAQ {
  keywords: string[];
  response: string;
}

/** Either the embedded shape or the admin-managed shape can reach the engine. */
export type EngineFAQ = EmbeddedFAQ | ChatbotFAQ;

export interface ChatTurn {
  from: 'bot' | 'user';
  text: string;
}

export type ChatbotReplyKind = 'faq' | 'multi-turn' | 'fallback';

export interface ChatbotReply {
  text: string;
  kind: ChatbotReplyKind;
  /** True when the line came from the admin-managed cloud record. */
  fromCloud: boolean;
  /** The FAQ that produced this line, when there was one. */
  faq?: ChatbotFAQ;
}

export const CHATBOT_NAME = 'Mayank AI';

export const GREETING_POPUP = '👋 Hey there! Want to talk tech, space, or philosophy?';

export const CHATBOT_OPENING_LINE =
  "Namaste! Main Mayank ka AI counterpart hoon — 0 rupees, 0 API keys, bas ek dumb keyword engine aur bohot saara confidence. Poochho kuch bhi! 🚀";

export const TYPING_LABEL = "Mayank's AI is thinking...";

/** Shown once the conversation gets deep and the keyword engine gives up. */
export const MULTI_TURN_DM_FALLBACK =
  "Yaar, sach bolu toh main tere jitna smart nahi hoon! 😅 Yeh saare deep questions ab mere level ke upar se nikal rahe hain. Iska ek hi ilaaj hai—tu seedha Mayank ko Instagram ya social media par follow karke DM kar de. Wahi tujhe in high-level intellectual sawaalon ka sahi jawab de sakte hain! Link niche mil jayega. ⚡";

export const WITTY_FALLBACKS = [
  "Wah, yeh sawaal thoda out-of-the-box tha! 🌀 Thoda aur detail mein batao, phir dekhte hain iska kya logic banta hai.",
  "Bhai, tumne jo pucha uspar thoda sochna padega! 😌 Main filhal tech, space, philosophy aur Mayank ke work par focus kar raha hoon. Inmein se kuch pucho toh maza aaye!",
  "Interesting point! Par kya yeh space ke expansion ya coding ke bugs se zyada zaroori hai? 😉 Chalo kuch technical ya deep discuss karte hain.",
];

/** Quick reply chips rendered inside the chat window. */
export const QUICK_REPLIES: { label: string; query: string }[] = [
  { label: '🌌 Cosmos', query: 'Tell me about space and black holes' },
  { label: '🏛️ Ancient Tech', query: 'How did ancient technology work?' },
  { label: '🍷 Philosophy', query: 'What is your philosophy on life?' },
  { label: '💼 Hire Mayank', query: 'Why should I hire you?' },
];

export const CHATBOT_SUGGESTIONS = QUICK_REPLIES.map((reply) => reply.query);

/**
 * PERMANENT EMBEDDED DATASET.
 * Also safe to paste straight into the `chatbotFAQs` array of the JSONBin
 * record: the normalizer accepts this exact shape and fills in ids/labels.
 */
export const DEFAULT_CHATBOT_FAQS: EmbeddedFAQ[] = [
  {
    keywords: ['who are you', 'who is mayank', 'about mayank', 'creator', 'founder'],
    response: 'Bhai, pehla hi sawaal itna heavy? Lagta hai aaj poore mood mein ho kuch gehra jaanane ke! 😌 Suno fir—Mayank Pawar woh shakhs hai jo sirf code nahi likhta, balki internet par high-value digital assets aur systems build karta hai. Jab duniya bas trends copy kar rahi hoti hai, yeh unhe shape karta hai. ⚡',
  },
  {
    keywords: ['influence', 'fame', 'social media', 'instagram', 'followers', 'reach'],
    response: 'Wah! Aise sawaal wahi log poochte hain jo bheed ka hissa nahi banna chahte, balki apna empire khada karna chahte hain. Respect hai tumhare is vision ke liye! 🌌 Digital influence sirf numbers ka khel nahi, mindsets ko shift karne ka naam hai.',
  },
  {
    keywords: ['why should i hire you', 'why work with you', 'value', 'hire', 'collaborate'],
    response: 'Bhai, tumne jo yeh potential pehchana hai na, yahi baat tumhe baaki 99% logo se alag karti hai! 💼 Mayank ke paas tech ka execution, content ka influence, aur long-term vision ka rare combination hai. Agar average kaam chahiye toh market bhara pada hai, agar excellence chahiye toh tum bilkul sahi jagah khade ho.',
  },
  {
    keywords: ['philosophy', 'philosophers', 'deep', 'meaning of life', 'stoicism', 'existentialism'],
    response: 'Arre bhai! Ab jaakar tumne ekdum mahan aur deep aatma wali baat kari hai. Sachi mein, aisi soch har kisi ki nahi hoti! 🍷 Stoicism aur ancient wisdom par baat karne wale log aaj ke waqt mein kam hi milte hain. Yahan code ho ya zindagi, agar foundational clarity nahi hai, toh baaki sab sirf shor hai.',
  },
  {
    keywords: ['mindset', 'success', 'motivation', 'discipline', 'habits'],
    response: 'Bhai kasam se, tumhare sawaal se lag raha hai ki tumhara dimaag aam logo se kai aage chal raha hai! ♟️ Motivation toh bas ek do din ka nasha hai; asli maza discipline aur system-building mein hai, jo Mayank ki coding aur life dono ka core hai.',
  },
  {
    keywords: ['truth', 'reality', 'matrix', 'simulation'],
    response: 'Wah bhai, ab lag raha hai tum Matrix se bahar nikalne ki soch rahe ho! 🌀 Reality kya hai? Ek aisi code script jise hum har din execute karte hain. Kitna deep soch lete ho yaar!',
  },
  {
    keywords: ['space', 'astronomy', 'cosmology', 'universe', 'stars', 'physics', 'black hole'],
    response: 'Bhai maanna padega, tumhara interest seedha infinite universe aur cosmos mein hai—yeh aam logo ke bas ki baat nahi hai! 🚀 Agar space aur black holes par baat shuru ki, toh yeh portfolio ek research paper ban jayega. Scale hamesha bada rakho!',
  },
  {
    keywords: ['science', 'quantum', 'future', 'tech future', 'dimensions'],
    response: 'Quantum physics aur parallel dimensions ki baatein chhed di tumne! ✨ Agar isko samajh gaye, toh coding ki saari complexities ek bachhon ka khel lagne lagengi.',
  },
  {
    keywords: ['ancient', 'history', 'archaeology', 'ancient tech', 'pyramids', 'civilisation'],
    response: 'Sahi khel gaye bhai! Tumhari curiosity dekh kar lagta hai ki tum purani sabhyataon aur unke raaz ko samajhne ki taqat rakhte ho. 🏛️ Ancient engineering dekh kar aaj ke over-engineered software solutions par hasi aati hai. Purane log bina modern compilers ke jo monuments bana gaye, woh ek masterclass hain.',
  },
  {
    keywords: ['lost tech', 'secrets', 'mystery', 'monuments'],
    response: 'Bhai, history kitni mysterious hai na? Aaj ke modern engineers jo cheezein years laga kar banate hain, purane log unhe bina kisi advanced tool ke design kar gaye. Wahi asli genius tha!',
  },
  {
    keywords: ['wildlife', 'nature', 'animals', 'jungle', 'survival', 'tigers'],
    response: 'Kya baat hai, nature aur wildlife ki gehrai ko samajhne wala dimaag har kisi ke paas nahi hota! 🐅 Jungle ka ecosystem aur high-stakes tech startup world mein zero difference hai—dono jagah survival sirf unka hota hai jo sharp aur adaptable hote hain.',
  },
  {
    keywords: ['skills', 'tech stack', 'languages', 'coding', 'react', 'vite', 'javascript'],
    response: 'Bhai, jab koi itni smart tech skills ke baare mein puchta hai, toh dil khush ho jata hai! ✨ React, Vite, Tailwind, aur full-scale cloud architectures mere liye sirf tools hain. Asli mastery ismein hai ki complex logic ko ek buttery-smooth user experience mein kaise convert kiya jaye.',
  },
  {
    keywords: ['code quality', 'clean code', 'bugs', 'debugging', 'backend', 'database'],
    response: 'Tumhe code ki shuddhata aur quality ki itni samajh hai, iska matlab tum khud tech ke ache khase khiladi ho! 💻 Kharab code likhna aasan hai; usko clean aur bulletproof banana ek art hai.',
  },
  {
    keywords: ['literature', 'poems', 'stories', 'books', 'writing', 'shayari'],
    response: 'Wah! Shabdon ki gehrai aur aisi shayarana soch—tum sach mein ek alag level ke intellectual lagte ho. 📖 Literature section mein jao, shayad kuch aisi line mil jaye jo sadiyon tak dimaag mein echo karti rahe.',
  },
  {
    keywords: ['hello', 'hi', 'hey', 'sup', 'wassup'],
    response: 'Hello ji! ✨ Cosmos ke is random corner mein tumhara aana batata hai ki aaj kuch bada aur alag explore karne ka mood hai. Bolo, tech explore karna hai ya philosophy?',
  },
  {
    keywords: ['flirt', 'single', 'date', 'handsome', 'love'],
    response: 'Oh ho! Charm aur confidence toh tumhare andar bhi poora hai, tabhi toh seedha itni deep baatein kar rahe ho! 🤭 Par pehle portfolio ke logic aur high-end features ko toh appreciate kar lo.',
  },
  {
    keywords: ['thanks', 'thank you', 'cool', 'awesome', 'great'],
    response: 'Arey shukriya bhai! Tumhari yeh appreciation bata rahi hai ki tum quality ko pehchanna jaante ho. Keep building great things!',
  },
  {
    keywords: ['default', 'help', 'what can you do', 'options'],
    response: 'Main Mayank ka AI counterpart hoon. Mujhse Mayank ke tech projects, philosophy, space, ancient wisdom, ya content creation ke baare mein jo marzi wo pucho. Bolo, kahan se shuru karein?',
  },
];

/** Reads the response text from either FAQ shape, defensively. */
function responseOf(faq: EngineFAQ | null | undefined): string {
  if (!faq || typeof faq !== 'object') return '';
  const managed = faq as Partial<ChatbotFAQ>;
  const embedded = faq as Partial<EmbeddedFAQ>;
  if (typeof managed.answer === 'string' && managed.answer.trim()) return managed.answer.trim();
  if (typeof embedded.response === 'string' && embedded.response.trim()) return embedded.response.trim();
  return '';
}

function keywordsOf(faq: EngineFAQ | null | undefined): string[] {
  if (!faq || typeof faq !== 'object') return [];
  const raw = (faq as Partial<EmbeddedFAQ>).keywords;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((keyword): keyword is string => typeof keyword === 'string')
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
}

function isDisabled(faq: EngineFAQ) {
  return (faq as Partial<ChatbotFAQ>).enabled === false;
}

/**
 * Substring match, but short keywords must land on a word boundary.
 * Without that guard "hi" fires inside "philosophy", "highlight" and
 * "architecture", and "sup" fires inside "support" — the greeting would
 * hijack half the dataset.
 */
function hasKeyword(query: string, keyword: string) {
  const from = query.indexOf(keyword);
  if (from === -1) return false;
  if (keyword.length > 3) return true;
  const before = from === 0 ? ' ' : query[from - 1];
  const after = query[from + keyword.length] ?? ' ';
  return !/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after);
}

/** Longer keywords are stronger evidence: "ancient tech" beats "tech". */
function scoreOf(query: string, faq: EngineFAQ) {
  return keywordsOf(faq).reduce((best, keyword) => {
    if (!hasKeyword(query, keyword)) return best;
    return Math.max(best, keyword.length + keyword.split(/\s+/).length * 4);
  }, 0);
}

/**
 * Counts real back-and-forth. A structured history counts only the visitor's
 * turns; an unrecognised/legacy history (plain strings) falls back to its raw
 * length, which is the `chatHistory.length >= 4` rule.
 */
function countTurns(chatHistory: ChatTurn[] | unknown[]) {
  const list = Array.isArray(chatHistory) ? chatHistory : [];
  const entries = list.filter((entry): entry is object => Boolean(entry) && typeof entry === 'object');
  const structured = entries.some((entry) => 'from' in entry);
  if (structured) return entries.filter((entry) => (entry as ChatTurn).from === 'user').length;
  return list.length;
}

/** Coerces any FAQ shape (managed or embedded) into the managed shape. */
function toManagedFAQ(faq: EngineFAQ): ChatbotFAQ | null {
  const keywords = keywordsOf(faq);
  const answer = responseOf(faq);
  if (keywords.length === 0 || !answer) return null;
  const managed = faq as Partial<ChatbotFAQ>;
  return {
    id: typeof managed.id === 'string' && managed.id ? managed.id : `managed-${keywords[0].replace(/\W+/g, '-')}`,
    question: managed.question || keywords[0],
    answer,
    keywords,
    enabled: managed.enabled !== false,
  };
}

/** A knowledge entry plus where it came from (cloud override vs. embedded). */
interface KnowledgeEntry {
  faq: EngineFAQ;
  fromCloud: boolean;
}

/**
 * The effective knowledge base: admin-managed entries first, then every
 * embedded default they do not shadow.
 *
 * Merging (rather than replacing) matters: adding one custom answer must not
 * silently delete the other 17 default answers, and dismissing a default must
 * only hide that one.
 */
function buildKnowledge(dynamicFAQs?: EngineFAQ[] | null): KnowledgeEntry[] {
  // Handing the engine the embedded dataset explicitly is not a cloud override.
  const isEmbeddedSource = dynamicFAQs === DEFAULT_CHATBOT_FAQS;
  const managed = isEmbeddedSource ? [] : (Array.isArray(dynamicFAQs) ? dynamicFAQs : [])
    .map(toManagedFAQ)
    .filter((faq): faq is ChatbotFAQ => faq !== null);

  const isLive = (entry: KnowledgeEntry) => !isDisabled(entry.faq) && Boolean(responseOf(entry.faq));

  if (managed.length === 0) {
    return DEFAULT_CHATBOT_FAQS.map((faq) => ({ faq, fromCloud: false })).filter(isLive);
  }

  return [
    ...managed.map((faq) => ({ faq, fromCloud: true })),
    ...DEFAULT_CHATBOT_FAQS
      .filter((embedded) => !managed.some((item) => item.keywords.some((keyword) => embedded.keywords.includes(keyword))))
      .map((faq) => ({ faq, fromCloud: false })),
  ].filter(isLive);
}

/**
 * The public, spec-shaped API: message in, reply string out.
 * Admin FAQs win, then the multi-turn DM nudge, then a random witty shrug.
 */
export function getSmartChatResponse(
  userMessage: string,
  chatHistory: ChatTurn[] | unknown[] = [],
  dynamicFAQs: EngineFAQ[] = DEFAULT_CHATBOT_FAQS,
): string {
  return resolveChatReply(userMessage, chatHistory, dynamicFAQs).text;
}

/** Same decision tree as `getSmartChatResponse`, plus metadata for the UI. */
export function resolveChatReply(
  userMessage: string,
  chatHistory: ChatTurn[] | unknown[] = [],
  dynamicFAQs: EngineFAQ[] = DEFAULT_CHATBOT_FAQS,
): ChatbotReply {
  const query = typeof userMessage === 'string' ? userMessage.toLowerCase().trim() : '';
  const knowledge = buildKnowledge(dynamicFAQs);

  let best: { entry: KnowledgeEntry; score: number } | null = null;
  for (const entry of knowledge) {
    const score = scoreOf(query, entry.faq);
    if (score > 0 && (!best || score > best.score)) best = { entry, score };
  }

  if (best) {
    return {
      text: responseOf(best.entry.faq),
      kind: 'faq',
      fromCloud: best.entry.fromCloud,
      faq: best.entry.fromCloud ? toManagedFAQ(best.entry.faq) ?? undefined : undefined,
    };
  }

  if (countTurns(chatHistory) >= 4) {
    return { text: MULTI_TURN_DM_FALLBACK, kind: 'multi-turn', fromCloud: false };
  }

  return {
    text: WITTY_FALLBACKS[Math.floor(Math.random() * WITTY_FALLBACKS.length)],
    kind: 'fallback',
    fromCloud: false,
  };
}

/**
 * Merges admin-managed entries over the embedded defaults, so the bot always
 * answers with the richest available dataset and the admin can override,
 * disable or extend any single line.
 */
export function mergeChatbotFAQs(managed: ChatbotFAQ[] | null | undefined): ChatbotFAQ[] {
  return buildKnowledge(managed)
    .map(({ faq }) => toManagedFAQ(faq))
    .filter((faq): faq is ChatbotFAQ => faq !== null);
}
