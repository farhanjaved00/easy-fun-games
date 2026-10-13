// Game page: Play button, partner iframe (loaded only after a tap), save, share, fullscreen.
(function () {
  'use strict';
  var box = document.getElementById('player');
  if (!box || !window.EGF) return;
  var EGF = window.EGF, d = box.dataset, $ = function (s) { return document.querySelector(s); };
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var go = $('#go'), started = false, starting = false;

  // Warm up the connection to the partner as soon as the player shows intent.
  var warmed = false;
  var warm = function () {
    if (warmed || !d.origin) return; warmed = true;
    var l = document.createElement('link'); l.rel = 'preconnect'; l.href = d.origin; document.head.appendChild(l);
  };
  ['pointerenter', 'touchstart', 'focus'].forEach(function (ev) { go.addEventListener(ev, warm, { passive: true }); });

  var loadingHTML = function () {
    return $('#ov img').outerHTML + ($('#ov .em') ? '<div class="em" aria-hidden="true">' + EGF.esc(d.emoji) + '</div>' : '') + '<div class="ovt">Loading ' + EGF.esc(d.name) + '…</div><div class="loadbar" role="progressbar" aria-label="Loading game"><i></i></div><small>Getting your game ready</small>';
  };

  go.onclick = function () {
    if (starting) return; starting = true; warm();
    $('#ov').innerHTML = loadingHTML();
    EGF.pushRecent(d.slug);
    if (d.embed) startIframe(); else startDemo();
  };

  function startIframe() {
    var f = document.createElement('iframe');
    var src = d.embed;
    // GameDistribution's embed code passes the page URL so the play is credited to this site.
    if (/(^|\.)gamedistribution\.com$/.test(new URL(src).hostname)) src += (src.indexOf('?') < 0 ? '?' : '&') + 'gd_sdk_referrer_url=' + encodeURIComponent(location.origin + location.pathname);
    f.src = src;
    f.title = d.name;
    f.allow = 'fullscreen; autoplay; gamepad';
    f.setAttribute('allowfullscreen', '');
    // Adjust to the partner's documented requirements before launch.
    f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-pointer-lock allow-forms allow-orientation-lock');
    f.referrerPolicy = 'origin';
    f.addEventListener('load', function () { var ov = $('#ov'); if (ov) ov.remove(); });
    setTimeout(function () { var ov = $('#ov'); if (ov) ov.remove(); }, 8000);
    box.appendChild(f);
    started = true;
    // Phones: play full screen, so swipes for the game never fight with page scrolling.
    if (phone()) doMax();
    // Computers: while the game has focus, keys the game does not use (Space, arrows) would scroll
    // the page under the player, so keep it still. Any scroll the visitor starts on the page releases it.
    if (!fineMouse) return;
    var lockY = null, release = function () { lockY = null; };
    addEventListener('blur', function () { setTimeout(function () { if (document.activeElement === f) lockY = scrollY; }, 0); });
    addEventListener('focus', release);
    ['wheel', 'pointerdown', 'touchstart', 'keydown'].forEach(function (ev) { addEventListener(ev, release, { passive: true }); });
    addEventListener('scroll', function () { if (lockY !== null && document.activeElement === f && Math.abs(scrollY - lockY) > 2) scrollTo(0, lockY); }, { passive: true });
  }
  var fineMouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var phone = function () { return matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) < 600; };

  // Sample games (no partner embed yet): run the built-in demo mini-game.
  function startDemo() {
    var run = function () { setTimeout(demo, reduced ? 120 : 600); };
    if (window.EGFDemo) return run();
    var s = document.createElement('script'); s.src = d.demo; s.onload = run; document.head.appendChild(s);
  }
  var inst = null;
  function demo() {
    if (!document.body.contains(box)) return;
    started = true;
    var ov = $('#ov'); if (ov) ov.remove();
    var cv = document.createElement('canvas'); box.appendChild(cv);
    var note = document.createElement('div'); note.className = 'note'; note.textContent = 'Demo game'; box.appendChild(note);
    var hint = document.createElement('div'); hint.className = 'hint'; hint.textContent = d.hint; box.appendChild(hint);
    var ht = setTimeout(function () { hint.remove(); }, 5000);
    inst = window.EGFDemo.mount(cv, { kind: d.kind, emoji: d.emoji, c1: d.c1, c2: d.c2 }, { onEnd: end });
    function cleanup() { clearTimeout(ht); inst.stop(); cv.remove(); hint.remove(); note.remove(); }
    function end(score) {
      var key = 'egf_best_' + d.slug, prev = EGF.lsGet(key, 0), isBest = score > prev;
      if (isBest) EGF.lsSet(key, score);
      var next = JSON.parse(d.next || '[]');
      var o = document.createElement('div'); o.className = 'ov';
      o.innerHTML = '<div class="ovt">Time\'s up!</div><div class="score">' + score + '</div><small>' + (isBest && score > 0 ? '🎉 New best!' : prev ? 'Best: ' + prev : 'Nice try!') + '</small><button class="btn btn-mint" id="again">↻ Play again</button>' +
        (next.length ? '<div class="endrow"><small>Try next:</small>' + next.map(function (n) { return '<a class="tile" href="' + n[0] + '" aria-label="Play ' + EGF.esc(n[1]) + '"><img src="' + EGF.esc(n[2]) + '" alt="" width="60" height="60"></a>'; }).join('') + '</div>' : '');
      box.appendChild(o);
      o.querySelector('#again').onclick = function () { cleanup(); o.remove(); demo(); };
    }
  }

  // Floating Play button on phones when the player is off screen.
  var sp = document.createElement('button'); sp.className = 'stickplay'; sp.hidden = true; sp.textContent = '▶ Play'; document.body.appendChild(sp);
  new IntersectionObserver(function (es) { sp.hidden = es[0].isIntersecting; sp.textContent = started ? '▲ Back to game' : '▶ Play'; }).observe(box);
  sp.onclick = function () { box.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); if (!started && !starting) go.click(); };

  // Save
  var fav = $('#fav');
  var paintFav = function (on) { fav.classList.toggle('on', on); fav.querySelector('span').textContent = on ? 'Saved' : 'Save'; fav.setAttribute('aria-pressed', on); };
  paintFav(EGF.favs().indexOf(d.slug) >= 0);
  fav.onclick = function () { var on = EGF.toggleFav(d.slug); paintFav(on); EGF.toast(on ? 'Saved' : 'Removed from saved'); };

  // Share
  $('#share').onclick = function () {
    var url = location.origin + location.pathname;
    var p = navigator.share ? navigator.share({ title: d.name, url: url }) : navigator.clipboard.writeText(url).then(function () { EGF.toast('Link copied'); });
    Promise.resolve(p).catch(function (e) { if (!e || e.name !== 'AbortError') EGF.toast('Sharing not available here'); });
  };

  // Fullscreen, with a CSS fallback where the API is missing (older iPhones).
  var undoMax = function () { box.classList.remove('max'); var x = box.querySelector('.pexit'); if (x) x.remove(); document.body.classList.remove('lock'); };
  var doMax = function () {
    box.classList.add('max'); document.body.classList.add('lock');
    if (!box.querySelector('.pexit')) { var x = document.createElement('button'); x.className = 'pexit'; x.textContent = '✕ Exit'; x.onclick = undoMax; box.appendChild(x); }
  };
  $('#fs').onclick = function () {
    if (box.classList.contains('max')) return undoMax();
    if (document.fullscreenElement) return document.exitFullscreen();
    var f = box.requestFullscreen || box.webkitRequestFullscreen;
    if (!f) return doMax();
    try { Promise.resolve(f.call(box)).catch(doMax); } catch (e) { doMax(); }
  };
  addEventListener('keydown', function (e) { if (e.key === 'Escape') undoMax(); });
})();
