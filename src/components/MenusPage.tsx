import { useEffect, useRef, useState } from 'react';
import { fetchMenus, updateMenuContent, createMenuDraft, Menu } from '../lib/database';
import { supabase } from '../lib/supabase';

interface MenusPageProps {
  onBack: () => void;
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
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handlePublish = async () => {
    if (!draft) return;
    if (!window.confirm(`Publish Uke ${draft.week_number} to the shared Notion page?`)) return;
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
            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${isPublishing ? 'bg-muted text-muted-foreground' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
            >
              {isPublishing ? 'Publishing…' : 'Post to Notion'}
            </button>
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
          No draft waiting. Remy files the next one on Sunday, or start from a previous week below.
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
                  <button
                    type="button"
                    onClick={() => handleUseAsDraft(menu)}
                    className="self-start rounded-full bg-background px-4 py-1.5 text-sm text-foreground hover:bg-accent"
                  >
                    Use as this week's draft
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
