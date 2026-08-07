import { useEffect, useRef, useState } from 'react';
import { fetchMenus, updateMenuContent, createMenuDraft, Menu } from '../lib/database';
import { supabase } from '../lib/supabase';
import { ConfirmDialog } from './ConfirmDialog';
import { AppSheet } from './AppSheet';
import { Switch } from './ui/switch';

interface MenusPageProps {
  onBack: () => void;
}

const DAY_PATTERN = /^(mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag)\b/i;
/** The note Remy hangs off a dish, after a spaced dash: who is out, whose evening is busy. */
const NOTE_SEPARATOR = /\s+[–—-]\s+/;

export interface CopyOptions {
  ingredients: boolean;
  notes: boolean;
  swap: boolean;
}

export const DEFAULT_COPY_OPTIONS: CopyOptions = { ingredients: false, notes: false, swap: true };

const COPY_OPTIONS_KEY = 'menu-copy-options';

/**
 * Build the text to copy out of the week.
 *
 * The draft holds everything: dishes, the ingredients under each one, the
 * calendar context on the day line, and the swap tip. Most of that is working
 * detail rather than something to send someone, so what leaves is chosen here
 * rather than removed from the week itself.
 *
 * The `---` lines exist for the Notion publish step to turn into real dividers;
 * in a message thread they only read as noise, so they always become blank lines.
 */
export function buildCopyText(content: string, week: number, opts: CopyOptions): string {
  const out: string[] = [];
  let inSwap = false;
  let underDay = false;

  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (/^-{3,}$/.test(line)) { out.push(''); underDay = false; inSwap = false; continue; }
    if (!line) { out.push(''); continue; }

    if (line.startsWith('💡')) {
      inSwap = true;
      underDay = false;
      if (opts.swap) out.push(line);
      continue;
    }
    // A wrapped swap tip keeps following its own switch
    if (inSwap) { if (opts.swap) out.push(line); continue; }

    if (DAY_PATTERN.test(line)) {
      underDay = true;
      out.push(opts.notes ? line : line.split(NOTE_SEPARATOR)[0].trim());
      continue;
    }
    // Anything sitting under a day line is that dish's ingredients
    if (underDay && !opts.ingredients) continue;
    out.push(line);
  }

  const body = out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return `Uke ${week}\n\n${body}`;
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Older iOS Safari, and any context where the async clipboard is unavailable
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(el);
  if (!ok) throw new Error('Copy failed');
}

// ISO week number (Norwegian convention: weeks start Monday)
function isoWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

