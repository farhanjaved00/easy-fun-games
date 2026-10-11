// Page shell: <head>, header, sidebar, drawer, footer, bottom nav.
import { esc, ldJson } from './util.mjs';

// Runs before first paint: theme, sidebar rail, dismissed promo. Its hash goes into the CSP.
export const INLINE_BOOT = "(function(){var d=document.documentElement,t,r,p;try{t=localStorage.getItem('egf_theme');r=localStorage.getItem('egf_rail');p=localStorage.getItem('egf_promo')}catch(e){}if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';d.setAttribute('data-theme',t);d.classList.add('js');if(r==='1')d.classList.add('rail');if(p&&p===d.getAttribute('data-promo'))d.classList.add('nopromo')})()";

const LOGO_MARK = '<i><svg viewBox="0 0 40 40" width="26" height="26" aria-hidden="true"><path d="M15 11.5v13a1 1 0 0 0 1.5.9l11-6.5a1 1 0 0 0 0-1.8l-11-6.5A1 1 0 0 0 15 11.5z" fill="#fff"/><path d="M11.5 30.5c4.8 3.4 12.2 3.4 17 0" stroke="#FFD36B" stroke-width="3.2" stroke-linecap="round" fill="none"/></svg></i>';
export const LOGO = `${LOGO_MARK}<span class="lt">Easy<b>Game</b><em>Fun</em></span>`;
const SEARCH_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';

export const img = (g, cls = '', eager = false) =>
  `<img${cls ? ` class="${cls}"` : ''} src="${esc(g.thumb.url)}" alt="" width="${g.thumb.width}" height="${g.thumb.height}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;

function sideHTML(m, key) {
  const L = (href, ico, txt, k) => `<a class="sl${key === k ? ' on' : ''}" href="${href}" title="${txt}"${key === k ? ' aria-current="page"' : ''}><span class="cb" style="background:var(--surface2)">${ico}</span><span class="nm">${txt}</span></a>`;
  return `<div class="sg"><span>Menu</span></div>` +
    L('/', '🏠', 'Home', 'home') + L('/new/', '🆕', 'New games', 'new') + L('/trending/', '🔥', 'Trending', 'trending') +
    L('/best/', '🏆', 'Best of all time', 'best') + L('/games/', '🔤', 'All games A to Z', 'az') + L('/favs/', '❤️', 'Saved games', 'favs') +
    `<div class="sg"><span>Categories</span></div>` +
    m.cats.map(c => `<a class="sl${key === 'cat:' + c.slug ? ' on' : ''}" href="${c.url}" title="${esc(c.name)}"${key === 'cat:' + c.slug ? ' aria-current="page"' : ''}><span class="cb" style="background:linear-gradient(135deg,${c.colors[0]},${c.colors[1]})">${c.emoji}</span><span class="nm">${esc(c.name)}</span><em>${c.games.length}</em></a>`).join('') +
    `<div class="sg"><span>Popular tags</span></div><div class="tagcloud">${m.tags.slice(0, 10).map(t => `<a${key === 'tag:' + t.slug ? ' class="on"' : ''} href="${t.url}">${esc(t.name)}</a>`).join('')}</div>` +
    `<div class="js-recent" hidden><div class="sg"><span>Recently played</span></div><div class="recent"></div></div>` +
    `<div class="sidecard js-only"><small>Feeling lucky?</small><b>Play a random game</b><button class="btn" data-rnd>🎲 Surprise me</button></div>`;
}

function megaHTML(m) {
  return `<div class="mega-in"><div><h3>Browse by category</h3><div class="mega-cats">${m.cats.map(c => `<a class="mc" href="${c.url}"><i style="background:linear-gradient(135deg,${c.colors[0]},${c.colors[1]})">${c.emoji}</i><span><b>${esc(c.name)}</b><span>${c.games.length} games</span></span></a>`).join('')}</div></div>` +
    `<div><h3>Most played right now</h3>${m.trending.slice(0, 3).map(g => `<a class="rowl" href="${g.url}"><span class="tile" style="display:block">${img(g)}</span><span><b>${esc(g.name)}</b><span class="s">${esc(g.cat.name)}</span></span></a>`).join('')}</div></div>`;
}

function footHTML(m) {
  return `<div class="foot-cta"><div class="foot-cta-in"><div><h2>Ready to play?</h2><p>${m.games.length} free games, and new ones every day. No download needed.</p></div><div class="cta-row"><a class="btn btn-mint" href="/trending/">▶ Start playing</a><button class="btn btn-ghost js-only" data-rnd>🎲 Surprise me</button></div></div></div>
