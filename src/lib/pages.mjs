// Page templates. Each returns { path, title, desc, body, ld, ... } for layout().
import { esc, chunk, fitDesc, fitTitle, fmtDate, gamesOf, gamesOfLower, GamesOf, shortCat } from './util.mjs';
import { img, BIG } from './layout.mjs';
import { HINT } from './data.mjs';
import { tile, sortTile, wcard, rowl, row, wrow, crumbs, faqHTML, pager, hofBlock, collSection, moodSection, champSection, relatedCats, floaters, crumbLD, faqLD, listLD } from './blocks.mjs';

const HOME_FAQ = [
  { q: 'Are the games on EasyGameFun free?', a: 'Yes. Every game is free to play in your browser. There is nothing to download and no account to create.' },
  { q: 'Can I play on my phone?', a: 'Yes. Games work on phones, tablets, and computers. Add EasyGameFun to your home screen to open it like an app.' },
  { q: 'How often are new games added?', a: 'New games are added every day, so there is always something new to try.' },
  { q: 'Do I need to sign up?', a: 'No. Just pick a game and press Play. Your saved games stay on your device.' }
];
const SEARCH_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';

/* ---------------- home ---------------- */
export function home(m) {
  const B = m.site.baseUrl, N = m.games.length;
  // Every game appears at most once on the home page: each section takes games nobody above has shown.
  const used = new Set();
  const take = (list, n) => { const out = []; for (const g of list) { if (out.length >= n) break; if (!used.has(g.slug)) { used.add(g.slug); out.push(g); } } return out; };
  // The newest games fill the first view. 9 = one large tile (2x2) + 8 small ones, so the grid has no empty cell.
  const top = take(m.newest, 9);
  const popular = take(m.trending, 9);

  // One row per category, most played first. Games can appear here and in the sections above: a category row is a browse path, not a list of new games.
  // Each row is themed with its category colours and emoji, and its first game is shown larger.
  const catRows = m.cats.map((c, i) => `<section class="sec catrow cv${i % 4}" style="--a:${c.colors[0]};--b:${c.colors[1]}" aria-labelledby="cr-${c.slug}"><div class="cr-head"><span class="cr-ico" aria-hidden="true">${c.emoji}</span><div class="cr-txt"><h2 id="cr-${c.slug}">${esc(gamesOf(c))}</h2><p>${c.games.length} free games · most played first</p></div><a class="cr-btn" href="${c.url}" aria-label="See all: ${esc(gamesOf(c))}">See all ${c.games.length} →</a><span class="cr-fl" aria-hidden="true">${c.emoji}</span></div><div class="hs">${c.games.slice(0, 12).map((g, i) => tile(g, i === 0 ? 'wd' : '')).join('')}</div></section>`).join('');

  const body = `<section class="tops" aria-labelledby="h1"><div class="tops-h"><h1 id="h1">Latest free online games</h1><span class="tops-s"><i class="live-dot"></i>${N} free games · new every day · no download</span></div>
<div class="mosaic">${top.map((g, i) => tile(g, '', { eager: i < 3 })).join('')}</div></section>
<nav class="quick" aria-label="Browse categories">${m.cats.map(c => `<a href="${c.url}">${c.emoji} ${esc(c.name)}</a>`).join('')}<a href="/new/">🆕 New</a><a href="/trending/">🔥 Trending</a><a href="/best/">🏆 Best ever</a></nav>
${moodSection(m)}
${popular.length ? `<section class="sec" aria-labelledby="s-live"><div class="sec-h"><div><h2 id="s-live">Popular right now</h2><p class="sub">The most played games this week. Tap any card to play.</p></div><a href="/trending/">See all</a></div><div class="live">${popular.map((g, i) => `<a class="lv${i === 0 ? ' first' : ''}" href="${g.url}"><span class="lrk" aria-hidden="true">#${i + 1}</span>${img(g, '', false, i === 0 ? '(min-width: 1000px) 540px, 92vw' : '(min-width: 700px) 320px, 78vw')}<span class="lb"><span><b>${esc(g.name)}</b><small>${esc(g.cat.name)}</small></span><span class="pb">Play ▶</span></span></a>`).join('')}</div></section>` : ''}
${champSection(m)}
<div id="personal"></div>
${catRows}
<p class="allgames"><a href="/games/">Browse all ${N} games A to Z →</a></p>` +
    collSection(m) +
    `<section class="cta js-only"><div><h2>Can't decide what to play?</h2><p>Let us pick a random game for you. It takes one tap.</p></div><button class="play-btn" data-rnd>🎲 Surprise me</button></section>
<section class="sec" aria-labelledby="s-why"><div class="sec-h"><h2 id="s-why">Why people play on EasyGameFun</h2></div><div class="why">
<div><i aria-hidden="true">⚡</i><h3>Instant play</h3><p>Games load in seconds and start with one tap. Nothing to install.</p></div>
<div><i aria-hidden="true">📱</i><h3>Made for every screen</h3><p>The same games work on phones, tablets and computers.</p></div>
<div><i aria-hidden="true">🎯</i><h3>Hand-picked games</h3><p>Every game is checked to load and play well before it goes live.</p></div>
<div><i aria-hidden="true">🆓</i><h3>Free, always</h3><p>No account, no paywall. Your saved games stay on your device.</p></div></div></section>
<section class="card" aria-labelledby="s-about"><h2 id="s-about">Play free online games on EasyGameFun</h2>
<p>EasyGameFun is a free game site for anyone who wants to play in a few seconds. Every game runs in your browser, so you can play on a phone, a tablet, or a computer without installing anything.</p>
<p>Pick a category to start: ${m.cats.map(c => `<a href="${c.url}">${esc(gamesOfLower(c))}</a>`).join(', ')}. We add new games every day.</p>
<h2 style="margin-top:18px">Questions</h2>${faqHTML(HOME_FAQ)}</section>`;

  return {
    keywords: 'free online games, play games online, browser games, no download games, mobile games, ' + m.cats.map(c => gamesOfLower(c)).join(', '),
    path: '/', top: 'home', title: 'EasyGameFun: Free Online Games to Play Now (No Download)',
    desc: fitDesc('Play free online games on your phone or computer. Puzzle, racing, shooter, .io, 2 player and kids games. New games every day. No download.'),
    body, scripts: [],
    ld: [
      { '@type': 'Organization', '@id': B + '/#org', name: 'EasyGameFun', alternateName: 'Easy Game Fun', url: B + '/', logo: { '@type': 'ImageObject', url: B + '/icons/icon-512.png', width: 512, height: 512 }, email: m.site.email, ...(Object.values(m.site.social || {}).some(Boolean) ? { sameAs: Object.values(m.site.social).filter(Boolean) } : {}) },
      // name + alternateName tell Google which site name to show in results.
      { '@type': 'WebSite', '@id': B + '/#website', name: 'EasyGameFun', alternateName: ['Easy Game Fun', 'easygamefun.com'], url: B + '/', inLanguage: 'en', publisher: { '@id': B + '/#org' }, potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: B + '/search/?q={search_term_string}' }, 'query-input': 'required name=search_term_string' } },
      faqLD(HOME_FAQ), listLD(B, 'New games', m.newest.slice(0, 10))
    ]
  };
}