export function MenusPage({ onBack }: MenusPageProps) {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draftContent, setDraftContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyTarget, setCopyTarget] = useState<{ key: string; content: string; week: number } | null>(null);
  // Remembered between visits: the same choice usually applies every week
  const [copyOptions, setCopyOptions] = useState<CopyOptions>(() => {
    try {
      const saved = localStorage.getItem(COPY_OPTIONS_KEY);
      return saved ? { ...DEFAULT_COPY_OPTIONS, ...JSON.parse(saved) } : DEFAULT_COPY_OPTIONS;
    } catch {
      return DEFAULT_COPY_OPTIONS;
    }
  });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const draft = menus.find(m => m.status === 'draft') || null;
  const archive = menus.filter(m => m.id !== draft?.id);

  const load = async () => {
    try {
      const rows = await fetchMenus();
      setMenus(rows);
      const d = rows.find(m => m.status === 'draft');
      if (d) setDraftContent(d.content);
    } catch (err: any) {
      setError(err?.message?.includes('menus') ? 'The menus table is not set up yet (run menus-schema.sql in Supabase).' : (err?.message || 'Could not load menus'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current); }, []);

  useEffect(() => {
    try { localStorage.setItem(COPY_OPTIONS_KEY, JSON.stringify(copyOptions)); } catch { /* private mode */ }
  }, [copyOptions]);

  const openCopySheet = (key: string, content: string, week: number) => {
    setError(null);
    setCopyTarget({ key, content, week });
  };

  const handleCopy = async () => {
    if (!copyTarget) return;
    setError(null);
    try {
      await copyText(buildCopyText(copyTarget.content, copyTarget.week, copyOptions));
      setCopiedKey(copyTarget.key);
      setCopyTarget(null);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setCopyTarget(null);
      setError('Could not copy the menu. Select the text and copy it by hand.');
    }
  };

  const scheduleSave = (content: string) => {
    setDraftContent(content);
    if (!draft) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        await updateMenuContent(draft.id, content);
      } catch {
        setError('Could not save the draft');
      } finally {
        setIsSaving(false);
      }
    }, 800);
  };

  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);

  const handlePublish = () => {
    if (!draft) return;
    setIsPublishConfirmOpen(true);
  };

  const performPublish = async () => {
    if (!draft) return;
    setIsPublishing(true);
    setError(null);
    try {
      // Flush any pending edit first
      if (saveTimer.current) { clearTimeout(saveTimer.current); await updateMenuContent(draft.id, draftContent); }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('You must be signed in to publish.');
      const res = await fetch('/api/publish-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ menuId: draft.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Publish failed');
      setMessage(`Uke ${draft.week_number} published to Notion.`);
      setTimeout(() => setMessage(null), 4000);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Publish failed');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUseAsDraft = async (menu: Menu) => {
    setError(null);
    try {
      if (draft) {
        // A draft already exists: copy the old week's content into it
        setDraftContent(menu.content);
        await updateMenuContent(draft.id, menu.content);
        setMessage(`Copied Uke ${menu.week_number} into the current draft.`);
      } else {
        const next = isoWeek(new Date(Date.now() + 7 * 86400000));
        await createMenuDraft(menu.content, next.week, next.year);
        setMessage(`New draft for Uke ${next.week} created from Uke ${menu.week_number}.`);
        await load();
      }
      setTimeout(() => setMessage(null), 4000);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err?.message || 'Could not create the draft');
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="flex size-9 items-center justify-center rounded-full bg-secondary text-foreground hover:bg-accent" aria-label="Back">
          <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-2xl font-semibold text-foreground">Menu</h1>
        {isSaving && <span className="text-xs text-muted-foreground">Saving…</span>}
      </div>

      {message && <div className="rounded-xl bg-green-500/10 text-green-600 px-4 py-3 text-sm">{message}</div>}
      {error && <div className="rounded-xl bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : draft ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-foreground">Uke {draft.week_number} · draft</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openCopySheet('draft', draftContent, draft.week_number)}
                className="rounded-full bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                {copiedKey === 'draft' ? 'Copied' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={isPublishing}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${isPublishing ? 'bg-muted text-muted-foreground' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
              >
                {isPublishing ? 'Publishing…' : 'Post to Notion'}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Edit freely; it saves as you type. Nothing reaches the shared Notion page until you post it.</p>
          <textarea
            value={draftContent}
            onChange={(e) => scheduleSave(e.target.value)}
            rows={16}
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground outline-none resize-y leading-relaxed font-mono"
          />
        </div>
      ) : (
        <div className="rounded-xl bg-secondary px-4 py-6 text-sm text-muted-foreground">
          No draft waiting. Remy files the next one on Friday, or start from a previous week below.
        </div>
      )}

      {archive.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-foreground">Previous weeks</h2>
          {archive.map(menu => (
            <div key={menu.id} className="rounded-xl bg-secondary px-4 py-3">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setExpandedId(expandedId === menu.id ? null : menu.id)}
              >
                <span className="text-sm font-medium text-foreground">Uke {menu.week_number} · {menu.year}</span>
                <span className="text-xs text-muted-foreground">{menu.status === 'published' ? 'published' : 'unpublished'}</span>
              </button>
              {expandedId === menu.id && (
                <div className="mt-3 flex flex-col gap-3">
                  <pre className="whitespace-pre-wrap text-xs text-muted-foreground leading-relaxed font-mono">{menu.content}</pre>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openCopySheet(`week-${menu.id}`, menu.content, menu.week_number)}
                      className="rounded-full bg-background px-4 py-1.5 text-sm text-foreground hover:bg-accent"
                    >
                      {copiedKey === `week-${menu.id}` ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUseAsDraft(menu)}
                      className="rounded-full bg-background px-4 py-1.5 text-sm text-foreground hover:bg-accent"
                    >
                      Use as this week's draft
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <AppSheet
        open={copyTarget !== null}
        onOpenChange={(open) => { if (!open) setCopyTarget(null); }}
        title="Copy the week"
      >
        <div className="flex flex-col gap-5 pb-2">
          <div>
            <h2 className="text-lg font-medium text-foreground">Copy Uke {copyTarget?.week}</h2>
            <p className="text-sm text-muted-foreground">Choose what goes with it. The week itself keeps everything.</p>
          </div>

          <div className="flex flex-col divide-y divide-border">
            {([
              { key: 'ingredients', label: 'Ingredients', hint: 'The shopping detail under each dish' },
              { key: 'notes', label: 'Notes on the day', hint: "Who's out, whose evening is busy" },
              { key: 'swap', label: 'The swap tip', hint: "Remy's optional extra idea" },
            ] as const).map(opt => (
              <label key={opt.key} htmlFor={`copy-${opt.key}`} className="flex items-center justify-between gap-4 py-3">
                <span className="min-w-0">
                  <span className="block text-sm text-foreground">{opt.label}</span>
                  <span className="block text-xs text-muted-foreground">{opt.hint}</span>
                </span>
                <Switch
                  id={`copy-${opt.key}`}
                  checked={copyOptions[opt.key]}
                  onCheckedChange={(checked) => setCopyOptions(prev => ({ ...prev, [opt.key]: checked }))}
                />
              </label>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">This is what you get</span>
            <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl bg-secondary px-4 py-3 text-xs leading-relaxed text-foreground">
              {copyTarget ? buildCopyText(copyTarget.content, copyTarget.week, copyOptions) : ''}
            </pre>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full rounded-full bg-blue-500 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            Copy
          </button>
        </div>
      </AppSheet>

      <ConfirmDialog
        open={isPublishConfirmOpen}
        onOpenChange={setIsPublishConfirmOpen}
        title={draft ? `Publish Uke ${draft.week_number}?` : 'Publish?'}
        description="The menu goes onto the shared Notion page, where Ida sees it."
        confirmLabel="Post to Notion"
        onConfirm={performPublish}
      />
    </div>
  );
}