<div class="foot-in"><div class="fb"><a class="logo" href="/" aria-label="EasyGameFun home">${LOGO}</a><p>Free online games for phone, tablet and desktop. Pick a game and play in one tap.</p><div class="badges"><span>100% free</span><span>No download</span><span>Mobile ready</span><span>Updated daily</span></div></div>
<nav aria-label="Game categories"><h3>Play by category</h3><div class="two">${m.cats.map(c => `<a href="${c.url}">${esc(c.name)}</a>`).join('')}</div></nav>
<nav aria-label="Discover"><h3>Discover</h3><a href="/new/">New games</a><a href="/trending/">Trending games</a><a href="/best/">Best of all time</a><a href="/games/">All games A to Z</a><a href="/cats/">All categories</a></nav>
<nav aria-label="Company"><h3>Company</h3><a href="/about/">About us</a><a href="/contact/">Contact</a><a href="/contact/#submit">Submit your game</a><a href="/contact/#report">Report a problem</a></nav>
<nav aria-label="Legal"><h3>Legal</h3><a href="/privacy/">Privacy policy</a><a href="/terms/">Terms of use</a><a href="/copyright/">Copyright (DMCA)</a></nav></div>
<div class="foot-tags"><h3>Popular games</h3><div>${m.collections.map(c => `<a href="${c.url}">${esc(c.name)}</a>`).join('')}${m.cats.slice(0, 4).map(c => `<a href="${c.url}">Free ${esc(c.name.toLowerCase())} games</a>`).join('')}</div></div>
<div class="foot-bot"><span>© ${m.today.slice(0, 4)} EasyGameFun. Game names and trademarks belong to their owners.</span><button class="js-only" data-top aria-label="Back to top">↑ Back to top</button></div>`;
}

// Pre-rendered once per build and reused on every page.
export function makeChrome(m) {
  return { mega: megaHTML(m), foot: footHTML(m), side: new Map(), sideFor(key) { if (!this.side.has(key)) this.side.set(key, sideHTML(m, key)); return this.side.get(key); } };
}

const TOP = [['/', 'home', 'Home'], ['/new/', 'new', 'New'], ['/trending/', 'trending', 'Trending'], ['/best/', 'best', 'Best ever']];
const BOTTOM = [['/', 'home', '🏠', 'Home'], ['/cats/', 'cats', '🧩', 'Categories'], ['/search/', 'search', '🔍', 'Search'], ['/favs/', 'favs', '❤️', 'Saved']];

export function layout(m, chrome, assets, p) {
  const { site } = m;
  const url = site.baseUrl + p.path;
  const noindex = p.noindex || !site.indexing;
  const ogImage = site.baseUrl + (p.ogImage || '/icons/og-image.png');
  const top = p.top || '';
  const sideKey = p.side || top;
  const promoId = m.promo ? String(m.promo.text.length) + m.promo.link : '';
  const ld = (p.ld || []).filter(Boolean).map(x => ({ '@context': 'https://schema.org', ...x }));
  return `<!DOCTYPE html>
