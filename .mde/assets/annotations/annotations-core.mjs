// Shared annotation mechanics for MDE prototypes and the MDE Workbench.
// UI adapters provide rendering; server adapters provide persistence.

export function buildDomPath(element, root = null) {
  const parts = [];
  let node = element;
  while (node && node !== root && node.nodeType === 1) {
    const tag = node.tagName.toLowerCase();
    if (tag === 'html' || tag === 'body') break;
    const parent = node.parentElement;
    if (!parent) {
      parts.unshift(tag);
      break;
    }
    const sameType = Array.from(parent.children).filter((child) => child.tagName === node.tagName);
    const index = sameType.indexOf(node) + 1;
    parts.unshift(sameType.length > 1 ? `${tag}:nth-of-type(${index})` : tag);
    node = parent;
  }
  return parts.join(' > ');
}

export function pickStrategy(element) {
  if (element.id) return 'id';
  if (element.getAttribute && element.getAttribute('data-testid')) return 'testId';
  return 'domPath';
}

export function cssEscape(value) {
  if (globalThis.CSS && typeof globalThis.CSS.escape === 'function') {
    return globalThis.CSS.escape(value);
  }
  return String(value).replace(/["\\]/g, '\\$&');
}

export function nearestHeading(element, root = null) {
  const scope = element.closest('section, article, main') || root || element.ownerDocument?.body;
  if (!scope) return null;
  const headings = Array.from(scope.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  let nearest = null;
  for (const heading of headings) {
    if (heading === element || heading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) {
      nearest = heading;
    }
  }
  return (nearest?.textContent || '').trim().slice(0, 120) || null;
}

export function tableColumn(element) {
  const cell = element.closest('td, th');
  const table = cell?.closest('table');
  if (!cell || !table || !cell.parentElement) return null;
  const cells = Array.from(cell.parentElement.children).filter((item) => item.matches('th, td'));
  const index = cells.indexOf(cell);
  if (index < 0) return null;
  const headerRows = Array.from(table.querySelectorAll('thead tr'));
  const rows = headerRows.length ? headerRows : Array.from(table.querySelectorAll('tr')).slice(0, 1);
  for (const row of rows.reverse()) {
    const headers = Array.from(row.children).filter((item) => item.matches('th, td'));
    const text = (headers[index]?.textContent || '').trim();
    if (text) return text.slice(0, 120);
  }
  return null;
}

export function describeContext(element, root = null) {
  return {
    parentText: nearestHeading(element, root),
    columnTitle: tableColumn(element),
  };
}

export function describeTarget(element, root = null) {
  const context = describeContext(element, root);
  return {
    strategy: pickStrategy(element),
    elementId: element.id || null,
    testId: (element.getAttribute && element.getAttribute('data-testid')) || null,
    domPath: buildDomPath(element, root),
    tagName: element.tagName.toLowerCase(),
    textSnippet: (element.textContent || '').trim().slice(0, 80) || null,
    parentText: context.parentText,
    columnTitle: context.columnTitle,
  };
}

export function resolveTarget(target, doc = document) {
  if (!target) return null;
  if (target.elementId) {
    const byId = doc.getElementById(target.elementId);
    if (byId) return byId;
  }
  if (target.testId) {
    const byTest = doc.querySelector(`[data-testid="${cssEscape(target.testId)}"]`);
    if (byTest) return byTest;
  }
  if (target.domPath) {
    try {
      const byPath = doc.querySelector(target.domPath);
      if (byPath) return byPath;
    } catch {
      // Invalid stored selector; fall through to fuzzy matching.
    }
  }
  if (target.textSnippet && target.tagName) {
    const candidates = Array.from(doc.getElementsByTagName(target.tagName));
    return candidates.find(
      (candidate) => (candidate.textContent || '').trim().slice(0, 80) === target.textSnippet,
    ) || null;
  }
  return null;
}

export function contextSummary(target, liveElement = null, root = null) {
  const live = liveElement ? describeContext(liveElement, root) : {};
  const parentText = target?.parentText || live.parentText || '';
  const columnTitle = target?.columnTitle || live.columnTitle || '';
  const semantic = [parentText, columnTitle].filter(Boolean).join(' - ');
  return semantic
    ? `${semantic}${target?.textSnippet ? `; ${target.textSnippet}` : ''}`
    : (target?.textSnippet || '');
}

// Append a path segment to a URL that may already carry a query string, e.g.
// "/api/annotations?folder=X" + "an_1" -> "/api/annotations/an_1?folder=X"
// (a naive `${url}/${seg}` would glue the segment onto the query value).
export function appendPathSegment(url, segment) {
  const queryIndex = url.indexOf('?');
  const path = queryIndex === -1 ? url : url.slice(0, queryIndex);
  const query = queryIndex === -1 ? '' : url.slice(queryIndex);
  return `${path.replace(/\/$/, '')}/${segment}${query}`;
}

export function createAnnotationApi(apiUrl = '/api/annotations', fetchImpl = globalThis.fetch) {
  const request = async (url, options = {}) => {
    const response = await fetchImpl(url, options);
    if (!response.ok) throw new Error(await response.text());
    return response.status === 204 ? null : response.json();
  };
  return {
    fetchDocument: () => request(apiUrl),
    create: (annotation) => request(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(annotation),
    }),
    replaceDocument: (document) => request(apiUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(document),
    }),
    remove: (annotationId) => request(appendPathSegment(apiUrl, encodeURIComponent(annotationId)), {
      method: 'DELETE',
    }),
  };
}
