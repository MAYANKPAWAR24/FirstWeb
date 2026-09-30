import { useMemo, useState, type FormEvent } from 'react';
import {
  ChevronDown, ChevronUp, Eye, EyeOff, Pencil, Plus, Trash2,
} from 'lucide-react';
import { sounds } from '@/lib/sound';
import { uid } from '@/lib/utils';
import { DEFAULT_CHATBOT_FAQS, mergeChatbotFAQs } from '@/lib/chatbot';
import type { ChatbotCategory, ChatbotFAQ, ChatbotSettings, SectionId } from '@/lib/types';
import { PUBLIC_SECTIONS } from '@/lib/sectionOrder';
import {
  AdminHeader, ConfirmDialog, DraftHint, Field, FormModal, IconButton, ItemRow,
  SectionCard, Select, Textarea, Toggle,
} from '@/components/admin/primitives';
import { useDraftForm, draftKey } from '@/components/admin/useDraftForm';
import { useAdminData } from '@/components/admin/useAdminData';

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'writing', label: 'Writing' },
  { value: 'media', label: 'Media' },
  { value: 'contact', label: 'Contact' },
  { value: 'work', label: 'Work' },
];

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional — recruiter-safe, plain' },
  { value: 'warm', label: 'Warm — confident and glad you asked (default)' },
  { value: 'playful', label: 'Playful — cheeky, a bit dry, still warm' },
];

const LANGUAGE_OPTIONS = [
  { value: 'english', label: 'English' },
  { value: 'hinglish', label: 'Hinglish — Roman-script Hindi/English' },
];

/** Preview lines so the admin can hear the difference before saving. */
const TONE_PREVIEW: Record<string, string> = {
  professional: '"Here is what I can tell you. Mayank Pawar is a writer and software developer…"',
  warm: '"Good question — here is the honest version. Mayank Pawar is a writer and software developer…"',
  playful: '"Alright, let us get into it. Mayank Pawar is a writer and software developer…"',
};

const FALLBACK_OPTIONS = [
  { value: 'helpful', label: 'Helpful — full explanations' },
  { value: 'witty', label: 'Witty — dry asides' },
  { value: 'minimal', label: 'Minimal — one line' },
];

const SECTION_OPTIONS = [
  { value: '', label: 'No jump button' },
  ...PUBLIC_SECTIONS.map(({ id, label }) => ({ value: id as SectionId, label })),
];

/** A row is either an admin-owned record or an untouched built-in answer. */
type ManagerRow = ChatbotFAQ & { managed: boolean };

/** Stable identity so the merged list below is not rebuilt on every render. */
const NO_MANAGED: ChatbotFAQ[] = [];