<html lang="en"${m.promo ? ` data-promo="${esc(promoId)}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.desc)}">
<meta name="robots" content="${noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large'}">
${p.path === null ? '' : `<link rel="canonical" href="${esc(url)}">\n`}<meta name="theme-color" content="#0A0918" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#F4F5FF" media="(prefers-color-scheme: light)">
<meta property="og:site_name" content="EasyGameFun">
<meta property="og:type" content="${p.ogType || 'website'}">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.desc)}">
${p.path === null ? '' : `<meta property="og:url" content="${esc(url)}">\n`}<meta property="og:image" content="${esc(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/icons/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/fonts/sora.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${assets.css}">
<script>${INLINE_BOOT}</script>
<script src="${assets.app}" defer></script>
${(p.scripts || []).map(s => `<script src="${s}" defer></script>`).join('\n')}${ld.length ? `<script type="application/ld+json">${ldJson(ld.length === 1 ? ld[0] : ld)}</script>\n` : ''}</head>
<body${p.bodyAttrs ? ' ' + p.bodyAttrs : ''}>
<a class="skip" href="#view">Skip to main content</a>
<div id="bar" aria-hidden="true"></div>
${site.indexing ? '' : '<div class="preview">Preview site. The games shown are samples while we get ready to launch.</div>\n'}${m.promo ? `<div class="promo" id="promo"><span>${esc(m.promo.text)} <a href="${esc(m.promo.link)}">${esc(m.promo.linkText)}</a></span><button class="js-only" id="promoX" aria-label="Dismiss announcement">✕</button></div>\n` : ''}<header class="top"><div class="top-in">
<button class="icon-btn js-only" id="menu" aria-label="Open menu" aria-expanded="false" aria-controls="drawer">☰</button>
<a class="logo" href="/" aria-label="EasyGameFun home">${LOGO}</a>
<nav class="topnav" id="topnav" aria-label="Primary">${TOP.map(([h, k, t]) => `<a href="${h}"${top === k ? ' class="on" aria-current="page"' : ''}>${t}</a>`).join('')}<a href="/cats/" id="megabtn"${top === 'cats' ? ' class="on"' : ''} aria-expanded="false" aria-controls="mega">Categories <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></a></nav>
<span class="spacer"></span>
<form class="search" role="search" action="/search/" method="get">${SEARCH_ICON}<input id="q" name="q" type="search" placeholder="Search games" aria-label="Search games" autocomplete="off" enterkeyhint="search" aria-controls="sug"><kbd aria-hidden="true">/</kbd><div id="sug" hidden></div></form>
<button class="btn btn-pri btn-sm hide-md js-only" data-rnd>🎲 Surprise me</button>
<a class="icon-btn" id="stog" href="/search/" aria-label="Search games" aria-expanded="false">${SEARCH_ICON}</a>
<a class="icon-btn hide-sm" id="savedBtn" href="/favs/" aria-label="Saved games">❤️<span class="badge" id="sb"></span></a>
<button class="icon-btn js-only" id="theme" aria-label="Switch light or dark theme">🌙</button>
<div class="mega" id="mega" hidden>${chrome.mega}</div>
</div></header>
<div class="shell">
<nav class="side" id="side" aria-label="Categories and menu"><button class="railtog js-only" id="railtog" aria-label="Collapse or expand sidebar" aria-pressed="false"><span>Collapse menu</span><b aria-hidden="true">«</b></button>${chrome.sideFor(sideKey)}</nav>
<main id="view" tabindex="-1">
${p.body}
</main>
</div>
<footer class="foot">${chrome.foot}</footer>
<div class="scrim" id="scrim"></div>
<aside class="drawer" id="drawer" aria-label="Menu" aria-hidden="true"><div class="dh"><a class="logo" href="/" aria-label="EasyGameFun home">${LOGO}</a><button class="icon-btn" id="close" aria-label="Close menu">✕</button></div><div>${chrome.sideFor(sideKey)}</div></aside>
<nav class="bottom" aria-label="Main">${BOTTOM.map(([h, k, e, t]) => `<a href="${h}"${(p.bottom || top) === k ? ' class="on" aria-current="page"' : ''}><b>${e}</b>${t}</a>`).join('')}</nav>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
</body>
</html>
`;
}
