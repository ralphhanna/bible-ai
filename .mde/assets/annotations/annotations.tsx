// React adapter for the shared MDE annotation core.
// Mount <AnnotationLayer /> once in the app shell.

import { useCallback, useEffect, useState } from 'react';
import {
  contextSummary,
  createAnnotationApi,
  describeTarget,
  resolveTarget,
  type Annotation,
  type AnnotationTarget,
} from './annotations-core.mjs';

export type { Annotation, AnnotationTarget };
export { buildDomPath, pickStrategy, describeTarget, resolveTarget } from './annotations-core.mjs';

const annotationApi = createAnnotationApi();

export function AnnotationLayer({ pagePath }: { pagePath?: string }) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [mode, setMode] = useState(false);
  const [editing, setEditing] = useState<AnnotationTarget | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const currentPage = pagePath || (typeof location !== 'undefined' ? location.pathname : '');

  const reload = useCallback(async () => {
    try {
      const doc = await annotationApi.fetchDocument();
      setAnnotations(doc.annotations || []);
    } catch {
      setAnnotations([]);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const openEditor = useCallback((target: AnnotationTarget, annotation?: Annotation) => {
    setMode(false);
    setEditing(target);
    setEditingId(annotation?.id || null);
    setNote(annotation?.note || '');
  }, []);

  useEffect(() => {
    if (!mode) return;
    const handler = (event: MouseEvent) => {
      const element = event.target as Element;
      if (element.closest('[data-annotations-ui]')) return;
      event.preventDefault();
      event.stopPropagation();
      const root = document.querySelector('main') || document.body;
      openEditor(describeTarget(element, root));
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [mode, openEditor]);

  const onPage = annotations.filter((annotation) => annotation.pagePath === currentPage);

  useEffect(() => {
    const markers: HTMLButtonElement[] = [];
    onPage.forEach((annotation, index) => {
      const element = resolveTarget(annotation.target, document);
      if (!element || element.closest('[data-annotations-ui]')) return;
      const rect = element.getBoundingClientRect();
      if (!rect.width && !rect.height) return;
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.dataset.annotationsUi = 'true';
      marker.textContent = String(index + 1);
      marker.title = annotation.note;
      Object.assign(marker.style, {
        position: 'fixed',
        left: `${Math.max(8, rect.right - 8)}px`,
        top: `${Math.max(8, rect.top - 8)}px`,
        zIndex: '9998',
        width: '22px',
        height: '22px',
        border: '2px solid #fff',
        borderRadius: '999px',
        background: '#f59e0b',
        color: '#111827',
        cursor: 'pointer',
        fontSize: '11px',
        fontWeight: '800',
      });
      marker.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        element.scrollIntoView({ block: 'center', behavior: 'smooth' });
        openEditor(annotation.target, annotation);
      });
      document.body.appendChild(marker);
      markers.push(marker);
    });
    return () => markers.forEach((marker) => marker.remove());
  }, [onPage, openEditor]);

  const closeEditor = () => {
    setEditing(null);
    setEditingId(null);
    setNote('');
    setMode(false);
  };

  const save = async () => {
    if (!editing || !note.trim()) return;
    if (editingId) {
      const nextAnnotations = annotations.map((annotation) => (
        annotation.id === editingId
          ? { ...annotation, note: note.trim(), target: editing, updatedAt: new Date().toISOString() }
          : annotation
      ));
      await annotationApi.replaceDocument({ annotations: nextAnnotations });
    } else {
      await annotationApi.create({
        pagePath: currentPage,
        note: note.trim(),
        target: editing,
      });
    }
    closeEditor();
    await reload();
  };

  const remove = async () => {
    if (!editingId) return;
    await annotationApi.remove(editingId);
    closeEditor();
    await reload();
  };

  const liveTarget = editing ? resolveTarget(editing, document) : null;
  const summary = editing
    ? contextSummary(editing, liveTarget, document.querySelector('main') || document.body)
    : '';

  return (
    <div data-annotations-ui data-testid="annotation-layer">
      <div data-testid="annotation-toolbar"
           style={{ position: 'fixed', bottom: 16, left: 16, zIndex: 9999, display: 'flex', gap: 8, alignItems: 'center',
                    background: '#0f172a', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>
        <button data-testid="annotation-mode" onClick={() => setMode((value) => !value)}
                style={{ background: mode ? '#16a34a' : '#334155', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
          {mode ? 'Annotating - click an element' : 'Annotate'}
        </button>
        <span data-testid="annotation-count">{onPage.length} note(s)</span>
      </div>

      {editing && (
        <div data-testid="annotation-editor"
             style={{ position: 'fixed', bottom: 64, left: 16, zIndex: 9999, width: 340, background: '#fff', color: '#0f172a',
                      border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, boxShadow: '0 6px 20px rgba(0,0,0,.2)' }}>
          <div style={{ fontSize: 12, color: '#1e3a5f', marginBottom: 8, padding: '6px 8px', background: '#eff6ff', borderLeft: '3px solid #60a5fa' }}>
            {summary || `${editing.strategy} - ${editing.tagName}`}
          </div>
          <textarea data-testid="annotation-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)}
                    style={{ width: '100%', fontSize: 13 }} placeholder="Reviewer note..." />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button data-testid="annotation-save" onClick={save}
                    style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Save</button>
            {editingId && <button onClick={remove} style={{ color: '#991b1b' }}>Delete</button>}
            <button data-testid="annotation-cancel" onClick={closeEditor}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnnotationLayer;
