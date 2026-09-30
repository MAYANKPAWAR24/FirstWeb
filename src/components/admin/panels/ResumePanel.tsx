import { useState, type FormEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { sounds } from '@/lib/sound';
import type {
  EducationEntry, ExperienceEntry, ExperienceType, LanguageEntry, LanguageProficiency,
  ResumeBlock, ResumeBlockKind, ResumeSettings,
} from '@/lib/types';
import {
  AdminHeader, ConfirmDialog, EmptyState, Field, FormField, FormModal, IconButton, ItemRow,
  SectionCard, Select, TagEditor, Textarea, Toggle,
} from '@/components/admin/primitives';
import { useAdminData } from '@/components/admin/useAdminData';

/**
 * `text` is last because it is the escape hatch: a heading plus a paragraph is
 * enough to add a part of the resume the fixed fields below cannot model.
 */
const BLOCK_KINDS: { value: ResumeBlockKind; label: string }[] = [
  { value: 'education', label: 'Education' },
  { value: 'experience', label: 'Experience' },
  { value: 'language', label: 'Languages' },
  { value: 'skills', label: 'Skills' },
  { value: 'certification', label: 'Certifications' },
  { value: 'award', label: 'Awards' },
  { value: 'text', label: 'Text (anything else)' },
];

const EXPERIENCE_TYPES: { value: ExperienceType; label: string }[] = [
  { value: 'full-time', label: 'Full time' }, { value: 'part-time', label: 'Part time' },
  { value: 'internship', label: 'Internship' }, { value: 'freelance', label: 'Freelance' },
  { value: 'contract', label: 'Contract' }, { value: 'volunteer', label: 'Volunteer' },
];

const PROFICIENCY: { value: LanguageProficiency; label: string }[] = [
  { value: 'native', label: 'Native' }, { value: 'fluent', label: 'Fluent' },
  { value: 'advanced', label: 'Advanced' }, { value: 'intermediate', label: 'Intermediate' },
  { value: 'basic', label: 'Basic' },
];

const BLANK_EDUCATION: Omit<EducationEntry, 'id'> = {
  institution: '', level: '', board: '', field: '', period: '', location: '',
  score: '', scoreLabel: '', notes: '', visible: true, order: 0,
};

const BLANK_EXPERIENCE: Omit<ExperienceEntry, 'id'> = {
  role: '', organisation: '', type: 'full-time', period: '', location: '',
  summary: '', highlights: [], visible: true, order: 0,
};

const BLANK_LANGUAGE: Omit<LanguageEntry, 'id'> = { name: '', proficiency: 'fluent', note: '', visible: true, order: 0 };

const BLANK_BLOCK: Omit<ResumeBlock, 'id'> = { kind: 'text', title: '', content: '', visible: true, order: 0 };

type ListId = 'education' | 'experience' | 'language';

/** Every list in this panel is the same shell: a heading, an add button, and rows. */
interface RowSpec {
  id: string;
  title: string;
  meta?: string;
  chips?: ReactNode;
  hidden: boolean;
  hide: () => void;
  up: () => void;
  down: () => void;
  edit: () => void;
  remove: () => void;
}

interface EditorProps<T> {
  item: T | null;
  onClose: () => void;
  onSave: (form: Omit<T, 'id'>) => void;
}

const labelOf = (options: { value: string; label: string }[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value;

export default function ResumePanel() {
  const {
    data, setResumeSettings, notify,
    addEducation, updateEducation, deleteEducation, moveEducation,
    addExperience, updateExperience, deleteExperience, moveExperience,
    addLanguage, updateLanguage, deleteLanguage, moveLanguage,
  } = useAdminData();

  const [draft, setDraft] = useState<ResumeSettings>(() => structuredClone(data.resumeSettings));
  const [editor, setEditor] = useState<{ list: ListId; id: string | null } | null>(null);
  const [blockEditor, setBlockEditor] = useState<{ id: string | null } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ list: ListId | 'block'; id: string; name: string } | null>(null);

  const patch = <K extends keyof ResumeSettings>(key: K, value: ResumeSettings[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const byOrder = <T extends { order: number }>(list: T[]) => [...list].sort((a, b) => a.order - b.order);
  const education = byOrder(data.education);
  const experiences = byOrder(data.experiences);
  const languages = byOrder(data.languages);
  const blocks = byOrder(draft.blocks);

  /* Entries are written straight into the record, so they are live at once. The
     block order and the section copy are one settings draft, as in the other
     section panels, and publish from the Save button. */
  const patchBlocks = (next: ResumeBlock[]) =>
    patch('blocks', next.map((block, index) => ({ ...block, order: index })));

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    sounds.click();
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    patchBlocks(next);
  };

  const saveBlock = (form: Omit<ResumeBlock, 'id'>) => {
    const title = form.title.trim();
    if (!title) { notify('Give the block a heading', 'error'); return; }
    if (blockEditor?.id) {
      patchBlocks(blocks.map((block) => (block.id === blockEditor.id ? { ...form, id: block.id, title } : block)));
      notify('Block updated');
    } else {
      patchBlocks([...blocks, { ...form, title, id: `rb-${Date.now().toString(36)}` }]);
      notify('Block added to the resume');
    }
    setBlockEditor(null);
  };

  const moveEntry = (list: ListId, id: string, direction: -1 | 1) => {
    sounds.click();
    if (list === 'education') moveEducation(id, direction);
    else if (list === 'experience') moveExperience(id, direction);
    else moveLanguage(id, direction);
  };

  const toggleEntry = (list: ListId, id: string, visible: boolean) => {
    if (list === 'education') updateEducation(id, { visible });
    else if (list === 'experience') updateExperience(id, { visible });
    else updateLanguage(id, { visible });
    notify(visible ? 'Hidden from the public resume' : 'Back on the public resume', 'info');
  };

  const saveEducation = (form: Omit<EducationEntry, 'id'>) => {
    const institution = form.institution.trim();
    if (!institution) { notify('An institution name is required', 'error'); return; }
    if (editor?.id) { updateEducation(editor.id, { ...form, institution }); notify('Education entry updated'); }
    else { addEducation({ ...form, institution }); notify('Education entry added'); }
    setEditor(null);
  };

  const saveExperience = (form: Omit<ExperienceEntry, 'id'>) => {
    const role = form.role.trim();
    if (!role) { notify('A role title is required', 'error'); return; }
    if (editor?.id) { updateExperience(editor.id, { ...form, role }); notify('Experience entry updated'); }
    else { addExperience({ ...form, role }); notify('Experience entry added'); }
    setEditor(null);
  };

  const saveLanguage = (form: Omit<LanguageEntry, 'id'>) => {
    const name = form.name.trim();
    if (!name) { notify('A language name is required', 'error'); return; }
    if (editor?.id) { updateLanguage(editor.id, { ...form, name }); notify('Language updated'); }
    else { addLanguage({ ...form, name }); notify('Language added'); }
    setEditor(null);
  };

  const remove = () => {
    if (!pendingDelete) return;
    const { list, id, name } = pendingDelete;
    if (list === 'block') patchBlocks(blocks.filter((block) => block.id !== id));
    else if (list === 'education') deleteEducation(id);
    else if (list === 'experience') deleteExperience(id);
    else deleteLanguage(id);
    notify(`"${name}" removed from the resume`, 'info');
    setPendingDelete(null);
  };

  const addEntry = (list: ListId) => () => { sounds.click(); setEditor({ list, id: null }); };
  const editing = <T extends { id: string }>(list: ListId | 'block', source: T[]) => {
    const id = list === 'block' ? blockEditor?.id : editor?.list === list ? editor.id : null;
    return id ? source.find((item) => item.id === id) ?? null : null;
  };

  /** The row callbacks the three entry lists share, so each spec stays short. */
  const entryCallbacks = (list: ListId, id: string, name: string, visible?: boolean) => ({
    hidden: visible === false,
    hide: () => toggleEntry(list, id, visible === false),
    up: () => moveEntry(list, id, -1),
    down: () => moveEntry(list, id, 1),
    edit: () => setEditor({ list, id }),
    remove: () => setPendingDelete({ list, id, name }),
  });

  return (
    <div>
      <AdminHeader
        title="Resume"
        description="Everything here feeds the public Resume block: the heading, the parts in the order you choose, and every entry inside them."
        count={education.length + experiences.length + languages.length}
      />

      <div className="max-w-3xl space-y-5">
        <SectionCard title="Section" description="The heading and the optional download button that sit above the parts.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Eyebrow" value={draft.eyebrow} onChange={(value) => patch('eyebrow', value)} maxLength={40} />
            <Field label="Title" value={draft.title} onChange={(value) => patch('title', value)} maxLength={80} />
          </div>
          <div className="mt-4 space-y-4">
            <Textarea label="Intro" rows={3} value={draft.intro} onChange={(value) => patch('intro', value)} />
            <Toggle label="Show download button" hint="Renders in the section header, next to the title." checked={draft.showDownload} onChange={(showDownload) => patch('showDownload', showDownload)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Button label" value={draft.downloadLabel} onChange={(value) => patch('downloadLabel', value)} maxLength={40} />
              <Field
                label="File URL"
                type="url"
                value={draft.downloadUrl}
                onChange={(value) => patch('downloadUrl', value)}
                placeholder="https://example.com/resume.pdf"
                hint="A full https:// address of a file you host."
              />
            </div>

            {draft.showDownload && draft.downloadUrl.trim() === '' && (
              <p role="alert" className="flex items-start gap-2.5 rounded-card border border-[rgba(230,79,55,0.32)] bg-[var(--ember-soft)] px-4 py-3 text-[13px] leading-relaxed text-[var(--ink-2)]">
                <TriangleAlert size={15} aria-hidden="true" className="mt-0.5 flex-none text-[var(--ember)]" />
                <span>
                  <strong className="font-semibold">No file to offer yet.</strong> The button stays hidden on the
                  public resume until this URL is filled in — a download that leads nowhere is worse than none.
                </span>
              </p>
            )}
          </div>
        </SectionCard>

        <ListCard
          title="Parts"
          description="Which parts appear, in what order, under which heading. Add a block to reach a part of the resume the entry lists below do not model — the rows inside a skills, certification or award block come from the Portfolio, Certificates and Achievements tabs. Changes here publish with Save settings."
          addLabel="Add block"
          onAdd={() => { sounds.click(); setBlockEditor({ id: null }); }}
          empty={{ title: 'No parts in this section', body: 'The public resume renders nothing until a part exists. Add one to choose what it shows.' }}
          rows={blocks.map((block, index) => ({
            id: block.id,
            title: block.title || 'Untitled block',
            meta: labelOf(BLOCK_KINDS, block.kind),
            hidden: block.visible === false,
            hide: () => patchBlocks(blocks.map((item) => (item.id === block.id ? { ...item, visible: block.visible === false } : item))),
            up: () => moveBlock(index, -1),
            down: () => moveBlock(index, 1),
            edit: () => setBlockEditor({ id: block.id }),
            remove: () => setPendingDelete({ list: 'block', id: block.id, name: block.title }),
          }))}
        />

        <ListCard
          title="Education"
          description="Schools and degrees — the part of the resume most readers scan first."
          addLabel="Add entry"
          onAdd={addEntry('education')}
          empty={{ title: 'No education entries', body: 'Add the schools and colleges that belong on the resume.' }}
          rows={education.map((item) => ({
            id: item.id,
            title: item.institution,
            meta: [item.field, item.period].filter(Boolean).join(' · '),
            chips: item.score ? <span className="chip chip-accent">{[item.score, item.scoreLabel].filter(Boolean).join(' · ')}</span> : undefined,
            ...entryCallbacks('education', item.id, item.institution, item.visible),
          }))}
        />

        <ListCard
          title="Experience"
          description="Roles, contracts and internships. Highlights are rendered as bullets under the summary."
          addLabel="Add entry"
          onAdd={addEntry('experience')}
          empty={{ title: 'No experience entries', body: 'Add a role to show what you have actually built.' }}
          rows={experiences.map((item) => ({
            id: item.id,
            title: item.role,
            meta: [item.organisation, item.period].filter(Boolean).join(' · '),
            chips: <span className="chip chip-accent">{labelOf(EXPERIENCE_TYPES, item.type)}</span>,
            ...entryCallbacks('experience', item.id, item.role, item.visible),
          }))}
        />

        <ListCard
          title="Languages"
          description="Written in whichever script each language uses — Devanagari, Tamil, Arabic and the rest are stored and shown exactly as typed."
          addLabel="Add entry"
          onAdd={addEntry('language')}
          empty={{ title: 'No languages listed', body: 'Add the languages you read, write or hold a conversation in.' }}
          rows={languages.map((item) => ({
            id: item.id,
            title: item.name,
            meta: item.note || undefined,
            chips: <span className="chip chip-accent">{labelOf(PROFICIENCY, item.proficiency)}</span>,
            ...entryCallbacks('language', item.id, item.name, item.visible),
          }))}
        />

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setResumeSettings(draft); notify('Resume settings saved'); }} className="btn btn-primary px-5 text-[13px]">
            Save settings
          </button>
          <button
            type="button"
            onClick={() => { setDraft(structuredClone(data.resumeSettings)); notify('Reverted to the saved settings', 'info'); }}
            className="btn btn-ghost px-4 text-[13px]"
          >
            Discard changes
          </button>
        </div>

        {editor?.list === 'education' && <EducationForm key={editor.id ?? 'new'} item={editing('education', education)} onClose={() => setEditor(null)} onSave={saveEducation} />}
        {editor?.list === 'experience' && <ExperienceForm key={editor.id ?? 'new'} item={editing('experience', experiences)} onClose={() => setEditor(null)} onSave={saveExperience} />}
        {editor?.list === 'language' && <LanguageForm key={editor.id ?? 'new'} item={editing('language', languages)} onClose={() => setEditor(null)} onSave={saveLanguage} />}
        {blockEditor && <BlockForm key={blockEditor.id ?? 'new'} item={editing('block', blocks)} onClose={() => setBlockEditor(null)} onSave={saveBlock} />}

        <ConfirmDialog
          open={Boolean(pendingDelete)}
          title="Remove this from the resume?"
          message={pendingDelete ? `"${pendingDelete.name}" will be removed${pendingDelete.list === 'block' ? ' from the section order' : ''}.` : ''}
          confirmLabel="Remove"
          onConfirm={remove}
          onCancel={() => setPendingDelete(null)}
        />
      </div>
    </div>
  );
}

/** The card every list shares: heading, add button, rows with the five controls. */
function ListCard({ title, description, addLabel, onAdd, empty, rows }: {
  title: string;
  description: string;
  addLabel: string;
  onAdd: () => void;
  empty: { title: string; body: string };
  rows: RowSpec[];
}) {
  return (
    <SectionCard
      title={title}
      description={description}
      action={(
        <button type="button" onClick={onAdd} className="btn btn-secondary px-4 text-[13px]">
          <Plus size={15} aria-hidden="true" />
          {addLabel}
        </button>
      )}
    >
      {rows.length === 0 ? (
        <EmptyState title={empty.title} body={empty.body} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((row, index) => (
            <ItemRow
              key={row.id}
              dimmed={row.hidden}
              title={row.title}
              meta={row.meta}
              chips={row.hidden ? <>{row.chips}<span className="chip chip-ember">Hidden</span></> : row.chips}
              onSelect={row.edit}
              actions={(
                <>
                  <IconButton label={`${row.hidden ? 'Show' : 'Hide'} ${row.title}`} onClick={row.hide}>
                    {row.hidden ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                  </IconButton>
                  <IconButton label={`Move ${row.title} up`} disabled={index === 0} onClick={row.up}>
                    <ArrowUp size={15} aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Move ${row.title} down`} disabled={index === rows.length - 1} onClick={row.down}>
                    <ArrowDown size={15} aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Edit ${row.title}`} onClick={row.edit}>
                    <Pencil size={15} aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Delete ${row.title}`} tone="danger" onClick={row.remove}>
                    <Trash2 size={15} aria-hidden="true" />
                  </IconButton>
                </>
              )}
            />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function EducationForm({ item, onClose, onSave }: EditorProps<EducationEntry>) {
  const [form, setForm] = useState(item ?? BLANK_EDUCATION);
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSave(form); };

  return (
    <FormModal open title={item ? 'Edit education' : 'Add education'} onClose={onClose} onSubmit={submit} submitLabel={item ? 'Save entry' : 'Add entry'}>
      <Field label="Institution" value={form.institution} onChange={(institution) => setForm({ ...form, institution })} maxLength={120} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Level" value={form.level} onChange={(level) => setForm({ ...form, level })} placeholder="Bachelor of Technology" />
        <Field label="Board" value={form.board} onChange={(board) => setForm({ ...form, board })} placeholder="CBSE, University of Mumbai" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Field of study" value={form.field} onChange={(field) => setForm({ ...form, field })} placeholder="Computer Science" />
        <Field label="Period" value={form.period} onChange={(period) => setForm({ ...form, period })} placeholder="2019 – 2023" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Location" value={form.location} onChange={(location) => setForm({ ...form, location })} />
        <Field label="Score" value={form.score} onChange={(score) => setForm({ ...form, score })} placeholder="92.4%" />
      </div>
      <Field label="Score label" value={form.scoreLabel} onChange={(scoreLabel) => setForm({ ...form, scoreLabel })} placeholder="Percentage, CGPA, Grade" />
      <Textarea label="Notes" rows={3} value={form.notes} onChange={(notes) => setForm({ ...form, notes })} />
    </FormModal>
  );
}

function ExperienceForm({ item, onClose, onSave }: EditorProps<ExperienceEntry>) {
  const [form, setForm] = useState(item ?? BLANK_EXPERIENCE);
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSave(form); };

  return (
    <FormModal open title={item ? 'Edit experience' : 'Add experience'} onClose={onClose} onSubmit={submit} submitLabel={item ? 'Save entry' : 'Add entry'}>
      <Field label="Role" value={form.role} onChange={(role) => setForm({ ...form, role })} maxLength={120} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Organisation" value={form.organisation} onChange={(organisation) => setForm({ ...form, organisation })} />
        <Select label="Type" value={form.type} options={EXPERIENCE_TYPES} onChange={(type) => setForm({ ...form, type: type as ExperienceType })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Period" value={form.period} onChange={(period) => setForm({ ...form, period })} placeholder="2024 – Present" />
        <Field label="Location" value={form.location} onChange={(location) => setForm({ ...form, location })} />
      </div>
      <Textarea label="Summary" rows={3} value={form.summary} onChange={(summary) => setForm({ ...form, summary })} />
      <TagEditor
        label="Highlights"
        tags={form.highlights}
        onChange={(highlights) => setForm({ ...form, highlights })}
        placeholder="One achievement per bullet"
        hint="Rendered as a bulleted list under the summary."
      />
    </FormModal>
  );
}

function LanguageForm({ item, onClose, onSave }: EditorProps<LanguageEntry>) {
  const [form, setForm] = useState(item ?? BLANK_LANGUAGE);
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSave(form); };

  return (
    <FormModal open title={item ? 'Edit language' : 'Add language'} onClose={onClose} onSubmit={submit} submitLabel={item ? 'Save entry' : 'Add entry'}>
      {/* `dir="auto"` so an Arabic or Hebrew name reads right-to-left while it is
          edited, and nothing transforms the value: the script round-trips as typed. */}
      <FormField
        id="language-name"
        label="Language"
        hint="Type the name in its own script — हिन्दी, தமிழ், العربية. Stored exactly as typed."
      >
        <input
          id="language-name"
          dir="auto"
          value={form.name}
          required
          maxLength={60}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          className="field"
        />
      </FormField>
      <Select label="Proficiency" value={form.proficiency} options={PROFICIENCY} onChange={(value) => setForm({ ...form, proficiency: value as LanguageProficiency })} />
      <Field label="Note" value={form.note} onChange={(note) => setForm({ ...form, note })} placeholder="Reading and conversation" maxLength={80} />
    </FormModal>
  );
}

function BlockForm({ item, onClose, onSave }: EditorProps<ResumeBlock>) {
  const [form, setForm] = useState(item ?? BLANK_BLOCK);
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSave(form); };

  return (
    <FormModal open title={item ? 'Edit block' : 'Add block'} onClose={onClose} onSubmit={submit} submitLabel={item ? 'Save block' : 'Add block'}>
      <Select
        label="Kind"
        value={form.kind}
        options={BLOCK_KINDS}
        onChange={(kind) => setForm({ ...form, kind: kind as ResumeBlockKind })}
        hint="Text takes a heading plus a paragraph — use it for anything the other kinds do not cover."
      />
      <Field label="Heading" value={form.title} onChange={(title) => setForm({ ...form, title })} maxLength={80} required />
      {form.kind === 'text' && (
        <Textarea
          label="Content"
          rows={6}
          value={form.content}
          onChange={(content) => setForm({ ...form, content })}
          hint="Rendered verbatim under the heading. Line breaks are kept."
        />
      )}
    </FormModal>
  );
}
