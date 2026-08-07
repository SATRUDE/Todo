import { useEffect, useRef, useState } from 'react';
import { fetchMenus, updateMenuContent, updateMenuIngredients, createMenuDraft, Menu } from '../lib/database';
import { supabase } from '../lib/supabase';
import { ConfirmDialog } from './ConfirmDialog';

interface MenusPageProps {
  onBack: () => void;
}

const DAY_PATTERN = /^(mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag)\b/i;

interface DayBlock {
  /** Canonical Norwegian day name, as stored in the ingredients map */
  day: string;
  dayLineIndex: number;
  ingredientLineIndexes: number[];
  ingredientText: string;
}

/**
 * Walk the plain-text week and find each day line and the ingredient lines
 * sitting under it. Index-based rather than re-serialising, so nothing Mark has
 * typed elsewhere in the draft gets reformatted by an add or a remove.
 */
function parseDays(content: string): DayBlock[] {
  const lines = content.split('\n');
  const days: DayBlock[] = [];
  let current: DayBlock | null = null;
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (/^-{3,}$/.test(line)) { current = null; return; }
    if (!line) return;
    if (line.startsWith('💡')) { current = null; return; }
    const match = DAY_PATTERN.exec(line);
    if (match) {
      const day = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      current = { day, dayLineIndex: i, ingredientLineIndexes: [], ingredientText: '' };
      days.push(current);
      return;
    }
    if (current) {
      current.ingredientLineIndexes.push(i);
      current.ingredientText = current.ingredientText ? `${current.ingredientText}\n${line}` : line;
    }
  });
  return days;
}

/** Drop the ingredient lines under the named days, leaving the dish lines alone. */
function stripIngredients(content: string, days: DayBlock[]): string {
  const drop = new Set(days.flatMap(d => d.ingredientLineIndexes));
  if (!drop.size) return content;
  return content.split('\n').filter((_, i) => !drop.has(i)).join('\n');
}

/** Put a day's ingredients back on the line directly under its dish. */
function insertIngredients(content: string, additions: { dayLineIndex: number; text: string }[]): string {
  const lines = content.split('\n');
  // Descending, so an earlier insert cannot shift a later index
  for (const add of [...additions].sort((a, b) => b.dayLineIndex - a.dayLineIndex)) {
    lines.splice(add.dayLineIndex + 1, 0, ...add.text.split('\n'));
  }
  return lines.join('\n');
}

// The stored format uses `---` lines to divide the days, which the Notion publish step
// turns into real dividers. Pasted into a message thread those lines just read as noise,
// so a copy is tidied into a plain readable week instead.
function formatForMessage(content: string, week: number): string {
  const body = content
    .split('\n')
    .map(line => (line.trim() === '---' ? '' : line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
  const [pendingStash, setPendingStash] = useState<Record<string, string>>({});
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

  // What each day is carrying right now, derived from the text on screen
  const draftDays = draft ? parseDays(draftContent) : [];
  // Where a day's ingredients come from when they are not in the dish list:
  // what Remy filed, plus anything removed in this session that is not saved yet.
  const savedIngredients: Record<string, string> = { ...(draft?.ingredients || {}), ...pendingStash };
  const daysWithIngredients = draftDays.filter(d => d.ingredientLineIndexes.length > 0);
  const daysAddable = draftDays.filter(d => d.ingredientLineIndexes.length === 0 && savedIngredients[d.day]);

  /** Write the draft straight through, ahead of the debounce, so a click cannot race a keystroke. */
  const commitContent = async (content: string) => {
    if (!draft) return;
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    setDraftContent(content);
    try {
      setIsSaving(true);
      await updateMenuContent(draft.id, content);
    } catch {
      setError('Could not save the draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveIngredients = async (days: DayBlock[]) => {
    if (!draft || !days.length) return;
    setError(null);
    const removed: Record<string, string> = {};
    for (const d of days) if (d.ingredientText) removed[d.day] = d.ingredientText;
    setPendingStash(prev => ({ ...prev, ...removed }));
    await commitContent(stripIngredients(draftContent, days));
    // Keep them for next time. A database without the column just means this
    // visit remembers them and a later one does not, never a lost dish list.
    try {
      await updateMenuIngredients(draft.id, { ...(draft.ingredients || {}), ...pendingStash, ...removed });
    } catch {
      setError('Removed from the list, but I could not save them for later. They will come back until you reload.');
    }
  };

  const handleAddIngredients = async (days: DayBlock[]) => {
    if (!draft || !days.length) return;
    setError(null);
    const additions = days
      .filter(d => savedIngredients[d.day])
      .map(d => ({ dayLineIndex: d.dayLineIndex, text: savedIngredients[d.day] }));
    if (!additions.length) return;
    await commitContent(insertIngredients(draftContent, additions));
  };

  const handleCopy = async (key: string, content: string, week: number) => {
    setError(null);
    try {
      await copyText(formatForMessage(content, week));
      setCopiedKey(key);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopiedKey(null), 2000);
    } catch {
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
                onClick={() => handleCopy('draft', draftContent, draft.week_number)}
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
          <p className="text-xs text-muted-foreground">Settle the dishes first; ingredients go in below when you are happy with the week. Nothing reaches the shared Notion page until you post it.</p>
          <textarea
            value={draftContent}
            onChange={(e) => scheduleSave(e.target.value)}
            rows={16}
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground outline-none resize-y leading-relaxed font-mono"
          />

          {draftDays.length > 0 && (
            <div className="flex flex-col gap-2 rounded-xl bg-secondary px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-foreground">Ingredients</h3>
                <div className="flex items-center gap-2">
                  {daysAddable.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleAddIngredients(daysAddable)}
                      className="rounded-full bg-blue-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
                    >
                      Add ingredients
                    </button>
                  )}
                  {daysWithIngredients.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredients(daysWithIngredients)}
                      className="rounded-full bg-background px-4 py-1.5 text-sm text-foreground hover:bg-accent"
                    >
                      Remove all
                    </button>
                  )}
                </div>
              </div>
              <ul className="flex flex-col divide-y divide-border">
                {draftDays.map(d => {
                  const has = d.ingredientLineIndexes.length > 0;
                  const saved = savedIngredients[d.day];
                  return (
                    <li key={`${d.day}-${d.dayLineIndex}`} className="flex items-start justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <span className="text-sm text-foreground">{d.day}</span>
                        <p className="truncate text-xs text-muted-foreground">
                          {has ? d.ingredientText.replace(/\n/g, ' · ') : saved ? 'not in the list' : 'none saved'}
                        </p>
                      </div>
                      {has ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredients([d])}
                          className="shrink-0 rounded-full bg-background px-3 py-1 text-xs text-foreground hover:bg-accent"
                        >
                          Remove
                        </button>
                      ) : saved ? (
                        <button
                          type="button"
                          onClick={() => handleAddIngredients([d])}
                          className="shrink-0 rounded-full bg-background px-3 py-1 text-xs text-foreground hover:bg-accent"
                        >
                          Add
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
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
                      onClick={() => handleCopy(`week-${menu.id}`, menu.content, menu.week_number)}
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
