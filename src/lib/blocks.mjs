// Reusable HTML blocks shared by the page templates.
import { esc, slugify } from './util.mjs';
import { img } from './layout.mjs';

const badge = g => (g.featured ? '<span class="hot">Hot</span>' : g.isNew ? '<span class="hot newb">New</span>' : '');

// Game tile. v: '' | 'big' | 'xl' | 'wd'. attrs adds data-* used by client-side sorting.
export const tile = (g, v = '', { eager = false, attrs = '' } = {}) =>
  `<a class="tile${v ? ' ' + v : ''}" href="${g.url}" aria-label="Play ${esc(g.name)}"${attrs}>${img(g, '', eager)}` +
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
  return `<div class="hof"><a class="hof1" href="${g.url}">${img(g, 'bg')}<div class="in"><span class="crown">👑 #1 of all time</span><h3>${esc(g.name)}</h3><p>${esc(g.description)}</p><div class="mi" style="color:rgba(255,255,255,.92)"><span>${esc(g.cat.name)}</span><span>${esc(g.tags.slice(0, 2).join(' · '))}</span></div><span class="btn btn-mint">▶ Play now</span></div></a>` +
    `<ol class="hofl">${list.slice(1, n).map((x, i) => { const c = cols[Math.min(i, 2)]; return `<li><a href="${x.url}"><span class="n" style="--c1:${c[0]};--c2:${c[1]}">${i + 2}</span><span class="tile" style="display:block">${img(x)}</span><span class="rt"><b>${esc(x.name)}</b><span>${esc(x.cat.name)} · ${esc(x.tags.slice(0, 2).join(', '))}</span></span><span class="go">Play ▶</span></a></li>`; }).join('')}</ol></div>`;
};

export const catCards = m =>
  `<section class="sec" aria-labelledby="s-cats"><div class="sec-h"><h2 id="s-cats">Browse by category</h2><a href="/cats/">All categories</a></div><div class="catgrid">${m.cats.map(c => `<a class="catcard" style="--a:${c.colors[0]};--b:${c.colors[1]}" href="${c.url}"><i aria-hidden="true">${c.emoji}</i><b>${esc(c.name)}</b><span>${c.games.length} games</span></a>`).join('')}</div></section>`;

export const collSection = m => !m.collections.length ? '' :
  `<section class="sec" id="collections" aria-labelledby="s-coll"><div class="sec-h"><div><h2 id="s-coll">Collections</h2><p class="sub">Hand-picked lists for every mood.</p></div></div><div class="collgrid">${m.collections.map(c => `<a class="coll" style="--a:${c.colors[0]};--b:${c.colors[1]}" href="${c.url}"><i aria-hidden="true">${c.emoji}</i><b>${esc(c.name)}</b><span class="cd2">${esc(c.short)}</span><small>${c.games.length} games</small></a>`).join('')}</div></section>`;

export const relatedCats = (m, skip) =>
  `<section class="card" aria-labelledby="s-rc"><h2 id="s-rc">More categories to explore</h2><div class="chips" style="padding-bottom:0">${m.cats.filter(c => c.slug !== skip).map(c => `<a class="chip" href="${c.url}">${c.emoji} ${esc(c.name)}</a>`).join('')}</div></section>`;

export const floaters = list => list.slice(0, 3).map(g => `<span class="fl2" aria-hidden="true">${g.emoji}</span>`).join('');

// Structured data helpers
export const crumbLD = (base, items) => ({ '@type': 'BreadcrumbList', itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x[0], item: base + x[1] })) });
export const faqLD = f => ({ '@type': 'FAQPage', mainEntity: f.map(q => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } })) });
export const listLD = (base, name, list) => ({ '@type': 'ItemList', name, numberOfItems: list.length, itemListElement: list.map((g, i) => ({ '@type': 'ListItem', position: i + 1, name: g.name, url: base + g.url })) });
