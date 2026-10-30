// Reusable HTML blocks shared by the page templates.
import { esc, slugify, gamesOf } from './util.mjs';
import { img, BIG } from './layout.mjs';

const badge = g => (g.featured ? '<span class="hot">Hot</span>' : g.isNew ? '<span class="hot newb">New</span>' : '');

// Game tile. v: '' | 'big' | 'xl' | 'wd'. attrs adds data-* used by client-side sorting.
export const tile = (g, v = '', { eager = false, attrs = '' } = {}) =>
  `<a class="tile${v ? ' ' + v : ''}" href="${g.url}"${attrs}>${img(g, '', eager, v === 'xl' || v === 'big' ? '(min-width: 700px) 360px, 92vw' : v === 'wd' ? '(min-width: 700px) 360px, 92vw' : '(min-width: 600px) 170px, 136px')}` +
  `${v === 'xl' ? '<span class="xl-badge">⭐ Editor\'s pick</span>' : badge(g)}` +
  `<span class="nm">${esc(g.name)}<small>${esc(g.cat.name)}</small>${v === 'xl' ? `<span class="xd">${esc(g.description)}</span><span class="xb">▶ Play now</span>` : ''}</span></a>`;

// Tile for sortable/filterable grids (category, tag, list pages).
export const sortTile = (g, v = '') => tile(g, v, {
  attrs: ` data-pop="${g.popularity}" data-added="${g.addedAt}" data-score="${g.score}" data-tags="${g.tagList.map(t => t.slug).join(' ')}" data-desc="${esc(g.description)}" data-name="${esc(g.name)}" data-cat="${esc(g.cat.name)}"`
});

export const wcard = (g, rank) =>
  `<a class="wcard" href="${g.url}"><span class="wt">${img(g)}${rank ? `<span class="rk">#${rank}</span>` : ''}</span><span class="wb"><span class="cs">${esc(g.cat.name)}</span><b>${esc(g.name)}</b><span class="wdsc">${esc(g.description)}</span><span class="wm">${esc(g.tags.slice(0, 3).join(' · '))}</span></span></a>`;

export const rowl = g => `<a class="rowl" href="${g.url}"><span class="tile" style="display:block">${img(g)}</span><span><b>${esc(g.name)}</b><span class="s">${esc(g.cat.name)} · ${esc(g.tags.slice(0, 2).join(', '))}</span></span></a>`;

const secHead = (id, title, link, sub) =>
  `<div class="sec-h"><div><h2 id="${id}">${esc(title)}</h2>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div>${link ? `<a href="${link}" aria-label="See all: ${esc(title)}">See all</a>` : ''}</div>`;

export const row = (title, list, link, sub) => {
  const id = 's-' + slugify(title);
  return `<section class="sec" aria-labelledby="${id}">${secHead(id, title, link, sub)}<div class="hs">${list.map(g => tile(g)).join('')}</div></section>`;
};

export const wrow = (title, list, link, sub) => {
  const id = 's-' + slugify(title);
  return `<section class="sec" aria-labelledby="${id}">${secHead(id, title, link, sub)}<div class="wrow">${list.map(g => wcard(g)).join('')}</div></section>`;
};

export const crumbs = items =>
  `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items.map((x, i) => (i < items.length - 1 ? `<li><a href="${x[1]}">${esc(x[0])}</a></li>` : `<li aria-current="page">${esc(x[0])}</li>`)).join('')}</ol></nav>`;

export const faqHTML = f => f.map(q => `<details><summary>${esc(q.q)}</summary><p>${esc(q.a)}</p></details>`).join('');