/* ---------------- categories ---------------- */
export function catsIndex(m) {
  const B = m.site.baseUrl;
  const body = `${crumbs([['Home', '/'], ['Categories', '']])}
<section class="chero" style="--a:#7B5CFF;--b:#FF3F6C">${floaters(m.games)}<div><h1>Game categories</h1><p>Pick a style and start playing. Every category has free games that load fast on phone and computer.</p><div class="facts"><span>${m.cats.length} categories</span><span>${m.games.length} games</span><span>Free</span></div></div></section>
<div class="cpgrid">${m.cats.map(c => `<a class="cpanel" href="${c.url}" style="--a:${c.colors[0]};--b:${c.colors[1]}"><span class="ci" aria-hidden="true">${c.emoji}</span><span class="cb2"><b>${esc(gamesOf(c))}</b><span class="cd">${esc(c.intro.split('. ')[0])}.</span><span class="cth">${c.games.slice(0, 4).map(g => `<span class="tile">${img(g)}</span>`).join('')}<em>${c.games.length} games →</em></span></span></a>`).join('')}</div>
<div style="margin-top:34px">${collSection(m)}</div>
<section class="card" aria-labelledby="s-cabout"><h2 id="s-cabout">Find the right kind of game</h2><p>Every game on EasyGameFun belongs to one main category, so you can jump straight to the kind of play you enjoy. Racing and shooter games are about speed and quick reactions, puzzle games ask you to think, .io games put you in a live arena with other players, and arcade games are perfect for a quick break.</p><p>New games are added every day, and new categories appear when a new kind of game arrives. Each category page explains what its games are like and lists them all, with filters for style and a sort by newest or top rated.</p></section>
<section class="sec" aria-labelledby="s-tg"><div class="sec-h"><h2 id="s-tg">Browse by tag</h2></div><div class="chips" style="flex-wrap:wrap;overflow:visible;margin:0;padding:0">${m.tags.map(t => `<a class="chip" href="${t.url}">${esc(t.name)}<small>${t.games.length}</small></a>`).join('')}</div></section>`;
  return {
    path: '/cats/', top: 'cats', bottom: 'cats', title: 'All Game Categories | EasyGameFun',
    desc: fitDesc(`Browse all free game categories on EasyGameFun: ${m.cats.map(c => c.name.toLowerCase()).join(', ')}.`),
    body, ld: [crumbLD(B, [['Home', '/'], ['Categories', '/cats/']]), { '@type': 'CollectionPage', name: 'Game categories', url: B + '/cats/' }]
  };
}