export default function ChatbotPanel() {
  const {
    data, setChatbotSettings, addChatbotFAQ, updateChatbotFAQ, deleteChatbotFAQ, notify,
  } = useAdminData();

  const [settings, setSettings] = useState<ChatbotSettings>(() => structuredClone(data.chatbotSettings));
  const [editing, setEditing] = useState<ManagerRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ManagerRow | null>(null);

  const managed = data.chatbotFAQs ?? NO_MANAGED;
  const rows: ManagerRow[] = useMemo(
    () => mergeChatbotFAQs(managed).map((faq) => ({ ...faq, managed: managed.some((item) => item.id === faq.id) })),
    [managed],
  );

  const patchSettings = <K extends keyof ChatbotSettings>(key: K, value: ChatbotSettings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));

  const move = <T extends { id: string }>(list: T[], index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    sounds.click();
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  };

  const save = (form: Omit<ChatbotFAQ, 'id'>) => {
    if (editing?.managed) {
      updateChatbotFAQ(editing.id, form);
      notify('Answer updated — syncing to the cloud');
    } else if (editing) {
      // Overriding a built-in writes a managed override into the record; the
      // embedded answer is never mutated, so it always comes back.
      addChatbotFAQ(form);
      notify('Default answer overridden in the cloud');
    } else {
      addChatbotFAQ(form);
      notify('Answer added to the chatbot');
    }
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div>
      <AdminHeader
        title="Chatbot"
        description="The assistant runs entirely in the browser: keyword matching over a knowledge base with no API key and no network call."
      />

      <div className="max-w-4xl space-y-5">
        <SectionCard title="Assistant">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle label="Enabled" hint="Hides the launcher entirely when off." checked={settings.enabled} onChange={(enabled) => patchSettings('enabled', enabled)} />
              <Select
                label="Default language"
                value={settings.language}
                options={LANGUAGE_OPTIONS}
                hint="Visitors can switch in the panel header unless you turn that off below."
                onChange={(language) => patchSettings('language', language as ChatbotSettings['language'])}
              />
              <p className="mt-2 rounded-card border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5 text-[12px] leading-relaxed text-[var(--muted)]">
                {TONE_PREVIEW[settings.tone] ?? TONE_PREVIEW.warm}
              </p>
              <div className="mt-3">
                <Select
                  label="Tone"
                  value={settings.tone}
                  options={TONE_OPTIONS}
                  hint="Changes how answers are delivered. The facts stay the same in every tone."
                  onChange={(tone) => patchSettings('tone', tone as ChatbotSettings['tone'])}
                />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Toggle
                  label="Let visitors switch language"
                  checked={settings.allowLanguageSwitch}
                  onChange={(allowLanguageSwitch) => patchSettings('allowLanguageSwitch', allowLanguageSwitch)}
                />
                <Toggle
                  label="Let visitors switch tone"
                  checked={settings.allowToneSwitch}
                  onChange={(allowToneSwitch) => patchSettings('allowToneSwitch', allowToneSwitch)}
                />
              </div>
              <div className="mt-3">
                <Field
                  label="Hinglish greeting"
                  value={settings.greetingHinglish}
                  onChange={(greetingHinglish) => patchSettings('greetingHinglish', greetingHinglish)}
                  hint="Shown when a visitor switches to Hinglish."
                />
              </div>
            </div>
            <Field label="Name" value={settings.name} onChange={(value) => patchSettings('name', value)} maxLength={40} />
            <Textarea label="Opening line" value={settings.greeting} onChange={(value) => patchSettings('greeting', value)} rows={2} />
            <Select
              label="Fallback style"
              value={settings.fallbackStyle}
              options={FALLBACK_OPTIONS}
              onChange={(fallbackStyle) => patchSettings('fallbackStyle', fallbackStyle as ChatbotSettings['fallbackStyle'])}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Quick replies"
          description="Buttons offered under an empty conversation. The first six are shown."
        >
          {settings.quickReplies.length === 0 ? (
            <p className="text-[13px] text-[var(--muted)]">No quick replies.</p>
          ) : (
            <ul className="space-y-3">
              {settings.quickReplies.map((reply, index) => (
                <li key={reply.id} className="rounded-card border border-[var(--line)] bg-[var(--surface-2)] p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Button label" value={reply.label} onChange={(label) => patchSettings('quickReplies', settings.quickReplies.map((item) => (item.id === reply.id ? { ...item, label } : item)))} />
                    <Field
                      label="Question it sends"
                      value={reply.query}
                      onChange={(query) => patchSettings('quickReplies', settings.quickReplies.map((item) => (item.id === reply.id ? { ...item, query } : item)))}
                      hint="Matched against the same keywords as the answers below."
                    />
                  </div>
                  <div className="mt-3 flex justify-end gap-1.5">
                    <IconButton label={`Move ${reply.label || 'quick reply'} up`} disabled={index === 0} onClick={() => {
                      const next = move(settings.quickReplies, index, -1);
                      if (next) patchSettings('quickReplies', next);
                    }}>
                      <ChevronUp size={15} aria-hidden="true" />
                    </IconButton>
                    <IconButton label={`Move ${reply.label || 'quick reply'} down`} disabled={index === settings.quickReplies.length - 1} onClick={() => {
                      const next = move(settings.quickReplies, index, 1);
                      if (next) patchSettings('quickReplies', next);
                    }}>
                      <ChevronDown size={15} aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label={`Remove ${reply.label || 'quick reply'}`}
                      tone="danger"
                      onClick={() => patchSettings('quickReplies', settings.quickReplies.filter((item) => item.id !== reply.id))}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => {
              sounds.click();
              patchSettings('quickReplies', [...settings.quickReplies, { id: uid(), label: '', query: '' }]);
            }}
            className="btn btn-secondary mt-4 w-full text-[13px]"
          >
            <Plus size={15} aria-hidden="true" />
            Add a quick reply
          </button>
        </SectionCard>

        <SectionCard
          title="Section chips"
          description="Jump buttons that appear inside an answer. Chips pointing at a hidden section are dropped automatically."
        >
          {settings.sectionChips.length === 0 ? (
            <p className="text-[13px] text-[var(--muted)]">No section chips.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {settings.sectionChips.map((chip, index) => (
                <li key={chip.id} className="rounded-card border border-[var(--line)] bg-[var(--surface-2)] p-3">
                  <Field label="Label" value={chip.label} onChange={(label) => patchSettings('sectionChips', settings.sectionChips.map((item) => (item.id === chip.id ? { ...item, label } : item)))} />
                  <div className="mt-3">
                    <Select
                      label="Goes to"
                      value={chip.target}
                      options={SECTION_OPTIONS.slice(1)}
                      onChange={(target) => patchSettings('sectionChips', settings.sectionChips.map((item) => (item.id === chip.id ? { ...item, target: target as SectionId } : item)))}
                    />
                  </div>
                  <div className="mt-3 flex justify-end gap-1.5">
                    <IconButton label={`Move ${chip.label || 'chip'} up`} disabled={index === 0} onClick={() => {
                      const next = move(settings.sectionChips, index, -1);
                      if (next) patchSettings('sectionChips', next);
                    }}>
                      <ChevronUp size={15} aria-hidden="true" />
                    </IconButton>
                    <IconButton label={`Move ${chip.label || 'chip'} down`} disabled={index === settings.sectionChips.length - 1} onClick={() => {
                      const next = move(settings.sectionChips, index, 1);
                      if (next) patchSettings('sectionChips', next);
                    }}>
                      <ChevronDown size={15} aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label={`Remove ${chip.label || 'chip'}`}
                      tone="danger"
                      onClick={() => patchSettings('sectionChips', settings.sectionChips.filter((item) => item.id !== chip.id))}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => {
              sounds.click();
              patchSettings('sectionChips', [...settings.sectionChips, { id: uid(), label: '', target: 'portfolio' }]);
            }}
            className="btn btn-secondary mt-4 w-full text-[13px]"
          >
            <Plus size={15} aria-hidden="true" />
            Add a section chip
          </button>
        </SectionCard>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setChatbotSettings({
                ...settings,
                name: settings.name.trim() || 'Site Assistant',
                quickReplies: settings.quickReplies.filter((reply) => reply.label.trim()),
                sectionChips: settings.sectionChips.filter((chip) => chip.label.trim()),
              });
              notify('Chatbot settings saved');
            }}
            className="btn btn-primary px-5 text-[13px]"
          >
            Save assistant settings
          </button>
          <button
            type="button"
            onClick={() => {
              setSettings(structuredClone(data.chatbotSettings));
              notify('Reverted to the saved chatbot settings', 'info');
            }}
            className="btn btn-ghost px-4 text-[13px]"
          >
            Discard changes
          </button>
        </div>

        <SectionCard
          title="Knowledge base"
          description={`${managed.length} custom answer${managed.length === 1 ? '' : 's'} and ${rows.length - managed.length} built-in default${rows.length - managed.length === 1 ? '' : 's'}. A custom answer replaces a default only when it covers every one of that default's keywords.`}
          action={(
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const existing = new Set(managed.flatMap((faq) => faq.keywords));
                  const missing = DEFAULT_CHATBOT_FAQS.filter((faq) => !faq.keywords.some((keyword) => existing.has(keyword)));
                  if (missing.length === 0) {
                    notify('Every default is already in the record', 'info');
                    return;
                  }
                  missing.forEach((faq) => addChatbotFAQ({
                    question: faq.keywords[0],
                    answer: faq.response,
                    keywords: [...faq.keywords],
                    synonyms: faq.synonyms ?? [],
                    category: faq.category ?? 'general',
                    enabled: true,
                  }));
                  notify(`Imported ${missing.length} default answer${missing.length > 1 ? 's' : ''}`);
                }}
                className="btn btn-secondary px-3 text-xs"
              >
                Import all defaults
              </button>
              <button
                type="button"
                onClick={() => { setEditing(null); setShowForm(true); }}
                className="btn btn-primary px-3 text-xs"
              >
                <Plus size={14} aria-hidden="true" />
                New answer
              </button>
            </div>
          )}
        >
          {rows.length === 0 ? (
            <p className="text-[13px] text-[var(--muted)]">Nothing to show.</p>
          ) : (
            <ul className="space-y-3">
              {rows.map((faq) => (
                <ItemRow
                  key={faq.id}
                  dimmed={faq.enabled === false}
                  title={faq.question}
                  meta={faq.category ? `${faq.category}${faq.section ? ` · jumps to ${faq.section}` : ''}` : undefined}
                  body={<p className="line-clamp-2">{faq.answer}</p>}
                  chips={(
                    <>
                      <span className={faq.managed ? 'chip chip-accent' : 'chip'}>
                        {faq.managed ? 'Custom' : 'Built-in default'}
                      </span>
                      {faq.keywords.map((keyword) => <span key={keyword} className="tag">{keyword}</span>)}
                      {faq.synonyms?.map((synonym) => <span key={synonym} className="tag">~{synonym}</span>)}
                    </>
                  )}
                  actions={(
                    <>
                      {faq.managed ? (
                        <>
                          <IconButton
                            label={faq.enabled === false ? `Enable ${faq.question}` : `Disable ${faq.question}`}
                            onClick={() => {
                              updateChatbotFAQ(faq.id, { enabled: faq.enabled === false });
                              notify(faq.enabled === false ? 'Answer enabled' : 'Answer disabled', 'info');
                            }}
                          >
                            {faq.enabled === false ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                          </IconButton>
                          <IconButton label={`Delete ${faq.question}`} tone="danger" onClick={() => setPendingDelete(faq)}>
                            <Trash2 size={15} aria-hidden="true" />
                          </IconButton>
                        </>
                      ) : (
                        <IconButton
                          label={`Dismiss the built-in answer: ${faq.question}`}
                          onClick={() => {
                            addChatbotFAQ({
                              question: faq.question,
                              answer: faq.answer,
                              keywords: [...faq.keywords],
                              synonyms: faq.synonyms ?? [],
                              category: faq.category ?? 'general',
                              enabled: false,
                            });
                            notify('Default dismissed on this site — the built-in stays in the app');
                          }}
                        >
                          <EyeOff size={15} aria-hidden="true" />
                        </IconButton>
                      )}
                      <IconButton
                        label={`${faq.managed ? 'Edit' : 'Override'}: ${faq.question}`}
                        onClick={() => { setEditing(faq); setShowForm(true); }}
                      >
                        <Pencil size={15} aria-hidden="true" />
                      </IconButton>
                    </>
                  )}
                />
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {showForm && (
        <FaqForm
          key={editing?.id ?? 'new'}
          faq={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={save}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this answer?"
        message={`"${pendingDelete?.question ?? ''}" is removed from the knowledge base. The built-in default it replaced, if any, comes straight back.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          deleteChatbotFAQ(pendingDelete!.id);
          notify('Answer removed');
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

/** Form-local shape: keyword and synonym lists are edited as comma-separated text. */
interface FaqFormState {
  question: string;
  answer: string;
  keywords: string;
  synonyms: string;
  category: ChatbotCategory;
  section: SectionId | '';
  enabled: boolean;
}

function FaqForm({
  faq, onClose, onSave,
}: {
  faq: ManagerRow | null;
  onClose: () => void;
  onSave: (form: Omit<ChatbotFAQ, 'id'>) => void;
}) {
  const { notify } = useAdminData();
  const draft = useDraftForm<FaqFormState>(draftKey('faq', faq?.id), {
    question: faq?.question ?? '',
    answer: faq?.answer ?? '',
    keywords: (faq?.keywords ?? []).join(', '),
    synonyms: (faq?.synonyms ?? []).join(', '),
    category: faq?.category ?? 'general',
    section: faq?.section ?? '',
    enabled: faq?.enabled !== false,
  });
  const { value: form } = draft;
  const split = (raw: string) => raw.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.answer.trim()) {
      notify('A response is required', 'error');
      return;
    }
    const keywords = split(form.keywords);
    // A label with no trigger would never be matched, so it becomes one.
    const triggers = keywords.length > 0 ? keywords : [form.question.trim().toLowerCase()].filter(Boolean);
    if (triggers.length === 0) {
      notify('Add at least one keyword, or a label the bot can trigger on', 'error');
      return;
    }
    onSave({
      question: form.question.trim() || triggers[0],
      answer: form.answer.trim(),
      keywords: triggers,
      synonyms: split(form.synonyms),
      category: form.category,
      section: form.section || undefined,
      enabled: form.enabled,
    });
    draft.clear();
  };

  return (
    <FormModal
      open
      title={faq?.managed ? 'Edit answer' : faq ? 'Override a default' : 'New answer'}
      meta={faq?.managed ? undefined : 'Saved as a custom answer; the built-in stays untouched'}
      onClose={() => { draft.clear(); onClose(); }}
      onSubmit={submit}
      submitLabel={faq?.managed ? 'Save answer' : 'Add answer'}
      dirty
    >
      <DraftHint visible={draft.restored} />
      <Field label="Label" value={form.question} onChange={(question) => draft.patch({ question })} hint="What you see in this list. Also used as a trigger when no keywords are given." />
      <Textarea label="Bot response" value={form.answer} onChange={(answer) => draft.patch({ answer })} rows={5} />
      <Field
        label="Keywords"
        value={form.keywords}
        onChange={(keywords) => draft.patch({ keywords })}
        placeholder="internship, intern, hiring"
        hint="Comma separated. Longer phrases win over single words, so keep the specific ones."
      />
      <Field
        label="Synonyms"
        value={form.synonyms}
        onChange={(synonyms) => draft.patch({ synonyms })}
        placeholder="open role, hiring, vacancy"
        hint="Counted slightly less than a literal keyword, so an exact question still wins."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Category"
          value={form.category}
          options={CATEGORIES}
          onChange={(category) => draft.patch({ category: category as ChatbotCategory })}
        />
        <Select
          label="Jump to section"
          value={form.section}
          options={SECTION_OPTIONS}
          onChange={(section) => draft.patch({ section: section as SectionId | '' })}
        />
      </div>
      <Toggle label="Enabled" hint="Disabled answers stay in the record but stop answering." checked={form.enabled} onChange={(enabled) => draft.patch({ enabled })} />
    </FormModal>
  );
}