export const pager = (base, page, pages) => {
  if (pages <= 1) return '';
  const href = n => (n === 1 ? base : `${base}page/${n}/`);
  const nums = [];
  for (let n = 1; n <= pages; n++) {
    if (n === 1 || n === pages || Math.abs(n - page) <= 2) nums.push(n);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return `<nav class="pager" aria-label="Pages">${page > 1 ? `<a href="${href(page - 1)}" rel="prev">← Prev</a>` : ''}${nums.map(n => (n === '…' ? '<span aria-hidden="true">…</span>' : n === page ? `<span aria-current="page">${n}</span>` : `<a href="${href(n)}">${n}</a>`)).join('')}${page < pages ? `<a href="${href(page + 1)}" rel="next">Next →</a>` : ''}</nav>`;
};

export const hofBlock = (list, n) => {
  const g = list[0];
  if (!g) return '';
  const cols = [['#E8EAF6', '#9AA0BD'], ['#F6B98A', '#B8693A'], ['#8E8BB8', '#8E8BB8']];
  return `<div class="hof"><a class="hof1" href="${g.url}">${img(g, 'bg', false, BIG)}<div class="in"><span class="crown">👑 #1 of all time</span><h3>${esc(g.name)}</h3><p>${esc(g.description)}</p><div class="mi" style="color:rgba(255,255,255,.92)"><span>${esc(g.cat.name)}</span><span>${esc(g.tags.slice(0, 2).join(' · '))}</span></div><span class="btn btn-mint">▶ Play now</span></div></a>` +
    `<ol class="hofl">${list.slice(1, n).map((x, i) => { const c = cols[Math.min(i, 2)]; return `<li><a href="${x.url}"><span class="n" style="--c1:${c[0]};--c2:${c[1]}">${i + 2}</span><span class="tile" style="display:block">${img(x)}</span><span class="rt"><b>${esc(x.name)}</b><span>${esc(x.cat.name)} · ${esc(x.tags.slice(0, 2).join(', '))}</span></span><span class="go">Play ▶</span></a></li>`; }).join('')}</ol></div>`;
};


export const collSection = m => !m.collections.length ? '' :
  `<section class="sec" id="collections" aria-labelledby="s-coll"><div class="sec-h"><div><h2 id="s-coll">Collections</h2><p class="sub">Hand-picked lists for every mood.</p></div></div><div class="collgrid">${m.collections.map(c => `<a class="coll" style="--a:${c.colors[0]};--b:${c.colors[1]}" href="${c.url}"><i aria-hidden="true">${c.emoji}</i><b>${esc(c.name)}</b><span class="cd2">${esc(c.short)}</span><small>${c.games.length} games</small></a>`).join('')}</div></section>`;

export const relatedCats = (m, skip) =>
  `<section class="card" aria-labelledby="s-rc"><h2 id="s-rc">More categories to explore</h2><div class="chips" style="padding-bottom:0">${m.cats.filter(c => c.slug !== skip).map(c => `<a class="chip" href="${c.url}">${c.emoji} ${esc(c.name)}</a>`).join('')}</div></section>`;

// Moods group existing categories by how a visitor feels. A mood is shown only if at least one of its categories has games.
const MOODS = [
  { emoji: '⚡', title: 'Quick breaks', sub: 'Two minutes, one tap', slugs: ['arcade', 'idle', 'kids'] },
  { emoji: '🧠', title: 'Think it through', sub: 'Puzzles and strategy', slugs: ['puzzle', 'strategy'] },
  { emoji: '🏁', title: 'Need for speed', sub: 'Racing, shooting and driving', slugs: ['racing', 'shooter', 'simulator'] },
  { emoji: '👯', title: 'Play with friends', sub: 'Two players and .io arenas', slugs: ['2-player', 'io'] },
  { emoji: '💥', title: 'Action packed', sub: 'Adventure, sports and fights', slugs: ['action', 'adventure', 'sports'] }
];
export const moodSection = m => {
  const moods = MOODS.map(md => ({ ...md, cats: md.slugs.map(s => m.catBySlug.get(s)).filter(c => c && c.games.length) })).filter(md => md.cats.length);
  if (!moods.length) return '';
  return `<section class="sec" aria-labelledby="s-mood"><div class="sec-h"><div><h2 id="s-mood">Pick your mood</h2><p class="sub">Not sure what to play? Start with how you feel.</p></div></div><div class="moods">${moods.map((md, i) => {
    const lead = md.cats[0], picks = md.cats.flatMap(c => c.games).slice(0, 3);
    return `<a class="mood mv${i % 3}" href="${lead.url}" style="--a:${lead.colors[0]};--b:${lead.colors[1]}"><span class="mood-fan" aria-hidden="true">${picks.map(g => img(g, '', false, '120px')).join('')}</span><span class="mood-t"><i aria-hidden="true">${md.emoji}</i><b>${esc(md.title)}</b><span>${esc(md.sub)}</span></span></a>`;
  }).join('')}</div></section>`;
};
// A horizontal row with previous/next arrows. app.js scrolls the track; the arrows only show on mouse screens.
// Spotlight row: a wide featured game with a Play button, then a grid of the next six games with their names under them.
export const spotRow = c => {
  const g = c.games[0];
  return `<section class="sec catrow cv2 cspot m-only" style="--a:${c.colors[0]};--b:${c.colors[1]}" aria-labelledby="cr-${c.slug}-m"><div class="cr-head"><span class="cr-ico" aria-hidden="true">${c.emoji}</span><div class="cr-txt"><h2 id="cr-${c.slug}-m">${esc(gamesOf(c))}</h2><p>${c.games.length} free games · most played first</p></div><a class="cr-btn" href="${c.url}" aria-label="See all: ${esc(gamesOf(c))}">See all ${c.games.length} →</a></div><a class="cs-feat" href="${g.url}">${img(g, '', false, '(min-width: 700px) 720px, 100vw')}<span class="cs-info"><span class="cs-cat">${c.emoji} ${esc(c.name)}</span><b>${esc(g.name)}</b></span><span class="cs-play">▶ Play</span></a><div class="cs-grid">${c.games.slice(1, 7).map(x => tile(x)).join('')}</div></section>`;
};

// A closing card for each category row: it links to the whole category, so short rows still look full.
export const seeAllTile = c =>
  `<a class="tile more cr-more" href="${c.url}" style="--a:${c.colors[0]};--b:${c.colors[1]}" aria-label="See all: ${esc(gamesOf(c))}"><span aria-hidden="true">${c.emoji}</span><b>See all ${c.games.length}</b><small aria-hidden="true">→</small></a>`;

export const carousel = (cls, inner) =>
  `<div class="car"><button class="car-btn car-prev" type="button" aria-label="Scroll left"><span aria-hidden="true">‹</span></button><div class="car-track ${cls}">${inner}</div><button class="car-btn car-next" type="button" aria-label="Scroll right"><span aria-hidden="true">›</span></button></div>`;

export const floaters = list => list.slice(0, 3).map(g => `<span class="fl2" aria-hidden="true">${g.emoji}</span>`).join('');

// Structured data helpers
export const crumbLD = (base, items) => ({ '@type': 'BreadcrumbList', itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x[0], item: base + x[1] })) });
export const faqLD = f => ({ '@type': 'FAQPage', mainEntity: f.map(q => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } })) });
export const listLD = (base, name, list) => ({ '@type': 'ItemList', name, numberOfItems: list.length, itemListElement: list.map((g, i) => ({ '@type': 'ListItem', position: i + 1, name: g.name, url: base + g.url })) });
