// Page shell: <head>, header, sidebar, drawer, footer, bottom nav.
import { esc, ldJson } from './util.mjs';

// Runs before first paint: theme, sidebar rail, dismissed promo. Its hash goes into the CSP.
export const INLINE_BOOT = "(function(){var d=document.documentElement,t,r,p;try{t=localStorage.getItem('egf_theme');r=localStorage.getItem('egf_rail');p=localStorage.getItem('egf_promo')}catch(e){}if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';d.setAttribute('data-theme',t);d.classList.add('js');if(r==='1')d.classList.add('rail');if(p&&p===d.getAttribute('data-promo'))d.classList.add('nopromo')})()";

const LOGO_MARK = '<i><svg viewBox="0 0 40 40" width="26" height="26" aria-hidden="true"><path d="M15 11.5v13a1 1 0 0 0 1.5.9l11-6.5a1 1 0 0 0 0-1.8l-11-6.5A1 1 0 0 0 15 11.5z" fill="#fff"/><path d="M11.5 30.5c4.8 3.4 12.2 3.4 17 0" stroke="#FFD36B" stroke-width="3.2" stroke-linecap="round" fill="none"/></svg></i>';
export const LOGO = `${LOGO_MARK}<span class="lt">Easy<b>Game</b><em>Fun</em></span>`;
const SEARCH_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';

