// EasyGameFun site interactions. Content is pre-rendered; this only adds behaviour.
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wide = function () { return matchMedia('(min-width:900px)').matches; };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var lsGet = function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) {} };

  var EGF = window.EGF = {
    lsGet: lsGet, lsSet: lsSet, esc: esc,
    favs: function () { return lsGet('egf_favs', []); },
    recent: function () { return lsGet('egf_recent', []); },
    pushRecent: function (slug) { lsSet('egf_recent', [slug].concat(EGF.recent().filter(function (x) { return x !== slug; })).slice(0, 12)); },
    toggleFav: function (slug) { var f = EGF.favs(), on = f.indexOf(slug) < 0; f = on ? [slug].concat(f) : f.filter(function (x) { return x !== slug; }); lsSet('egf_favs', f); updateBadge(); return on; },
    toast: function (msg) { var t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('show'); }, 1700); }
  };

  /* ---------- game index (lazy) ---------- */
  var indexP = null;
  EGF.index = function () {
    if (!indexP) indexP = fetch('/search-index.json').then(function (r) { return r.json(); }).then(function (d) {
      d.list = d.games.map(function (a) { return { slug: a[0], name: a[1], cat: a[2], tags: a[3] ? a[3].split(',') : [], thumb: a[4], url: '/game/' + a[0] + '/', catName: (d.cats[a[2]] || [a[2]])[0] }; });
      d.bySlug = {}; d.list.forEach(function (g) { d.bySlug[g.slug] = g; });
      return d;
    }).catch(function () { indexP = null; return { list: [], bySlug: {}, cats: {} }; });
    return indexP;
  };
  var imgTag = function (g) { return '<img src="' + esc(g.thumb) + '" alt="" width="320" height="320" loading="lazy" decoding="async">'; };
  EGF.tile = function (g) { return '<a class="tile" href="' + g.url + '">' + imgTag(g) + '<span class="nm">' + esc(g.name) + '<small>' + esc(g.catName) + '</small></span></a>'; };

  /* ---------- theme ---------- */
  var themeBtn = $('#theme');
  var paintTheme = function () { if (themeBtn) themeBtn.textContent = root.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙'; };
  paintTheme();
  var toggleTheme = function () { var t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; root.setAttribute('data-theme', t); lsSet('egf_theme', t); paintTheme(); };
  if (themeBtn) themeBtn.onclick = toggleTheme;
  $$('[data-theme-toggle]').forEach(function (b) { b.onclick = toggleTheme; });

  /* ---------- promo, rail, back to top ---------- */
  var px = $('#promoX');
  if (px) px.onclick = function () { root.classList.add('nopromo'); lsSet('egf_promo', root.getAttribute('data-promo') || '1'); };
  var rail = $('#railtog');
  if (rail) { rail.setAttribute('aria-pressed', root.classList.contains('rail')); rail.onclick = function () { var on = root.classList.toggle('rail'); lsSet('egf_rail', on ? '1' : '0'); rail.setAttribute('aria-pressed', on); }; }

  /* ---------- drawer menu ---------- */
  var menu = $('#menu'), drawer = $('#drawer');
  var openMenu = function (o) {
    var was = document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', o);
    if (menu) menu.setAttribute('aria-expanded', o);
    if (drawer) drawer.setAttribute('aria-hidden', !o);
    if (o) setTimeout(function () { $('#close').focus(); }, 50); else if (was && menu) menu.focus({ preventScroll: true });
  };
  if (menu) menu.onclick = function () { openMenu(true); };
  if ($('#close')) $('#close').onclick = function () { openMenu(false); };
  if ($('#scrim')) $('#scrim').onclick = function () { openMenu(false); };

  /* ---------- mega menu (desktop) ---------- */
  var mega = $('#mega'), megaBtn = $('#megabtn');
  var closeMega = function () { if (mega) { mega.hidden = true; megaBtn.setAttribute('aria-expanded', 'false'); } };
  if (megaBtn) megaBtn.addEventListener('click', function (e) { if (!wide()) return; e.preventDefault(); e.stopPropagation(); var o = mega.hidden; mega.hidden = !o; megaBtn.setAttribute('aria-expanded', o); });

  /* ---------- saved badge ---------- */
  function updateBadge() { var n = EGF.favs().length || ''; var b = $('#sb'); if (b) b.textContent = n; $$('.bottom .sb').forEach(function (x) { x.textContent = n; }); }
  updateBadge();

  /* ---------- header search + suggestions ---------- */
  var form = $('.top .search'), qi = $('#q'), sug = $('#sug'), stog = $('#stog');
  var searchOpen = function (o) { document.body.classList.toggle('sopen', o); if (stog) stog.setAttribute('aria-expanded', o); if (o && qi) qi.focus(); };
  if (stog) stog.addEventListener('click', function (e) { e.preventDefault(); searchOpen(!document.body.classList.contains('sopen')); });
  EGF.hits = function (d, q) {
    q = q.trim().toLowerCase(); if (!q) return [];
    var words = q.split(/\s+/).map(function (w) { return w.length > 3 ? w.replace(/(ing|es|s|e)$/, '') : w; });
    return d.list.map(function (g) {
      var hay = (g.name + ' ' + g.catName + ' ' + g.tags.join(' ')).toLowerCase(), n = g.name.toLowerCase(), s = 0;
      for (var i = 0; i < words.length; i++) { if (hay.indexOf(words[i]) < 0) return null; if (n.indexOf(words[i]) === 0) s += 3; else if (n.indexOf(words[i]) >= 0) s += 2; else s += 1; }
      return { g: g, s: s };
    }).filter(Boolean).sort(function (a, b) { return b.s - a.s; }).map(function (x) { return x.g; });
  };
  var sugRow = function (g) { return '<a href="' + g.url + '"><span class="tile">' + imgTag(g) + '</span><span><b>' + esc(g.name) + '</b><small>' + esc(g.catName) + '</small></span></a>'; };
  function showSug() {
    if (!qi || !sug) return;
    EGF.index().then(function (d) {
      var q = qi.value;
      if (!q.trim()) {
        var rec = EGF.recent().map(function (s) { return d.bySlug[s]; }).filter(Boolean).slice(0, 3);
        sug.innerHTML = '<div class="sugh">Popular categories</div><div class="sugchips">' + Object.keys(d.cats).slice(0, 8).map(function (k) { return '<a class="chip" href="/category/' + k + '/">' + d.cats[k][1] + ' ' + esc(d.cats[k][0]) + '</a>'; }).join('') + '</div>' + (rec.length ? '<div class="sugh">Recently played</div>' + rec.map(sugRow).join('') : '');
      } else {
        var l = EGF.hits(d, q);
        sug.innerHTML = l.length ? l.slice(0, 6).map(sugRow).join('') + '<a class="all" href="/search/?q=' + encodeURIComponent(q.trim()) + '">See all ' + l.length + ' result' + (l.length > 1 ? 's' : '') + '</a>' : '<div class="none">No games found. Try “race” or “puzzle”.</div>';
      }
      sug.hidden = false;
    });
  }
  if (qi) { qi.addEventListener('input', showSug); qi.addEventListener('focus', showSug); }
  if (form) form.addEventListener('submit', function (e) { if (!qi.value.trim()) e.preventDefault(); });

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (mega && !t.closest('#mega') && !t.closest('#megabtn')) closeMega();
    if (sug && !t.closest('.top .search') && !t.closest('#stog')) sug.hidden = true;
    if (t.closest('[data-top]')) window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    if (t.closest('#drawer a')) openMenu(false);
    if (t.closest('[data-focus-search]') && wide()) { e.preventDefault(); qi.focus(); } // phones follow the link to the search page
    var dice = t.closest('.bottom .rnd');
    if (dice && !reduced) {
      // Roll the dice first, then open the random game.
      e.preventDefault(); dice.classList.remove('spin'); void dice.offsetWidth; dice.classList.add('spin');
      EGF.index().then(function (d) { setTimeout(function () { if (d.list.length) location.href = d.list[Math.random() * d.list.length | 0].url; }, 650); });
      return;
    }
    if (t.closest('[data-rnd]')) { e.preventDefault(); EGF.index().then(function (d) { if (d.list.length) location.href = d.list[Math.random() * d.list.length | 0].url; }); }
  });
  addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { openMenu(false); closeMega(); if (sug) sug.hidden = true; }
    if (e.key === '/' && qi && wide() && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); qi.focus(); }
  });

  /* ---------- "new games" bell ---------- */
  // First visit: remember the time. Later: count games published after it. Opening the list resets the count.
  var bell = $('#bell'), nb = $('#nb'), panel = $('#newpanel');
  // Stored as a JSON string so lsGet can read it back.
  var seen = lsGet('egf_seen', null);
  if (!seen) { seen = new Date().toISOString(); lsSet('egf_seen', JSON.stringify(seen)); }
  var newGames = [];
  var paintBell = function () { if (nb) nb.textContent = newGames.length ? (newGames.length > 99 ? '99+' : newGames.length) : ''; if (bell) bell.setAttribute('aria-label', newGames.length ? newGames.length + ' new games' : 'New games'); };
  EGF.index().then(function (d) {
    d.list.forEach(function (g, i) { g.at = (d.games[i] || [])[5] || ''; });
    newGames = d.list.filter(function (g) { return g.at && g.at > seen; }).sort(function (a, b) { return a.at < b.at ? 1 : -1; });
    paintBell();
  });
  var closePanel = function () { if (panel && !panel.hidden) { panel.hidden = true; bell.setAttribute('aria-expanded', 'false'); } };
  if (bell) bell.onclick = function (e) {
    e.stopPropagation();
    if (!panel.hidden) return closePanel();
    var list = newGames.slice(0, 10);
    panel.innerHTML = '<div class="nph"><b>' + (list.length ? newGames.length + ' new game' + (newGames.length > 1 ? 's' : '') + ' since your last visit' : "You're all caught up") + '</b></div>' +
      (list.length ? list.map(function (g) { return '<a class="rowl" href="' + g.url + '"><span class="tile" style="display:block">' + imgTag(g) + '</span><span><b>' + esc(g.name) + '</b><span class="s">' + esc(g.catName) + '</span></span></a>'; }).join('') : '<p class="npe">New games are added every day. Check back tomorrow.</p>') +
      '<a class="npall" href="/new/">See all new games →</a>';
    panel.hidden = false; bell.setAttribute('aria-expanded', 'true');
    // Reset the count: everything up to now has been seen.
    seen = new Date().toISOString(); lsSet('egf_seen', JSON.stringify(seen)); newGames = []; paintBell();
  };
  document.addEventListener('click', function (e) { if (panel && !e.target.closest('#newpanel') && !e.target.closest('#bell')) closePanel(); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });

  /* ---------- recently played in sidebar + drawer ---------- */
  var recent = EGF.recent();
  if (recent.length) EGF.index().then(function (d) {
    var rec = recent.map(function (s) { return d.bySlug[s]; }).filter(Boolean).slice(0, 6);
    if (!rec.length) return;
    $$('.js-recent').forEach(function (box) { $('.recent', box).innerHTML = rec.map(function (g) { return '<a class="tile" href="' + g.url + '" aria-label="' + esc(g.name) + '">' + imgTag(g) + '</a>'; }).join(''); box.hidden = false; });
  });

  /* ---------- home: personal rows, tabs, featured rotator, hero sky ---------- */
  var personal = $('#personal');
  if (personal && recent.length) EGF.index().then(function (d) {
    var rec = recent.map(function (s) { return d.bySlug[s]; }).filter(Boolean);
    if (!rec.length) return;
    var last = rec[0];
    var sim = d.list.filter(function (x) { return x.slug !== last.slug && recent.indexOf(x.slug) < 0; }).sort(function (a, b) { return (b.cat === last.cat) - (a.cat === last.cat); }).slice(0, 8);
    personal.innerHTML = '<section class="sec" aria-labelledby="s-cont"><div class="sec-h"><h2 id="s-cont">Continue playing</h2></div><div class="hs">' + rec.slice(0, 8).map(EGF.tile).join('') + '</div></section>' +
      (sim.length ? '<section class="sec" aria-labelledby="s-byp"><div class="sec-h"><div><h2 id="s-byp">Because you played ' + esc(last.name) + '</h2><p class="sub">Picked for you based on your last game.</p></div><a href="/category/' + last.cat + '/">See all</a></div><div class="hs">' + sim.map(EGF.tile).join('') + '</div></section>' : '');
  });

  var tabs = $$('#tabs [role=tab]');
  var selectTab = function (tb) {
    tabs.forEach(function (b) { var on = b === tb; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; var p = document.getElementById(b.getAttribute('aria-controls')); if (p) p.hidden = !on; });
  };
  tabs.forEach(function (b, i) {
    b.onclick = function () { selectTab(b); };
    b.onkeydown = function (e) { var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (k) { var n = tabs[(i + k + tabs.length) % tabs.length]; selectTab(n); n.focus(); } };
  });

  var fl = $('#fl');
  if (fl) {
    var feat = JSON.parse(fl.getAttribute('data-feat') || '[]'), dots = $$('#fdots button'), fi = 0, timer = null;
    var show = function (n) {
      fi = (n + feat.length) % feat.length; var f = feat[fi];
      fl.href = f[0]; var im = $('img', fl); im.removeAttribute('srcset'); im.src = f[3]; $('#fl-n').textContent = f[1]; $('#fl-c').textContent = f[2];
      dots.forEach(function (d, k) { d.classList.toggle('on', k === fi); });
    };
    if (!reduced && feat.length > 1) timer = setInterval(function () { if (!document.hidden) show(fi + 1); }, 6000);
    dots.forEach(function (d, k) { d.onclick = function () { show(k); clearInterval(timer); }; });
  }

  var hc = $('#hc');
  if (hc && !reduced && hc.getContext) (function () {
    var ctx = hc.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 2), W = 0, H = 0, vis = true, last = performance.now();
    var items = (hc.getAttribute('data-emoji') || '').split(' ').filter(Boolean).map(function (e) { return { e: e, x: Math.random(), y: Math.random(), s: 28 + Math.random() * 44, v: 0.012 + Math.random() * 0.03, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.8, ph: Math.random() * 6 }; });
    var fit = function () { var b = hc.parentElement.getBoundingClientRect(); W = b.width; H = b.height; hc.width = Math.round(W * dpr); hc.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    fit(); new ResizeObserver(fit).observe(hc.parentElement);
    new IntersectionObserver(function (es) { vis = es[es.length - 1].isIntersecting; }).observe(hc);
    var tick = function (t) {
      var dt = Math.min((t - last) / 1000, 0.05); last = t;
      if (vis && !document.hidden) {
        ctx.clearRect(0, 0, W, H); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        items.forEach(function (it) {
          it.y -= it.v * dt; it.r += it.vr * dt; if (it.y < -0.1) { it.y = 1.1; it.x = Math.random(); }
          ctx.save(); ctx.globalAlpha = 0.5; ctx.translate(it.x * W + Math.sin(t / 1500 + it.ph) * 14, it.y * H); ctx.rotate(it.r); ctx.font = it.s + 'px serif'; ctx.fillText(it.e, 0, 0); ctx.restore();
        });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  })();

  /* ---------- category / tag / collection grids: sort, filter, list view ---------- */
  var grid = $('#catgrid');
  if (grid) {
    var items = $$('#catgrid > .tile'), st = { sort: 'pop', tag: '', view: 'grid' };
    var listRow = function (a) { return '<a class="lrow" href="' + a.getAttribute('href') + '"><span class="tile">' + $('img', a).outerHTML + '</span><span class="lb2"><b>' + esc(a.dataset.name) + '</b><p>' + esc(a.dataset.desc) + '</p><span class="lm">' + esc(a.dataset.cat) + '</span></span><span class="btn btn-mint btn-sm">▶ Play</span></a>'; };
    var apply = function () {
      var key = st.sort, shown = items.filter(function (a) { return !st.tag || (' ' + a.dataset.tags + ' ').indexOf(' ' + st.tag + ' ') >= 0; });
      shown.sort(function (a, b) { return key === 'added' ? b.dataset.added.localeCompare(a.dataset.added) : (+b.dataset[key]) - (+a.dataset[key]); });
      if (st.view === 'list') { grid.className = 'lst'; grid.innerHTML = shown.map(listRow).join(''); }
      else { grid.className = 'grid'; grid.innerHTML = ''; shown.forEach(function (a, i) { a.classList.toggle('big', i === 0 && shown.length >= 3); grid.appendChild(a); }); }
      var cnt = $('#cnt'); if (cnt) cnt.textContent = shown.length + ' game' + (shown.length === 1 ? '' : 's');
      $$('[data-sort]').forEach(function (b) { var on = b.dataset.sort === st.sort; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      $$('[data-view]').forEach(function (b) { var on = b.dataset.view === st.view; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      $$('[data-tag]').forEach(function (b) { var on = b.dataset.tag === st.tag; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    };
    document.addEventListener('click', function (e) {
      var s = e.target.closest('[data-sort]'), t = e.target.closest('[data-tag]'), v = e.target.closest('[data-view]');
      if (s) st.sort = s.dataset.sort; else if (t) st.tag = t.dataset.tag; else if (v) st.view = v.dataset.view; else return;
      apply();
    });
  }

  /* ---------- search page ---------- */
  var results = $('#results');
  if (results) {
    var sq = $('#sq'), q0 = new URLSearchParams(location.search).get('q') || '';
    sq.value = q0; if (qi) qi.value = q0;
    var run = function () {
      EGF.index().then(function (d) {
        var q = sq.value.trim(), l = q ? EGF.hits(d, q) : d.list;
        $('#scount').textContent = q ? l.length + ' result' + (l.length === 1 ? '' : 's') + ' for “' + q + '”' : 'Showing all ' + d.list.length + ' games';
        results.innerHTML = l.length ? '<div class="grid">' + l.slice(0, 96).map(EGF.tile).join('') + '</div>' : '<div class="empty"><b>No games found</b>Try a shorter word like "race", "puzzle", or "cute".</div>';
      });
    };
    sq.addEventListener('input', function () { history.replaceState(null, '', sq.value.trim() ? '?q=' + encodeURIComponent(sq.value.trim()) : location.pathname); run(); });
    run();
    if (!q0 && wide()) sq.focus();
  }

  /* ---------- saved page ---------- */
  var favBox = $('#favlist');
  if (favBox) {
    var fv = EGF.favs();
    if (fv.length) EGF.index().then(function (d) {
      var l = fv.map(function (s) { return d.bySlug[s]; }).filter(Boolean);
      if (l.length) favBox.innerHTML = '<div class="grid">' + l.map(EGF.tile).join('') + '</div>';
    });
  }
})();
