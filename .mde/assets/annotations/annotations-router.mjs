// Annotations server router (shipped MDE asset — domain-agnostic).
// Mount on the REAL app server: app.use('/api/annotations', annotationsRouter()).
// Persists all annotations to ONE JSON file. No database.

import express from 'express';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_FILE = process.env.ANNOTATIONS_FILE || 'runtime/annotations.json';

function emptyDoc() {
  return { schemaVersion: 1, app: 'mde-prototype', updatedAt: new Date().toISOString(), annotations: [] };
}

function loadDoc(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return emptyDoc();
  }
}

function saveDoc(file, doc) {
  doc.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(doc, null, 2) + '\n');
  fs.renameSync(tmp, file);
  return doc;
}

export function annotationsRouter(opts = {}) {
  const file = opts.file || DEFAULT_FILE;
  const router = express.Router();
  router.use(express.json({ limit: '1mb' }));

  // Full document.
  router.get('/', (_req, res) => res.json(loadDoc(file)));

  // Replace the whole document (v1 overwrite semantics).
  router.put('/', (req, res) => {
    const body = req.body || {};
    const doc = { ...emptyDoc(), ...body, annotations: Array.isArray(body.annotations) ? body.annotations : [] };
    res.json(saveDoc(file, doc));
  });

  // Append a single annotation; returns the updated document.
  router.post('/', (req, res) => {
    const doc = loadDoc(file);
    const a = req.body || {};
    a.id = a.id || `an_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    a.createdAt = a.createdAt || new Date().toISOString();
    doc.annotations.push(a);
    res.status(201).json(saveDoc(file, doc));
  });

  // Delete one annotation by id.
  router.delete('/:id', (req, res) => {
    const doc = loadDoc(file);
    const before = doc.annotations.length;
    doc.annotations = doc.annotations.filter((x) => x.id !== req.params.id);
    if (doc.annotations.length === before) return res.status(404).json({ error: 'not found' });
    saveDoc(file, doc);
    res.status(204).end();
  });

  return router;
}

export default annotationsRouter;
