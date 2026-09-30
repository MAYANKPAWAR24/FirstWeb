/**
 * The chatbot's voice.
 *
 * Three dials, deliberately separated so an admin can mix them:
 *
 *  language  `english` | `hinglish`  — which register the answer is written in
 *  tone      `professional` | `warm` | `playful` — how it is delivered
 *  flavour   a short opener and closer wrapped around the substantive answer
 *
 * WHY A FLAVOUR LAYER RATHER THAN THREE COPIES OF EVERY ANSWER
 * ==============================================================
 * The facts must stay identical whatever the tone. Triplicating thirteen
 * answers means thirteen places for a fact to go stale. Instead the core answer
 * is written once, and `flavour` wraps it. Hinglish is the exception: it is a
 * different register rather than a wrapper, so the core answers carry a real
 * Hinglish variant and fall back to the English one when they do not.
 *
 * ON "FLIRTY"
 * ==========
 * `playful` is cheeky and a little dry. It is not a romance FAQ, and that is
 * deliberate. A bot that flirts with a visitor who wants to check your skills
 * reads as unserious to exactly the audience this site also has to impress, and
 * the previous flirt entry did real damage. Warmth and wit are what make a
 * visitor remember the site; a pickup line makes them leave it.
 */

import type { ChatbotLanguage, ChatbotTone } from './types';

const OPENERS: Record<ChatbotTone, string[]> = {
  professional: ['Here is what I can tell you.', 'Short answer:'],
  warm: [
    "Good question — here's the honest version.",
    "Happy to fill that in.",
    "Okay, this is a good one.",
  ],
  playful: [
    "Alright, let's get into it.",
    "Good ask. Here's the thing —",
    "Let me put it straight:",
  ],
};

const CLOSERS: Record<ChatbotTone, string[]> = {
  professional: ['', '', ''],
  warm: [
    "Anything else you want to dig into?",
    'Ask me the next one — I am not going anywhere.',
    'Happy to go deeper on any of that.',
  ],
  playful: [
    'Your move.',
    'Still curious? Good.',
    'That is the short version. I can do long.',
  ],
};

const FALLBACKS: Record<ChatbotLanguage, Record<ChatbotTone, string[]>> = {
  english: {
    professional: [
      "I don't have an answer for that one yet. Try asking who Mayank is, what he builds, or how to get in touch.",
      'That is outside what I know. I am best with questions about the portfolio, the writing, skills and contact details.',
      "Not something I can help with. Ask about the work, the writing, or where to find contact details.",
    ],
    warm: [
      "Honestly? That one is outside what I know. Stick to portfolio, writing, skills or contact and I have you covered.",
      "I could guess, but I would rather not. Ask me something I can actually help with — the work, the writing, or how to reach him.",
      "Not my strong suit. The good stuff is all about the portfolio, the writing and contact — try one of those.",
    ],
    playful: [
      "Nice try, but that is genuinely not something I know. I do know the portfolio, the writing and how to get hold of him.",
      "I am going to politely pretend I understood that. Ask about the work, the writing or contact — I am useful there.",
      "That is a hard no from me. Portfolio, writing, skills, contact — pick one and I will go.",
    ],
  },
  hinglish: {
    professional: [
      "Is baat meri jaankari mein nahi hai. Portfolio, writing, skills ya contact ke baare mein poochho, main help kar sakta hoon.",
      "Ye main nahi bata sakta. Kaam, likhna, skills aur contact ke baare mein kuch bhi poochho.",
      "Is topic par mujhe kuch nahi pata. Portfolio ya contact se shuru karo.",
    ],
    warm: [
      "Honestly, is baat ka mujhe pata nahi. Portfolio, writing, skills ya contact — ye sab main achhe se bata sakta hoon.",
      "Guess kar sakta hoon, par guess karna sahi nahi hai. Kuch bhi poochho jo main jaanta hoon.",
      "Is par main kuch nahi jaanta. Kaam, likhna, contact — ye mere strong areas hain.",
    ],
    playful: [
      "Ye toh maine bilkul nahi suna hai. Portfolio, writing, contact — yahan main kamaal kaam karta hoon.",
      "Dhyan se dekha — maine ise ignore kar diya. Kaam ya writing pe poochho, jaldi jawab milega.",
      "Nahi yaar, is baar main haan nahi bol sakta. Portfolio, writing, contact — kuch toh poochho.",
    ],
  },
};