// sizes: how wide the image is shown. Small tiles get the 320px copy; big images can pick the original.
export const BIG = '(min-width: 900px) 520px, 92vw';
export const img = (g, cls = '', eager = false, sizes = '180px') => {
  const t = g.thumb, sm = t.small;
  const src = sm ? `src="${esc(sm.url)}" srcset="${esc(sm.url)} ${sm.width}w, ${esc(t.url)} ${t.width}w" sizes="${sizes}"` : `src="${esc(t.url)}"`;
  const w = sm ? sm.width : t.width, h = sm ? sm.height : t.height;
  return `<img${cls ? ` class="${cls}"` : ''} ${src} alt="" width="${w}" height="${h}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;
};

const SOCIAL = {
  facebook: ['Facebook', '<path d="M14 8.5h2.5V5H14a3.5 3.5 0 0 0-3.5 3.5V11H8v3.5h2.5V21H14v-6.5h2.5L17 11h-3V8.5z"/>'],
  x: ['X', '<path d="M4 4l16 16M20 4 4 20"/>'],
  instagram: ['Instagram', '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6"/>'],
  youtube: ['YouTube', '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="m10 9.5 5 2.5-5 2.5z"/>'],
  tiktok: ['TikTok', '<path d="M14 3v11.5a4 4 0 1 1-4-4"/><path d="M14 3c.6 2.7 2.6 4.4 5.5 4.6"/>'],
  discord: ['Discord', '<path d="M7 7.5c3.3-1.4 6.7-1.4 10 0 1.6 2.5 2.4 5.2 2.3 8.2-1.4 1-2.8 1.7-4.3 2.1l-1-1.6M7 7.5C5.4 10 4.6 12.7 4.7 15.7c1.4 1 2.8 1.7 4.3 2.1l1-1.6M8.5 15.5c2.3 1 4.7 1 7 0"/><circle cx="9.5" cy="12" r="1"/><circle cx="14.5" cy="12" r="1"/>']
};
// Only networks with a link in data/site.json "social" are shown.
export const socialLinks = m => Object.entries(m.site.social || {}).filter(([k, u]) => u && SOCIAL[k]);
const socialHTML = m => {
  const l = socialLinks(m);
  return l.length ? `<div class="social"><div class="sg"><span>Follow us</span></div><div class="socials">${l.map(([k, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener me" aria-label="EasyGameFun on ${SOCIAL[k][0]}" title="${SOCIAL[k][0]}"><svg viewBox="0 0 24 24" aria-hidden="true">${SOCIAL[k][1]}</svg></a>`).join('')}</div></div>` : '';
};

function sideHTML(m, key) {
  const L = (href, ico, txt, k) => `<a class="sl${key === k ? ' on' : ''}" href="${href}" title="${txt}"${key === k ? ' aria-current="page"' : ''}><span class="cb" style="background:var(--surface2)">${ico}</span><span class="nm">${txt}</span></a>`;
  return `<div class="sg"><span>Menu</span></div>` +
    L('/', '🏠', 'Home', 'home') + L('/new/', '🆕', 'New games', 'new') + L('/trending/', '🔥', 'Trending', 'trending') +
    L('/best/', '🏆', 'Best of all time', 'best') + L('/games/', '🔤', 'All games A to Z', 'az') + L('/favs/', '❤️', 'Saved games', 'favs') +
    `<div class="sg"><span>Categories</span></div>` +
    m.cats.map(c => `<a class="sl${key === 'cat:' + c.slug ? ' on' : ''}" href="${c.url}" title="${esc(c.name)}"${key === 'cat:' + c.slug ? ' aria-current="page"' : ''}><span class="cb" style="background:linear-gradient(135deg,${c.colors[0]},${c.colors[1]})">${c.emoji}</span><span class="nm">${esc(c.name)}</span><em>${c.games.length}</em></a>`).join('') +
    socialHTML(m);
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
<nav aria-label="Company"><h3>Help</h3><a href="/about/">About us</a><a href="/faq/">FAQ</a><a href="/parents/">For parents</a><a href="/contact/">Contact</a><a href="/contact/#submit">Submit your game</a><a href="/contact/#report">Report a problem</a></nav>
<nav aria-label="Legal"><h3>Legal</h3><a href="/privacy/">Privacy policy</a><a href="/cookies/">Cookie policy</a><a href="/terms/">Terms of use</a><a href="/disclaimer/">Disclaimer</a><a href="/copyright/">Copyright (DMCA)</a></nav></div>
${m.collections.length ? `<div class="foot-tags"><h3>Collections</h3><div>${m.collections.map(c => `<a href="${c.url}">${esc(c.name)}</a>`).join('')}</div></div>` : ''}
<div class="foot-bot"><span>© ${m.today.slice(0, 4)} EasyGameFun. Game names and trademarks belong to their owners.</span></div>`;
}

// Pre-rendered once per build and reused on every page.
export function makeChrome(m) {
  return { mega: megaHTML(m), foot: footHTML(m), side: new Map(), sideFor(key) { if (!this.side.has(key)) this.side.set(key, sideHTML(m, key)); return this.side.get(key); } };
}

const TOP = [['/', 'home', 'Home'], ['/new/', 'new', 'New'], ['/trending/', 'trending', 'Trending'], ['/best/', 'best', 'Best ever']];
const ICON = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  cats: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  favs: '<path d="M12 20.5s-8-4.6-8-10.4A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 3.1c0 5.8-8 10.4-8 10.4z"/>'
};
const svg = k => `<svg class="bi" viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
const BOTTOM = [['/', 'home', 'Home'], ['/cats/', 'cats', 'Categories'], null, ['/search/', 'search', 'Search'], ['/favs/', 'favs', 'Saved']];

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
${p.keywords ? `<meta name="keywords" content="${esc(p.keywords)}">\n` : ''}<meta name="author" content="EasyGameFun">
<meta name="publisher" content="EasyGameFun">
${p.path === null ? '' : `<link rel="canonical" href="${esc(url)}">\n`}<meta name="theme-color" content="#0A0918" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#F4F5FF" media="(prefers-color-scheme: light)">
${site.adsense?.client ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(site.adsense.client)}" crossorigin="anonymous"></script>\n` : ''}${p.path === '/' && site.verify?.pinterest ? `<meta name="p:domain_verify" content="${esc(site.verify.pinterest)}">\n` : ''}
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
<button class="icon-btn js-only" id="bell" aria-label="New games" aria-expanded="false" aria-controls="newpanel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><span class="badge" id="nb"></span></button>
<button class="icon-btn js-only" id="theme" aria-label="Switch light or dark theme">🌙</button>
<div class="newpanel" id="newpanel" hidden></div>
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
<nav class="bottom" aria-label="Main">${BOTTOM.map(b => b ? `<a href="${b[0]}"${(p.bottom || top) === b[1] ? ' class="on" aria-current="page"' : ''}>${svg(b[1])}${b[1] === 'favs' ? '<span class="badge sb"></span>' : ''}<span>${b[2]}</span></a>` : '<a class="rnd" href="/trending/" data-rnd aria-label="Surprise me: play a random game"><span class="rb">🎲</span><span>Surprise</span></a>').join('')}</nav>
<button class="totop js-only" id="totop" type="button" aria-label="Back to top"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
</body>
</html>
`;
}
