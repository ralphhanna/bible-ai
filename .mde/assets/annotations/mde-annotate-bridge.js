// MDE app-side annotation bridge (single shipped asset).
//
// MASTER COPY. This file under .mde/assets/annotations/ is the source of
// truth. Provisioning:
//   1. init-app mirrors .mde/method/ into each project, so every project gets
//      this master at <project>/.mde/assets/annotations/.
//   2. A prototype/app plan copies it into the app's web public dir
//      (e.g. src/web/public/mde-annotate-bridge.js) and adds the <script> tag —
//      the same way the React annotation component used to be materialized.
// Edit ONLY here; the app-served copy is derived. (For now the step-2 copy is
// done by hand until a plan automates it.)
//
// Drop this one <script> into a prototype/app shell. It makes the app
// "annotation aware" without any server router or framework component:
//   - learns the Workbench origin from a postMessage handshake (no hardcoded port),
//   - on Annotate mode, captures the clicked element as a precise DOM target,
//   - posts {type:'mde-annotation', ...} to the parent Workbench, which owns
//     persistence (its own same-origin /api/annotations).
//
// When NOT embedded (opened in its own tab) annotation is a no-op: to annotate,
// view the app inside the Workbench. No CORS, no WB port literal anywhere.

(function () {
  if (window.__mdeAnnotateBridge) return;
  window.__mdeAnnotateBridge = true;

  var wbOrigin = null; // learned via handshake; never hardcoded
  var mode = false;

  // --- target description (mirrors annotations-core describeTarget) ---------
  function buildDomPath(el, root) {
    var parts = [];
    var node = el;
    while (node && node !== root && node.nodeType === 1) {
      var tag = node.tagName.toLowerCase();
      if (tag === 'html' || tag === 'body') break;
      var parent = node.parentElement;
      if (!parent) { parts.unshift(tag); break; }
      var sameType = Array.prototype.filter.call(parent.children, function (c) { return c.tagName === node.tagName; });
      var idx = sameType.indexOf(node) + 1;
      parts.unshift(sameType.length > 1 ? tag + ':nth-of-type(' + idx + ')' : tag);
      node = parent;
    }
    return parts.join(' > ');
  }

  function resolveTarget(target) {
    if (!target) return null;
    if (target.elementId) {
      var byId = document.getElementById(target.elementId);
      if (byId) return byId;
    }
    if (target.testId) {
      var byTest = document.querySelector('[data-testid="' + target.testId.replace(/"/g, '\\"') + '"]');
      if (byTest) return byTest;
    }
    if (target.domPath) {
      try {
        var byPath = document.querySelector(target.domPath);
        if (byPath) return byPath;
      } catch (e) { /* invalid selector */ }
    }
    if (target.textSnippet) {
      var candidates = document.getElementsByTagName(target.tagName || '*');
      for (var i = 0; i < candidates.length; i++) {
        if ((candidates[i].textContent || '').trim().slice(0, 80) === target.textSnippet) return candidates[i];
      }
    }
    return null;
  }

  function describeTarget(el, root) {
    var testId = el.getAttribute && el.getAttribute('data-testid');
    var strategy = el.id ? 'id' : (testId ? 'testId' : 'domPath');
    return {
      strategy: strategy,
      elementId: el.id || null,
      testId: testId || null,
      domPath: buildDomPath(el, root),
      tagName: el.tagName.toLowerCase(),
      textSnippet: (el.textContent || '').trim().slice(0, 80) || null,
    };
  }

  function pagePath() {
    return (location.pathname + location.search + location.hash) || '/';
  }

  function postToParent(payload) {
    if (window.parent === window) return false; // standalone tab: no-op
    window.parent.postMessage(payload, wbOrigin || '*');
    return true;
  }

  // --- handshake: WB announces its origin; we remember it -------------------
  window.addEventListener('message', function (e) {
    var data = e.data || {};
    if (data.type === 'mde-wb-hello') {
      wbOrigin = e.origin;
      postToParent({ type: 'mde-app-ready', pagePath: pagePath() });
    } else if (data.type === 'mde-annotate-mode') {
      setMode(!!data.enabled);
    } else if (data.type === 'mde-annotate-focus') {
      focusTarget(data.target);
    } else if (data.type === 'mde-annotate-locate') {
      lastLocateRequest = Array.isArray(data.items) ? data.items : [];
      locateWithRetry();
    }
  });

  // --- marker positions: resolve each target's rect and report to parent ----
  // The parent can't measure across the iframe origin boundary, so we measure
  // here (iframe-local viewport coords) and it offsets by the iframe's position.
  var lastLocateRequest = [];

  function reportPositions() {
    var positions = [];
    for (var i = 0; i < lastLocateRequest.length; i++) {
      var item = lastLocateRequest[i];
      var el = resolveTarget(item.target);
      if (!el) { positions.push({ id: item.id, visible: false }); continue; }
      var r = el.getBoundingClientRect();
      positions.push({
        id: item.id,
        visible: !!(r.width || r.height),
        // top-right corner of the element, in the iframe's viewport.
        x: r.right,
        y: r.top,
      });
    }
    postToParent({
      type: 'mde-annotate-positions',
      pagePath: pagePath(),
      positions: positions,
    });
    return positions;
  }

  // On a locate request the target page may still be mounting/fetching (SPA
  // route change + async data), so elements aren't in the DOM yet. Report right
  // away, then retry a few times until every requested target resolves — so
  // markers appear on their own once the page settles, without the user having
  // to nudge the panel. Give up after a short window.
  var locateRetryTimer = null;
  function locateWithRetry() {
    if (locateRetryTimer) { clearTimeout(locateRetryTimer); locateRetryTimer = null; }
    var attempt = 0;
    var maxAttempts = 20;       // ~2s total at 100ms
    var interval = 100;
    function tick() {
      var positions = reportPositions();
      var allResolved = positions.length > 0 &&
        positions.every(function (p) { return p && p.visible; });
      attempt++;
      if (allResolved || attempt >= maxAttempts || !lastLocateRequest.length) return;
      locateRetryTimer = setTimeout(tick, interval);
    }
    tick();
  }

  var reportTimer = null;
  function scheduleReport() {
    if (reportTimer) return;
    reportTimer = setTimeout(function () {
      reportTimer = null;
      if (lastLocateRequest.length) reportPositions();
    }, 60);
  }
  window.addEventListener('scroll', scheduleReport, true);
  window.addEventListener('resize', scheduleReport);

  function focusTarget(target) {
    var el = resolveTarget(target);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.add('mde-annotate-flash');
    setTimeout(function () { el.classList.remove('mde-annotate-flash'); }, 1400);
  }

  // --- capture clicks while annotating --------------------------------------
  function onClick(e) {
    if (!mode) return;
    var el = e.target;
    if (!el || el.nodeType !== 1) return;
    if (el.closest('[data-annotations-ui]')) return;
    e.preventDefault();
    e.stopPropagation();
    var root = document.querySelector('main') || document.body;
    setMode(false);
    postToParent({
      type: 'mde-annotation',
      pagePath: pagePath(),
      target: describeTarget(el, root),
    });
  }
  document.addEventListener('click', onClick, true);

  function setMode(on) {
    mode = !!on;
    document.body.classList.toggle('mde-annotate-mode', mode);
  }

  // Minimal styles for annotate cursor + focus flash (self-contained).
  try {
    var style = document.createElement('style');
    style.textContent =
      '.mde-annotate-mode, .mde-annotate-mode * { cursor: crosshair !important; }' +
      '.mde-annotate-flash { outline: 3px solid #2563eb !important; outline-offset: 2px;' +
      ' transition: outline-color .2s; animation: mde-flash 1.4s ease-out; }' +
      '@keyframes mde-flash { 0%,100% { outline-color: rgba(37,99,235,0); }' +
      ' 20%,60% { outline-color: rgba(37,99,235,1); } }';
    document.head.appendChild(style);
  } catch (e) { /* no head yet */ }

  // --- SPA route changes: re-announce so the parent re-resolves markers ------
  // The app routes client-side (History API) without reloading, so the iframe
  // 'load' event never fires on in-app navigation. Without this, the parent
  // keeps the previous page's route and leaves that page's annotation markers
  // drawn over the new page. Hook pushState/replaceState + popstate and, when
  // the path actually changes, post mde-app-ready with the new pagePath.
  var lastPath = pagePath();
  function announceRouteChange() {
    var now = pagePath();
    if (now === lastPath) return;
    lastPath = now;
    postToParent({ type: 'mde-app-ready', pagePath: now });
  }
  (function () {
    var wrap = function (name) {
      var orig = history[name];
      if (typeof orig !== 'function') return;
      history[name] = function () {
        var r = orig.apply(this, arguments);
        // Defer so the framework's router has committed the new location.
        setTimeout(announceRouteChange, 0);
        return r;
      };
    };
    wrap('pushState');
    wrap('replaceState');
    window.addEventListener('popstate', function () { setTimeout(announceRouteChange, 0); });
    window.addEventListener('hashchange', function () { setTimeout(announceRouteChange, 0); });
  })();

  // Announce readiness in case the parent's hello already fired before load.
  postToParent({ type: 'mde-app-ready', pagePath: pagePath() });
})();