const WELCOME: Record<ChatbotLanguage, Record<ChatbotTone, string>> = {
  english: {
    professional: "Hi — I'm the assistant for this site. Ask me about Mayank's work, writing, skills, or how to get in touch.",
    warm: "Hey — good to see you. Ask me anything about Mayank's work, writing, skills, or how to get in touch. I actually enjoy this part.",
    playful: "Well, well. You found the assistant. Ask me about the work, the writing, or how to reach him. Try to stump me.",
  },
  hinglish: {
    professional: "Hi — main is site ka assistant hoon. Mayank ka kaam, writing, skills ya contact — kuch bhi poochho.",
    warm: "Arre, aa gaye tum. Mayank ka kaam, writing, skills, contact — jo bhi poochna ho, pooch lo. Mujhe ye pasand hai.",
    playful: "Acha gaya, assistant dhundh liya tum. Kaam, writing, ya contact — pucho. Par mushkil sawaal rakhna.",
  },
};

/** Rotates through a list so consecutive replies do not reuse the same line. */
function pick(list: readonly string[], rotation: number): string {
  if (list.length === 0) return '';
  return list[Math.abs(rotation) % list.length];
}

export function welcomeFor(language: ChatbotLanguage, tone: ChatbotTone, rotation = 0): string {
  const byTone = WELCOME[language]?.[tone] ?? WELCOME.english.professional;
  // Fallbacks also rotate so a repeated "I don't know" does not read canned.
  const pool = [byTone, FALLBACKS[language]?.[tone]?.[0] ?? ''].filter(Boolean);
  return pick(pool, rotation);
}

/**
 * Wraps a substantive answer in the chosen voice.
 *
 * `multiturn` suppresses the closer: a longer reply that runs on after the
 * point has landed reads like a salesperson.
 */
export function flavourAnswer(
  answer: string,
  language: ChatbotLanguage,
  tone: ChatbotTone,
  rotation: number,
  multiturn = false,
): string {
  if (tone === 'professional') return answer;

  // Hinglish answers are already written in the right register. Re-framing a
  // Hinglish line with an English opener would read like a bad translation, so
  // the flavour layer only applies to English copy.
  if (language === 'hinglish') return answer;

  const opener = pick(OPENERS[tone], rotation);
  const closer = multiturn ? '' : pick(CLOSERS[tone], rotation + 1);
  return [opener, answer, closer].filter(Boolean).join(' ');
}

export function fallbackFor(
  language: ChatbotLanguage,
  tone: ChatbotTone,
  rotation: number,
): string {
  return pick(FALLBACKS[language]?.[tone] ?? FALLBACKS.english.professional, rotation);
}

export function multiTurnFor(
  language: ChatbotLanguage,
  tone: ChatbotTone,
): string {
  const byTone: Record<ChatbotTone, Record<ChatbotLanguage, string>> = {
    professional: {
      english: "That is a few questions deep — I have probably run out of things I know. For anything specific, the Contact section reaches Mayank directly.",
      hinglish: "Thoda deep ho gaya ye. Jo specific chahiye, uske liye Contact section se seedha Mayank tak pahunch sakte ho.",
    },
    warm: {
      english: "We have gone a fair way in. I am starting to run out of things worth saying — for anything specific, the Contact section goes straight to Mayank.",
      hinglish: "Bahut ho gaya humara discussion. Ab main kya bolun, wo bhi soch raha hoon. Specific kuch chahiye toh Contact section se Mayank tak direct.",
    },
    playful: {
      english: "Okay, I have to admit I am out of material. For anything real, the Contact section puts you straight through to him.",
      hinglish: "Sach kahun, ab mere paas kuch bach nahi bacha. Asli sawaal ke liye Contact section se Mayank tak seedha.",
    },
  };
  return byTone[tone]?.[language] ?? byTone.professional.english;
}

/** Copy for the header toggles, so the labels speak the visitor's language. */
export function toggleLabels(language: ChatbotLanguage) {
  return language === 'hinglish'
    ? {
        english: 'English',
        hinglish: 'Hinglish',
        professional: 'Serious',
        warm: 'Warm',
        playful: 'Playful',
        ariaLanguage: 'Reply language',
        ariaTone: 'Reply tone',
        thinking: 'Soch raha hoon…',
        placeholder: 'Kuch bhi poochho…',
        official: 'Official',
        newTop: 'Naya top score.',
        placed: 'is board par.',
      }
    : {
        english: 'English',
        hinglish: 'Hinglish',
        professional: 'Serious',
        warm: 'Warm',
        playful: 'Playful',
        ariaLanguage: 'Reply language',
        ariaTone: 'Reply tone',
        thinking: 'Looking that up…',
        placeholder: 'Ask anything…',
        official: 'Official',
        newTop: 'New top score.',
        placed: 'place on this board.',
      };
}