const toolbar = (label, count, total, tags) =>
  `<div class="tb"><div class="sec-h" style="margin:0 0 8px"><h2 style="font-size:22px">${esc(label)}</h2><span class="count" id="cnt" aria-live="polite">${count === total ? `${count} games` : `Showing ${count} of ${total}`}</span></div>
<div class="tb-r js-only" style="flex-wrap:wrap"><div class="seg" role="group" aria-label="Sort games"><button data-sort="pop" class="on" aria-pressed="true">Popular</button><button data-sort="added" aria-pressed="false">New</button><button data-sort="score" aria-pressed="false">Top rated</button></div><div class="seg" role="group" aria-label="Layout"><button data-view="grid" class="on" aria-pressed="true">▦ Grid</button><button data-view="list" aria-pressed="false">☰ List</button></div></div></div>` +
  (tags.length > 1 ? `<div class="chips js-only" id="tagchips" role="group" aria-label="Filter by tag"><button class="chip on" data-tag="" aria-pressed="true">All</button>${tags.map(t => `<button class="chip" data-tag="${t.slug}" aria-pressed="false">${esc(t.name)}</button>`).join('')}</div>` : '');

const gridOf = list => `<div class="grid" id="catgrid">${list.map((g, i) => sortTile(g, i === 0 && list.length >= 3 ? 'big' : '')).join('')}</div>`;

const pageTags = list => {
  const seen = new Map();
  list.forEach(g => g.tagList.forEach(t => seen.set(t.slug, t)));
  return [...seen.values()];
};

export function categoryPages(m, c) {
  const B = m.site.baseUrl, size = m.site.pageSize;
  const pages = chunk(c.games, size);
  const best = [...c.games].sort(m.sorters.byBest);
  const top = best[0];
  const faq = [
    { q: `Are ${gamesOfLower(c)} on EasyGameFun free?`, a: `Yes. All ${gamesOfLower(c)} are free to play in your browser, with no download and no sign-up.` },
    ...c.faq
  ];
  const tags = pageTags(c.games);
  return pages.map((list, i) => {
    const n = i + 1, path = n === 1 ? c.url : `${c.url}page/${n}/`;
    const crumbItems = n === 1 ? [['Home', '/'], [gamesOf(c), '']] : [['Home', '/'], [gamesOf(c), c.url], [`Page ${n}`, '']];
    const ldCrumbs = n === 1 ? [['Home', '/'], [gamesOf(c), c.url]] : [['Home', '/'], [gamesOf(c), c.url], [`Page ${n}`, path]];
    let body;
    if (n === 1) {
      body = `<section class="chero has-f" style="--a:${c.colors[0]};--b:${c.colors[1]}">${floaters(c.games)}<div>${crumbs(crumbItems)}
<h1>Free ${esc(gamesOf(c))}</h1><p>${esc(c.intro)}</p>
<div class="facts"><span>${c.games.length} games</span><span>Free</span><span>No download</span></div></div>
<a class="cfeat" href="${top.url}">${img(top, '', true, BIG)}<span class="badge2">⭐ Top pick</span><span class="lb"><span><b>${esc(top.name)}</b><small>${esc(top.tags.slice(0, 2).join(' · '))}</small></span><span class="play-btn" style="min-height:42px;padding:0 18px;font-size:15px">Play ▶</span></span></a></section>
<nav class="chips subnav" aria-label="Other categories">${m.cats.map(x => `<a class="chip${x === c ? ' on' : ''}" href="${x.url}"${x === c ? ' aria-current="page"' : ''}>${x.emoji} ${esc(x.name)}</a>`).join('')}</nav>
${best.length >= 3 ? `<section class="sec" aria-labelledby="s-top3"><div class="sec-h"><div><h2 id="s-top3">Best ${esc(gamesOfLower(c))}</h2><p class="sub">Our editors' top ${esc(gamesOfLower(c))} right now.</p></div></div><div class="wrow">${best.slice(0, 3).map((g, k) => wcard(g, k + 1)).join('')}</div></section>` : ''}
${toolbar('All ' + gamesOfLower(c), list.length, c.games.length, tags)}
${gridOf(list)}
${pager(c.url, n, pages.length)}
<section class="card" aria-labelledby="s-ab"><h2 id="s-ab">About ${esc(gamesOfLower(c))}</h2>
<p>${esc(c.intro)} EasyGameFun has ${c.games.length} free ${esc(gamesOfLower(c))} right now, including ${c.games.slice(0, 3).map(g => `<a href="${g.url}">${esc(g.name)}</a>`).join(', ')}. Our top pick is <a href="${top.url}">${esc(top.name)}</a>.</p>
<h3>Why people like ${esc(gamesOfLower(c))}</h3><ul>${c.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul>
${(c.about || []).map(t => `<p>${esc(t)}</p>`).join('')}</section>
<section class="card" aria-labelledby="s-q"><h2 id="s-q">${esc(shortCat(c))} game questions</h2>${faqHTML(faq)}</section>
${relatedCats(m, c.slug)}
<div style="margin-top:30px">${row('You might also like', m.best.filter(g => g.cat !== c).slice(0, 8), '/best/')}</div>`;
    } else {
      body = `<section class="chero" style="--a:${c.colors[0]};--b:${c.colors[1]}">${floaters(list)}<div>${crumbs(crumbItems)}<h1>Free ${esc(gamesOf(c))}: page ${n}</h1><p>More free ${esc(gamesOfLower(c))}, sorted by popularity. Page ${n} of ${pages.length}.</p><div class="facts"><span>${c.games.length} games</span><span>Free</span></div></div></section>
${toolbar(`${gamesOf(c)}, page ${n}`, list.length, c.games.length, pageTags(list))}
${gridOf(list)}
${pager(c.url, n, pages.length)}
${relatedCats(m, c.slug)}`;
    }
    return {
      path, top: 'cats', side: 'cat:' + c.slug, bottom: 'cats', noindex: c.games.length < (m.site.thinMin || 3),
      keywords: [`free ${gamesOfLower(c)}`, `${gamesOfLower(c)} online`, `play ${gamesOfLower(c)}`, ...c.games.slice(0, 5).map(g => g.name)].join(', '),
      title: n === 1 ? fitTitle(`Free ${GamesOf(c)}: Play Online Now`) : fitTitle(`Free ${GamesOf(c)}`, `: Page ${n}`),
      desc: n === 1 ? fitDesc(`Play ${c.games.length} free ${gamesOfLower(c)} online. ${c.intro}`) : fitDesc(`Page ${n} of free ${gamesOfLower(c)} on EasyGameFun. Browse ${list.length} more games, from ${list[0].name} to ${list[list.length - 1].name}.`),
      body, scripts: [],
      ld: [crumbLD(B, ldCrumbs), { '@type': 'CollectionPage', name: `Free ${GamesOf(c)}`, url: B + path }, listLD(B, gamesOf(c), list), n === 1 ? faqLD(faq) : null]
    };
  });
}

// Generic paginated list page (tags, collections, A to Z letters).
function listPages(m, { base, h1, titleText, intro, list, colors, crumbsBase, side, noindex, metaDesc, ldType = 'CollectionPage' }) {
  const B = m.site.baseUrl;
  const pages = chunk(list, m.site.pageSize);
  return pages.map((items, i) => {
    const n = i + 1, path = n === 1 ? base : `${base}page/${n}/`;
    const title = n === 1 ? h1 : `${h1}: page ${n}`;
    const ci = n === 1 ? [...crumbsBase, [h1, '']] : [...crumbsBase, [h1, base], [`Page ${n}`, '']];
    const ldc = n === 1 ? [...crumbsBase, [h1, base]] : [...crumbsBase, [h1, base], [`Page ${n}`, path]];
    const body = `<section class="chero" style="--a:${colors[0]};--b:${colors[1]}">${floaters(items)}<div>${crumbs(ci)}<h1>${esc(title)}</h1><p>${esc(intro)}</p><div class="facts"><span>${list.length} games</span><span>Free</span></div></div></section>
${toolbar(n === 1 ? 'All games' : `Page ${n}`, items.length, list.length, pageTags(items))}
${gridOf(items)}
${pager(base, n, pages.length)}
${relatedCats(m, '')}`;
    return {
      path, side, title: fitTitle(titleText || h1, n === 1 ? '' : `: Page ${n}`), noindex,
      desc: fitDesc(n === 1 ? metaDesc : `Page ${n} of ${(titleText || h1).replace(/:.*/, '').toLowerCase()}${titleText && titleText.includes('Hand-Picked') ? ', a hand-picked collection' : ''} on EasyGameFun, from ${items[0].name} to ${items[items.length - 1].name}.`),
      body, ld: [crumbLD(B, ldc), { '@type': ldType, name: title, url: B + path }, listLD(B, title, items)]
    };
  });
}

export const tagPages = (m, t) => listPages(m, {
  base: t.url, h1: `${t.name} games`, titleText: `Free ${t.name} Games Online`, list: t.games, colors: ['#7B5CFF', '#FF3F6C'], side: 'tag:' + t.slug, noindex: !t.indexable,
  intro: `Free ${t.name.toLowerCase()} games you can play online right now. Pick one and start in a tap.`,
  metaDesc: `Play ${t.games.length} free ${t.name.toLowerCase()} games online at EasyGameFun. Pick a game and start playing in your browser.`,
  crumbsBase: [['Home', '/'], ['Categories', '/cats/']]
});

export const collectionPages = (m, c) => listPages(m, {
  noindex: c.games.length < (m.site.collectionIndexMin || 8), base: c.url, h1: c.name, titleText: `${c.name}: Hand-Picked Free Games`,list: c.games, colors: c.colors, intro: c.intro,
  metaDesc: `${c.intro} ${c.games.length} free games, hand-picked by EasyGameFun.`,
  crumbsBase: [['Home', '/'], ['Categories', '/cats/']]
});

/* ---------------- lists: new, trending, best ---------------- */
function simpleList(m, { path, key, h1, intro, list, colors, title, desc, more }) {
  const B = m.site.baseUrl;
  const body = `<section class="chero" style="--a:${colors[0]};--b:${colors[1]}">${floaters(list)}<div>${crumbs([['Home', '/'], [h1, '']])}<h1>${esc(h1)}</h1><p>${esc(intro)}</p><div class="facts"><span>${list.length} games</span><span>Free</span></div></div></section>
<div class="grid">${list.map((g, i) => tile(g, i === 0 && list.length >= 3 ? 'big' : '')).join('')}</div>
${more ? `<section class="card" aria-labelledby="s-more"><h2 id="s-more">${esc(more[0])}</h2>${more.slice(1).map(t => `<p>${esc(t)}</p>`).join('')}</section>` : ''}
${relatedCats(m, '')}`;
  // While the catalog is small, New / Trending / Best show the same games, so they stay out of Google until it grows.
  return { path, top: key, side: key, title, desc: fitDesc(desc), body, noindex: m.games.length < (m.site.listIndexMin || 30), ld: [crumbLD(B, [['Home', '/'], [h1, path]]), listLD(B, h1, list)] };
}

export const newPage = m => simpleList(m, {
  path: '/new/', key: 'new', h1: 'New games', colors: ['#FF3F6C', '#7B5CFF'], list: m.newest.slice(0, m.site.listLimit),
  intro: 'The newest free games on EasyGameFun, added every day.', title: 'New Free Online Games | EasyGameFun',
  desc: 'The newest free online games on EasyGameFun, added every day. Be the first to play them in your browser on phone, tablet or computer.',
  more: ['How new games are added', 'New games arrive on EasyGameFun every day. Each one is checked before it goes live: it has to load properly, allow play on other websites, and come with clear information about how it is played.', 'This page always shows the latest arrivals first, so it is the quickest way to find something you have not tried yet. Tap the bell at the top of the site to see how many games were added since your last visit.']
});

export const trendingPage = m => simpleList(m, {
  path: '/trending/', key: 'trending', h1: 'Trending games', colors: ['#FF8A00', '#FF3F6C'], list: m.trending.slice(0, m.site.listLimit),
  intro: 'The most played free games on EasyGameFun right now.', title: 'Trending Free Online Games | EasyGameFun',
  desc: 'The most played free online games on EasyGameFun right now. See what everyone is playing and jump in with one tap.',
  more: ['What trending means here', 'Trending games are the ones being played the most right now. The list changes as new games arrive and as players move on to new favorites, so it is worth checking back.', 'If you are not sure where to start, the top of this list is a safe pick: these games have already won over a lot of players. For something calmer or more specific, browse by category instead.']
});

export function bestPage(m) {
  const B = m.site.baseUrl, l = m.best.slice(0, m.site.listLimit);
  const body = `<section class="chero" style="--a:#FFB800;--b:#FF3F6C">${floaters(l)}<div>${crumbs([['Home', '/'], ['Best games of all time', '']])}<h1>Best games of all time</h1><p>The most loved free games on EasyGameFun, ranked by our editors' score and how often each game is played. Start at number one and work your way down.</p><div class="facts"><span>${l.length} games ranked</span><span>Free</span></div></div></section>
${hofBlock(l, 6)}
<section class="card" aria-labelledby="s-how"><h2 id="s-how">How we rank games</h2><p>This ranking combines our editors' score for each game, based on how well it plays, how clear its controls are and how well it works on phones, with how often the game is played on EasyGameFun.</p><p>The list updates as new games arrive and as players discover new favorites, so a great new game can climb quickly. Every game here is free to play in your browser.</p></section>
${l.length > 6 ? `<section class="sec" style="margin-top:30px" aria-labelledby="s-full"><div class="sec-h"><h2 id="s-full">Full ranking</h2></div><div class="rank off" style="counter-reset:r 6">${l.slice(6).map(g => `<a href="${g.url}"><span class="tile" style="display:block">${img(g)}</span><span class="rt"><b>${esc(g.name)}</b><span>${esc(g.cat.name)} · ${esc(g.tags.slice(0, 2).join(', '))}</span></span><span class="go">Play ▶</span></a>`).join('')}</div></section>` : ''}
${relatedCats(m, '')}`;
  return {
    path: '/best/', top: 'best', side: 'best', title: 'Best Online Games of All Time | EasyGameFun', noindex: m.games.length < (m.site.listIndexMin || 30),
    desc: fitDesc('The best free online games of all time on EasyGameFun, ranked by our editors and by how often they are played. Play them free in your browser.'),
    body, ld: [crumbLD(B, [['Home', '/'], ['Best games of all time', '/best/']]), listLD(B, 'Best games of all time', l)]
  };
}

/* ---------------- A to Z ---------------- */
const letterLabel = l => (l === '0-9' ? '0 to 9' : l.toUpperCase());
const letterNav = (m, on) => `<nav class="letters" aria-label="Games by letter">${[...'abcdefghijklmnopqrstuvwxyz', '0-9'].map(l => (m.letters.has(l) ? `<a href="/games/${l}/"${l === on ? ' aria-current="page"' : ''}>${letterLabel(l)}</a>` : `<span>${letterLabel(l)}</span>`)).join('')}</nav>`;

export function azHub(m) {
  const B = m.site.baseUrl;
  const body = `${crumbs([['Home', '/'], ['All games A to Z', '']])}
<h1 style="font-size:clamp(28px,5vw,40px);margin-bottom:8px">All games A to Z</h1>
<p class="sub" style="margin-bottom:18px">Every free game on EasyGameFun, sorted by name. Pick a letter to jump in.</p>
${letterNav(m, '')}
${[...m.letters].map(([l, list]) => `<section class="sec" aria-labelledby="az-${l}"><div class="sec-h"><h2 id="az-${l}">${letterLabel(l)}</h2><a href="/games/${l}/">All ${list.length} games</a></div><div class="icons">${list.slice(0, 8).map(g => `<a class="ico" href="${g.url}"><span class="tile">${img(g)}</span><b>${esc(g.name)}</b></a>`).join('')}</div></section>`).join('')}`;
  return {
    path: '/games/', top: '', side: 'az', title: 'All Free Games A to Z | EasyGameFun', noindex: m.games.length < (m.site.listIndexMin || 30),
    desc: fitDesc(`Browse all ${m.games.length} free online games on EasyGameFun from A to Z. Find any game by name and play it in your browser.`),
    body, ld: [crumbLD(B, [['Home', '/'], ['All games A to Z', '/games/']])]
  };
}

export const azLetterPages = (m, l, list) => listPages(m, {
  // Letter pages are for browsing only, never indexed.
  noindex: true, base: `/games/${l}/`, h1: `Games starting with ${letterLabel(l)}`, titleText: `Free Games Starting With ${letterLabel(l)}`, list, colors: ['#2F9BFF', '#6C4DFF'], side: 'az',
  intro: `All free games on EasyGameFun whose name starts with ${letterLabel(l)}.`,
  metaDesc: `Play ${list.length} free online games starting with ${letterLabel(l)} on EasyGameFun, from ${list[0].name} to ${list[list.length - 1].name}.`,
  crumbsBase: [['Home', '/'], ['All games A to Z', '/games/']]
}).map(p => ({ ...p, body: p.body.replace('<section class="chero"', letterNav(m, l) + '<section class="chero"') }));

/* ---------------- game ---------------- */
export function gamePage(m, g, assets) {
  const B = m.site.baseUrl, c = g.cat;
  const ct = g.content || {};
  const hint = ct.touchHint || HINT[g.kind];
  const faq = ct.faq?.length ? ct.faq : [
    { q: `Is ${g.name} free to play?`, a: `Yes. ${g.name} is free to play in your browser. There is nothing to download and no account to create.` },
    { q: `Can I play ${g.name} on my phone?`, a: `Yes. The game runs on phones, tablets, and computers.${g.orientation === 'landscape' ? ' Turn your phone sideways for a bigger screen.' : ''}` },
    { q: `What kind of game is ${g.name}?`, a: `It is a ${shortCat(c).toLowerCase()} game. If you like it, browse more in the ${c.name} category.` }
  ];
  const about = ct.about ? ct.about.split(/\n+/) : [g.description, `${g.name} is a free ${shortCat(c).toLowerCase()} game that loads fast and runs right in your browser. Short rounds make it easy to jump in for a minute or stay for an hour, on any device.`];
  const nx = g.related[0] || g;
  const next3 = g.related.slice(0, 3).map(x => [x.url, x.name, x.thumb.url]);
  let embedOrigin = '';
  try { embedOrigin = g.embedUrl ? new URL(g.embedUrl).origin : ''; } catch { embedOrigin = ''; }
  const player = `<div class="player" id="player" data-slug="${g.slug}" data-name="${esc(g.name)}" data-embed="${esc(g.embedUrl || '')}" data-origin="${esc(embedOrigin)}" data-kind="${g.kind}" data-emoji="${esc(g.emoji || '🎮')}" data-c1="${esc(g.colors?.[0] || '#6C4DFF')}" data-c2="${esc(g.colors?.[1] || '#FF3F6C')}" data-hint="${esc(hint)}" data-demo="${assets.demo}" data-next="${esc(JSON.stringify(next3))}">` +
    `<div class="ov" id="ov">${img(g, 'bg', true, BIG).replace('alt=""', `alt="${esc(g.name)}"`)}${g.thumb.generated ? `<div class="em" aria-hidden="true">${g.emoji || '🎮'}</div>` : ''}<div class="ovt">${esc(g.name)}</div><small>${esc(hint)}</small><button class="btn btn-mint js-only" id="go">▶ Play now</button><noscript><small>Turn on JavaScript to play this game.</small></noscript></div></div>`;
  const body = `${crumbs([['Home', '/'], [gamesOf(c), c.url], [g.name, '']])}
<article class="gp"><div class="gmain">
${player}
<div class="gbar"><h1>${esc(g.name)}</h1>
<div class="gmeta"><a class="gcat" href="${c.url}" style="--a:${c.colors[0]};--b:${c.colors[1]}">${c.emoji} ${esc(c.name)}</a><span>Free</span><span>Added ${fmtDate(g.addedAt)}</span>${g.developer ? `<span>By ${esc(g.developer)}</span>` : ''}</div></div>
<div class="acts js-only">
<button class="act" id="fav" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-8-4.6-8-10.4A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 3.1c0 5.8-8 10.4-8 10.4z"/></svg><span>Save</span></button>
<button class="act" id="share"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg><span>Share</span></button>
<button class="act" id="fs"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg><span>Fullscreen</span></button>
<a class="act" href="/contact/#report" aria-label="Report a problem with this game"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V4M4 4h12l-2 4 2 4H4"/></svg><span>Report</span></a></div>
${g.mature ? '<p class="advisory" role="note">⚠ Content notice: this game includes mature elements such as intense action or strong language. Player discretion is advised.</p>' : ''}
<ul class="gfacts" aria-label="Game facts"><li><b>Free</b><span>to play</span></li><li><b>#${g.catRank}</b><span>in ${esc(c.name)}</span></li><li><b>No</b><span>download</span></li><li><b>All</b><span>devices</span></li></ul>
<div class="gtags" aria-label="Tags">${g.tagList.map(t => `<a href="${m.tagBySlug.get(t.slug).url}">#${esc(t.name)}</a>`).join('')}</div>
<section class="card" aria-labelledby="s-g1"><h2 id="s-g1">About ${esc(g.name)}</h2>${about.map(p => `<p>${esc(p)}</p>`).join('')}${ct.highlights?.length ? `<h3>Highlights</h3><ul>${ct.highlights.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}${ct.goodFor ? `<h3>Who will enjoy it</h3><p>${esc(ct.goodFor)}</p>` : ''}</section>
<section class="card" aria-labelledby="s-g2"><h2 id="s-g2">How to play ${esc(g.name)}</h2>${ct.howToPlay ? `<p>${esc(ct.howToPlay)}</p>` : ''}<div class="ctl"><div><h3>📱 Touch controls</h3><p>${esc(hint)}.</p></div><div><h3>⌨️ Keyboard and mouse</h3><div class="keys">${(ct.keys || c.controls || []).map(k => `<span>${esc(k)}</span>`).join('')}</div></div></div>${ct.tips?.length ? `<h3>Tips</h3><ul>${ct.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}</section>
<section class="card" aria-labelledby="s-g4"><h2 id="s-g4">Game details</h2><dl class="dl"><dt>Category</dt><dd><a href="${c.url}">${esc(c.name)}</a></dd><dt>Tags</dt><dd>${g.tagList.map(t => `<a href="${m.tagBySlug.get(t.slug).url}">${esc(t.name)}</a>`).join(', ')}</dd>${g.developer ? `<dt>Developer</dt><dd>${esc(g.developer)}</dd>` : ''}<dt>Controls</dt><dd>${esc(g.inputNames.join(', '))}</dd><dt>Screen</dt><dd>${g.orientation === 'portrait' ? 'Portrait' : g.orientation === 'landscape' ? 'Landscape' : 'Any'}</dd><dt>Works on</dt><dd>Phone, tablet and desktop</dd><dt>Added</dt><dd>${fmtDate(g.addedAt)}</dd><dt>Price</dt><dd>Free</dd></dl></section>
<section class="card" aria-labelledby="s-g3"><h2 id="s-g3">${esc(g.name)} questions</h2>${faqHTML(faq)}</section>
<nav class="pn" aria-label="More in ${esc(c.name)}"><a href="${g.prev.url}"><span class="tile" style="display:block">${img(g.prev)}</span><span><small>← Previous in ${esc(c.name)}</small><b>${esc(g.prev.name)}</b></span></a><a href="${g.next.url}"><span class="tile" style="display:block">${img(g.next)}</span><span><small>Next in ${esc(c.name)} →</small><b>${esc(g.next.name)}</b></span></a></nav>
</div>
<aside class="asidebox" aria-label="More games">
<a class="nextc" href="${nx.url}"><span class="nt">${img(nx)}</span><span class="nb"><small>Up next</small><b>${esc(nx.name)}</b><span class="nm2">${esc(nx.cat.name)} · ${esc(nx.tags.slice(0, 2).join(', '))}</span><span class="btn btn-mint btn-sm">▶ Play next</span></span></a>
<section aria-labelledby="s-sim"><h2 id="s-sim">Similar games</h2>${g.related.slice(1, 8).map(rowl).join('')}</section>
<a class="btn btn-ghost" style="background:var(--surface);color:var(--ink);border-color:var(--line)" href="${c.url}">See all ${esc(gamesOfLower(c))} →</a>
</aside></article>
<div style="margin-top:30px">${c.games.length > 1 ? wrow(`More ${gamesOfLower(c)}`, c.games.filter(x => x !== g).slice(0, 6), c.url) : ''}${row('Players also liked', m.best.filter(x => x !== g && x.cat !== c).slice(0, 8), '/best/')}</div>`;
  const desc = ct.metaDescription || fitDesc(`Play ${g.name} free online. ${g.description} No download, works on mobile.`);
  return {
    path: g.url, top: '', side: 'cat:' + c.slug, ogType: 'website', noindex: g.tier === 'C',
    keywords: [g.name, `${g.name} online`, `play ${g.name} free`, ...g.tags.map(t => `${t.toLowerCase()} games`), gamesOfLower(c), 'free online games'].join(', '),
    title: ct.title || fitTitle(`${g.name}: Play Free Online`), desc,
    body, scripts: [assets.play], ogImage: g.thumb.generated ? null : g.thumb.url,
    ld: [
      crumbLD(B, [['Home', '/'], [gamesOf(c), c.url], [g.name, g.url]]),
      { '@type': 'WebPage', name: g.name, url: B + g.url, mainEntity: { '@type': 'Game', name: g.name, description: g.description, url: B + g.url, image: g.thumb.url.startsWith('http') ? g.thumb.url : B + g.thumb.url, genre: c.name, keywords: g.tags.join(', '), ...(g.developer ? { author: { '@type': 'Organization', name: g.developer } } : {}), isAccessibleForFree: true } },
      faqLD(faq)
    ]
  };
}

/* ---------------- search, saved, 404 ---------------- */
export const searchPage = m => ({
  path: '/search/', top: '', bottom: 'search', noindex: true, title: 'Search Games | EasyGameFun',
  desc: fitDesc('Search all free online games on EasyGameFun by name, category or tag. Find a game and start playing it in your browser right away.'),
  body: `<h1 class="shead">Search games</h1>
<div class="sbar"><form class="sform" role="search" action="/search/" method="get"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="sq" name="q" type="search" placeholder="Search ${m.games.length} free games" aria-label="Search games" autocomplete="off" enterkeyhint="search"><button type="button" class="sclear" id="sclear" aria-label="Clear search" hidden>✕</button></form>
<div class="chips sfilters" id="sfilters" role="group" aria-label="Filter results by category" hidden></div></div>
<p class="count" id="scount" aria-live="polite"></p>
<div id="sexplore"></div>
<div id="results"></div>
<noscript><p>Search needs JavaScript. Browse by category instead:</p><div class="chips">${m.cats.map(c => `<a class="chip" href="${c.url}">${c.emoji} ${esc(c.name)}</a>`).join('')}</div></noscript>`,
  ld: []
});

export const favsPage = m => ({
  path: '/favs/', top: '', side: 'favs', bottom: 'favs', noindex: true, title: 'Saved Games | EasyGameFun',
  desc: fitDesc('Your saved games on EasyGameFun. Tap the heart on any game page to keep it here. Saved games stay on this device only.'),
  body: `<h1 style="font-size:clamp(28px,5vw,38px);margin-bottom:16px">Saved games</h1><div id="favlist"><div class="empty"><b>Nothing saved yet</b>Tap the heart on any game page to keep it here.</div></div>`,
  ld: []
});

export const notFoundPage = m => ({
  path: null, file: '404.html', noindex: true, title: 'Page Not Found | EasyGameFun',
  desc: fitDesc('This page does not exist on EasyGameFun. It may have moved or the game may have been removed. Try one of our popular free games instead.'),
  body: `<div class="empty"><h1 style="font-size:clamp(26px,5vw,36px);margin-bottom:8px">That page does not exist</h1><p style="margin-bottom:16px">The game may have moved or been removed. Try one of our popular games instead.</p><a class="btn btn-pri" href="/">Back to games</a></div>${row('Popular right now', m.trending.slice(0, 10), '/trending/')}`,
  ld: []
});
