// Page templates. Each returns { path, title, desc, body, ld, ... } for layout().
import { esc, chunk, fitDesc, fitTitle, fmtDate, gamesOf, gamesOfLower, GamesOf, shortCat } from './util.mjs';
import { img } from './layout.mjs';
import { HINT } from './data.mjs';
import { tile, sortTile, wcard, rowl, row, wrow, crumbs, faqHTML, pager, hofBlock, catCards, collSection, relatedCats, floaters, crumbLD, faqLD, listLD } from './blocks.mjs';

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
  const feat = [...m.games.filter(g => g.featured), ...m.games].filter((g, i, l) => l.indexOf(g) === i).slice(0, 4);
  const picks = [...(m.site.editorPicks || []).map(s => m.bySlug.get(s)).filter(Boolean), ...m.best].filter((g, i, l) => l.indexOf(g) === i).slice(0, 8);
  const featJson = esc(JSON.stringify(feat.map(g => [g.url, g.name, g.cat.name, g.thumb.url])));
  const tabs = m.cats.filter(c => c.games.length);
  const relax = m.tagBySlug.get('relaxing');
  const season = m.seasonal && m.games.filter(g => g.tags.includes(m.seasonal.tag));
  const az = m.az.slice(0, 32);

  const body = `<section class="hero" aria-labelledby="h1"><canvas id="hc" aria-hidden="true" data-emoji="${esc(m.games.slice(0, 30).map(g => g.emoji).join(' '))}"></canvas>
<div><span class="eyebrow"><i class="live-dot"></i>${N} free games · new every day</span>
<h1 id="h1">Play free online games <em>instantly</em></h1>
<p class="lead">No download and no sign-up. Puzzle, racing, shooter, .io and 2 player games that run on your phone, tablet or computer.</p>
<a class="hsearch" href="/search/" data-focus-search>${SEARCH_ICON}Search ${N} free games</a>
<div class="cta-row"><a class="btn btn-mint" href="/trending/">▶ Start playing</a><button class="btn btn-ghost js-only" data-rnd>🎲 Surprise me</button></div>
<ul class="trust"><li>100% free</li><li>No download</li><li>Works on mobile</li><li>New games daily</li></ul></div>
<div><a class="fl" id="fl" href="${feat[0].url}" aria-label="Play ${esc(feat[0].name)}" data-feat="${featJson}">${img(feat[0], '', true)}<span class="pill-live">FEATURED</span><span class="lb"><span><b id="fl-n">${esc(feat[0].name)}</b><small id="fl-c">${esc(feat[0].cat.name)}</small></span><span class="pb play-btn" style="min-height:40px;padding:0 16px;font-size:15px">Play ▶</span></span></a>
<div class="fdots js-only" id="fdots" role="group" aria-label="Featured games">${feat.map((g, i) => `<button aria-label="Show ${esc(g.name)}"${i ? '' : ' class="on"'}></button>`).join('')}</div></div>
</section>
<nav class="quick" aria-label="Browse categories">${m.cats.map(c => `<a href="${c.url}">${c.emoji} ${esc(c.name)}</a>`).join('')}<a href="/new/">🆕 New</a><a href="/trending/">🔥 Trending</a><a href="/best/">🏆 Best ever</a></nav>
<section class="stats" aria-label="EasyGameFun in numbers"><div class="stat"><b>${N}</b><span>free games</span></div><div class="stat"><b>${m.cats.length}</b><span>categories</span></div><div class="stat"><b>${m.collections.length}</b><span>collections</span></div><div class="stat"><b>0</b><span>downloads needed</span></div></section>
<section class="sec" aria-labelledby="s-live"><div class="sec-h"><div><h2 id="s-live">Popular right now</h2><p class="sub">The most played games this week. Tap any card to play.</p></div><a href="/trending/">See all</a></div><div class="live">${m.trending.slice(0, 8).map(g => `<a class="lv" href="${g.url}" aria-label="Play ${esc(g.name)}">${img(g)}<span class="lb"><span><b>${esc(g.name)}</b><small>${esc(g.cat.name)}</small></span><span class="pb">Play ▶</span></span></a>`).join('')}</div></section>
<section class="sec" aria-labelledby="s-ed"><div class="sec-h"><div><h2 id="s-ed">Editor's picks</h2><p class="sub">Hand-picked games to start with today.</p></div><a href="/best/">See all</a></div><div class="bento">${picks.map((g, i) => tile(g, i === 0 ? 'xl' : i === 5 ? 'wd' : '')).join('')}</div></section>
<div id="personal"></div>` +
    wrow('New games', m.newest.slice(0, 6), '/new/', 'The latest games on EasyGameFun.') +
    `<section class="sec" aria-labelledby="s-tab"><div class="sec-h"><h2 id="s-tab">Trending by category</h2><a href="/cats/">All categories</a></div><div class="tabs js-only" id="tabs" role="tablist" aria-label="Choose a category">${tabs.map((c, i) => `<button role="tab" id="tab-${c.slug}" aria-controls="tp-${c.slug}" aria-selected="${i ? 'false' : 'true'}"${i ? ' tabindex="-1"' : ' class="on"'}>${c.emoji} ${esc(c.name)}</button>`).join('')}</div>` +
    tabs.map((c, i) => `<div class="hs" role="tabpanel" id="tp-${c.slug}" aria-labelledby="tab-${c.slug}"${i ? ' hidden' : ''}>${c.games.slice(0, 8).map(g => tile(g)).join('')}</div>`).join('') + `</section>` +
    spot(m, m.site.spotlights?.[0]) +
    `<section class="sec" aria-labelledby="s-hof"><div class="sec-h"><div><h2 id="s-hof">Best games of all time</h2><p class="sub">Ranked by our editors' score and how often each game is played.</p></div><a href="/best/">Full ranking</a></div>${hofBlock(m.best, 6)}</section>` +
    collSection(m) + catCards(m) + spot(m, m.site.spotlights?.[1]) +
    row('Top rated games', m.best.slice(0, 10), '/best/') +
    `<section class="cta js-only"><div><h2>Can't decide what to play?</h2><p>Let us pick a random game for you. It takes one tap.</p></div><button class="play-btn" data-rnd>🎲 Surprise me</button></section>` +
    (season && season.length >= 3 ? wrow(m.seasonal.title, season.slice(0, 6), m.collections.find(c => c.rule.tag === m.seasonal.tag)?.url || null, m.seasonal.sub) : '') +
    (relax && relax.games.length >= 3 ? row('Relax and unwind', relax.games.slice(0, 8), m.collections.find(c => c.rule.tag === 'Relaxing')?.url || relax.url) : '') +
    `<section class="sec" aria-labelledby="s-az"><div class="sec-h"><h2 id="s-az">All games A to Z</h2><a href="/games/">See all</a></div><div class="icons">${az.map(g => `<a class="ico" href="${g.url}" aria-label="Play ${esc(g.name)}"><span class="tile">${img(g)}</span><b>${esc(g.name)}</b></a>`).join('')}</div></section>
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
    path: '/', top: 'home', title: 'EasyGameFun: Free Online Games to Play Now (No Download)',
    desc: fitDesc('Play free online games on your phone or computer. Puzzle, racing, shooter, .io, 2 player and kids games. New games every day. No download.'),
    body, scripts: [],
    ld: [
      { '@type': 'Organization', name: 'EasyGameFun', url: B + '/', logo: B + '/icons/icon-512.png', email: m.site.email },
      { '@type': 'WebSite', name: 'EasyGameFun', url: B + '/', potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: B + '/search/?q={search_term_string}' }, 'query-input': 'required name=search_term_string' } },
      faqLD(HOME_FAQ), listLD(B, 'New games', m.newest.slice(0, 10))
    ]
  };
}

function spot(m, slug) {
  const c = m.catBySlug.get(slug);
  if (!c || !c.games.length) return '';
  const l = [...c.games].sort(m.sorters.byBest).slice(0, 4);
  const more = l.length < 4 ? `<a class="tile more" href="${c.url}"><span>＋</span><b>More ${esc(c.name)}</b></a>` : '';
  return `<section class="spot" style="--a:${c.colors[0]};--b:${c.colors[1]}" aria-labelledby="sp-${c.slug}"><div><span class="eyebrow">${c.emoji} Category spotlight</span><h2 id="sp-${c.slug}">${esc(gamesOf(c))}</h2><p>${esc(c.intro.split('. ')[0])}.</p><a class="btn btn-ghost" href="${c.url}">See all ${c.games.length} games →</a></div><div class="spot-r">${l.map(g => tile(g)).join('')}${more}</div></section>`;
}

/* ---------------- categories ---------------- */
export function catsIndex(m) {
  const B = m.site.baseUrl;
  const body = `${crumbs([['Home', '/'], ['Categories', '']])}
<section class="chero" style="--a:#7B5CFF;--b:#FF3F6C">${floaters(m.games)}<div><h1>Game categories</h1><p>Pick a style and start playing. Every category has free games that load fast on phone and computer.</p><div class="facts"><span>${m.cats.length} categories</span><span>${m.games.length} games</span><span>Free</span></div></div></section>
<div class="cpgrid">${m.cats.map(c => `<a class="cpanel" href="${c.url}" style="--a:${c.colors[0]};--b:${c.colors[1]}"><span class="ci" aria-hidden="true">${c.emoji}</span><span class="cb2"><b>${esc(gamesOf(c))}</b><span class="cd">${esc(c.intro.split('. ')[0])}.</span><span class="cth">${c.games.slice(0, 4).map(g => `<span class="tile">${img(g)}</span>`).join('')}<em>${c.games.length} games →</em></span></span></a>`).join('')}</div>
<div style="margin-top:34px">${collSection(m)}</div>
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
    ...c.faq,
    { q: `Can I play ${gamesOfLower(c)} on my phone?`, a: 'Yes. Every game in this category works on phones, tablets, and computers.' }
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
<a class="cfeat" href="${top.url}" aria-label="Play ${esc(top.name)}">${img(top, '', true)}<span class="badge2">⭐ Top pick</span><span class="lb"><span><b>${esc(top.name)}</b><small>${esc(top.tags.slice(0, 2).join(' · '))}</small></span><span class="play-btn" style="min-height:42px;padding:0 18px;font-size:15px">Play ▶</span></span></a></section>
<nav class="chips subnav" aria-label="Other categories">${m.cats.map(x => `<a class="chip${x === c ? ' on' : ''}" href="${x.url}"${x === c ? ' aria-current="page"' : ''}>${x.emoji} ${esc(x.name)}</a>`).join('')}</nav>
${best.length >= 3 ? `<section class="sec" aria-labelledby="s-top3"><div class="sec-h"><div><h2 id="s-top3">Best ${esc(gamesOfLower(c))}</h2><p class="sub">Our editors' top ${esc(gamesOfLower(c))} right now.</p></div></div><div class="wrow">${best.slice(0, 3).map((g, k) => wcard(g, k + 1)).join('')}</div></section>` : ''}
${toolbar('All ' + gamesOfLower(c), list.length, c.games.length, tags)}
${gridOf(list)}
${pager(c.url, n, pages.length)}
<section class="card" aria-labelledby="s-ab"><h2 id="s-ab">About ${esc(gamesOfLower(c))}</h2>
<p>${esc(c.intro)} EasyGameFun has ${c.games.length} free ${esc(gamesOfLower(c))} right now, including ${c.games.slice(0, 3).map(g => `<a href="${g.url}">${esc(g.name)}</a>`).join(', ')}. Our top pick is <a href="${top.url}">${esc(top.name)}</a>.</p>
<h3>Why people like ${esc(gamesOfLower(c))}</h3><ul>${c.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul>
<h3>How to pick one</h3><p>Sort by Top rated to find the best games first, or use the tags above to narrow down by style, like ${esc(tags.slice(0, 3).map(t => t.name).join(', ').toLowerCase())}.</p></section>
<section class="card" aria-labelledby="s-q"><h2 id="s-q">${esc(shortCat(c))} game questions</h2>${faqHTML(faq)}</section>
${relatedCats(m, c.slug)}
<div style="margin-top:30px">${wrow('You might also like', m.best.filter(g => g.cat !== c).slice(0, 6), '/best/')}</div>`;
    } else {
      body = `<section class="chero" style="--a:${c.colors[0]};--b:${c.colors[1]}">${floaters(list)}<div>${crumbs(crumbItems)}<h1>Free ${esc(gamesOf(c))}: page ${n}</h1><p>More free ${esc(gamesOfLower(c))}, sorted by popularity. Page ${n} of ${pages.length}.</p><div class="facts"><span>${c.games.length} games</span><span>Free</span></div></div></section>
${toolbar(`${gamesOf(c)}, page ${n}`, list.length, c.games.length, pageTags(list))}
${gridOf(list)}
${pager(c.url, n, pages.length)}
${relatedCats(m, c.slug)}`;
    }
    return {
      path, top: 'cats', side: 'cat:' + c.slug, bottom: 'cats',
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
  base: c.url, h1: c.name, titleText: `${c.name}: Hand-Picked Free Games`,list: c.games, colors: c.colors, intro: c.intro,
  metaDesc: `${c.intro} ${c.games.length} free games, hand-picked by EasyGameFun.`,
  crumbsBase: [['Home', '/'], ['Categories', '/cats/']]
});

/* ---------------- lists: new, trending, best ---------------- */
function simpleList(m, { path, key, h1, intro, list, colors, title, desc }) {
  const B = m.site.baseUrl;
  const body = `<section class="chero" style="--a:${colors[0]};--b:${colors[1]}">${floaters(list)}<div>${crumbs([['Home', '/'], [h1, '']])}<h1>${esc(h1)}</h1><p>${esc(intro)}</p><div class="facts"><span>${list.length} games</span><span>Free</span></div></div></section>
<div class="grid">${list.map((g, i) => tile(g, i === 0 && list.length >= 3 ? 'big' : '')).join('')}</div>
${relatedCats(m, '')}`;
  return { path, top: key, side: key, title, desc: fitDesc(desc), body, ld: [crumbLD(B, [['Home', '/'], [h1, path]]), listLD(B, h1, list)] };
}

export const newPage = m => simpleList(m, {
  path: '/new/', key: 'new', h1: 'New games', colors: ['#FF3F6C', '#7B5CFF'], list: m.newest.slice(0, m.site.listLimit),
  intro: 'The newest free games on EasyGameFun, added every day.', title: 'New Free Online Games | EasyGameFun',
  desc: 'The newest free online games on EasyGameFun, added every day. Be the first to play them in your browser on phone, tablet or computer.'
});

export const trendingPage = m => simpleList(m, {
  path: '/trending/', key: 'trending', h1: 'Trending games', colors: ['#FF8A00', '#FF3F6C'], list: m.trending.slice(0, m.site.listLimit),
  intro: 'The most played free games on EasyGameFun right now.', title: 'Trending Free Online Games | EasyGameFun',
  desc: 'The most played free online games on EasyGameFun right now. See what everyone is playing and jump in with one tap.'
});

export function bestPage(m) {
  const B = m.site.baseUrl, l = m.best.slice(0, m.site.listLimit);
  const body = `<section class="chero" style="--a:#FFB800;--b:#FF3F6C">${floaters(l)}<div>${crumbs([['Home', '/'], ['Best games of all time', '']])}<h1>Best games of all time</h1><p>The most loved free games on EasyGameFun, ranked by our editors' score and how often each game is played. Start at number one and work your way down.</p><div class="facts"><span>${l.length} games ranked</span><span>Free</span></div></div></section>
${hofBlock(l, 6)}
${l.length > 6 ? `<section class="sec" style="margin-top:30px" aria-labelledby="s-full"><div class="sec-h"><h2 id="s-full">Full ranking</h2></div><div class="rank off" style="counter-reset:r 6">${l.slice(6).map(g => `<a href="${g.url}"><span class="tile" style="display:block">${img(g)}</span><span class="rt"><b>${esc(g.name)}</b><span>${esc(g.cat.name)} · ${esc(g.tags.slice(0, 2).join(', '))}</span></span><span class="go">Play ▶</span></a>`).join('')}</div></section>` : ''}
${relatedCats(m, '')}`;
  return {
    path: '/best/', top: 'best', side: 'best', title: 'Best Online Games of All Time | EasyGameFun',
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
${[...m.letters].map(([l, list]) => `<section class="sec" aria-labelledby="az-${l}"><div class="sec-h"><h2 id="az-${l}">${letterLabel(l)}</h2><a href="/games/${l}/">All ${list.length} games</a></div><div class="icons">${list.slice(0, 8).map(g => `<a class="ico" href="${g.url}" aria-label="Play ${esc(g.name)}"><span class="tile">${img(g)}</span><b>${esc(g.name)}</b></a>`).join('')}</div></section>`).join('')}`;
  return {
    path: '/games/', top: '', side: 'az', title: 'All Free Games A to Z | EasyGameFun',
    desc: fitDesc(`Browse all ${m.games.length} free online games on EasyGameFun from A to Z. Find any game by name and play it in your browser.`),
    body, ld: [crumbLD(B, [['Home', '/'], ['All games A to Z', '/games/']])]
  };
}

export const azLetterPages = (m, l, list) => listPages(m, {
  base: `/games/${l}/`, h1: `Games starting with ${letterLabel(l)}`, titleText: `Free Games Starting With ${letterLabel(l)}`, list, colors: ['#2F9BFF', '#6C4DFF'], side: 'az',
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
    `<div class="ov" id="ov">${img(g, 'bg', true)}${g.thumb.generated ? `<div class="em" aria-hidden="true">${g.emoji || '🎮'}</div>` : ''}<div class="ovt">${esc(g.name)}</div><small>${esc(hint)}</small><button class="btn btn-mint js-only" id="go">▶ Play now</button><noscript><small>Turn on JavaScript to play this game.</small></noscript></div></div>`;
  const body = `${crumbs([['Home', '/'], [gamesOf(c), c.url], [g.name, '']])}
<article class="gp"><div class="gmain">
${player}
<div class="gbar"><h1>${esc(g.name)}</h1><div class="acts js-only">
<button class="pill fav" id="fav" aria-pressed="false">🤍 Save</button>
<button class="pill" id="share">🔗 Share</button>
<button class="pill" id="fs">⛶ Fullscreen</button>
<a class="pill" href="/contact/#report" aria-label="Report a problem with this game">⚠ Report</a></div></div>
${g.mature ? '<p class="advisory" role="note">⚠ Content notice: this game includes mature elements such as intense action or strong language. Player discretion is advised.</p>' : ''}<div class="meta"><a href="${c.url}">${c.emoji} ${esc(c.name)}</a><span>Free</span><span>Added ${fmtDate(g.addedAt)}</span>${g.developer ? `<span>By ${esc(g.developer)}</span>` : ''}</div>
<div class="chips" style="padding:12px 0 0;margin:0;flex-wrap:wrap;overflow:visible">${g.tagList.map(t => `<a class="chip" href="${m.tagBySlug.get(t.slug).url}">${esc(t.name)}</a>`).join('')}</div>
<div class="gstats"><div class="stat"><b>Free</b><span>to play</span></div><div class="stat"><b>#${g.catRank}</b><span>in ${esc(c.name)}</span></div><div class="stat"><b>0</b><span>downloads needed</span></div><div class="stat"><b>All</b><span>phone, tablet, PC</span></div></div>
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
    title: ct.title || fitTitle(`${g.name}: Play Free Online`), desc,
    body, scripts: [assets.play], ogImage: g.thumb.generated ? null : g.thumb.url,
    ld: [
      crumbLD(B, [['Home', '/'], [gamesOf(c), c.url], [g.name, g.url]]),
      { '@type': 'VideoGame', name: g.name, description: g.description, url: B + g.url, image: g.thumb.url.startsWith('http') ? g.thumb.url : B + g.thumb.url, genre: c.name, keywords: g.tags.join(', '), gamePlatform: ['Web browser', 'Mobile', 'Desktop'], applicationCategory: 'Game', operatingSystem: 'Any', ...(g.developer ? { author: { '@type': 'Organization', name: g.developer } } : {}), offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' } },
      faqLD(faq)
    ]
  };
}

/* ---------------- search, saved, 404 ---------------- */
export const searchPage = m => ({
  path: '/search/', top: '', bottom: 'search', noindex: true, title: 'Search Games | EasyGameFun',
  desc: fitDesc('Search all free online games on EasyGameFun by name, category or tag. Find a game and start playing it in your browser right away.'),
  body: `<h1 style="font-size:clamp(28px,5vw,38px);margin-bottom:6px">Search games</h1>
<form class="search" role="search" action="/search/" method="get" style="display:block;max-width:560px;margin:10px 0 6px"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="sq" name="q" type="search" placeholder="Try race, puzzle or cute" aria-label="Search games" autocomplete="off" enterkeyhint="search"></form>
<p class="count" id="scount" aria-live="polite"></p><div id="results" style="margin-top:14px"></div>
<noscript><p>Search needs JavaScript. Browse by category instead:</p></noscript>
<div class="sr-chips" id="srbrowse"><div class="chips">${m.cats.map(c => `<a class="chip" href="${c.url}">${c.emoji} ${esc(c.name)}</a>`).join('')}${m.collections.map(c => `<a class="chip" href="${c.url}">${esc(c.name)}</a>`).join('')}</div></div>`,
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

/* ---------------- static pages ---------------- */
export function staticPages(m) {
  const B = m.site.baseUrl, mail = esc(m.site.email);
  const P = [
    ['about', 'About EasyGameFun', 'About Us | EasyGameFun', 'EasyGameFun is a free online games site. We pick fun, fast games that run in your browser on phone, tablet and computer, with nothing to install.',
      `<h1>About EasyGameFun</h1><p>EasyGameFun is a free online games site. Our goal is simple: let you start playing in a few seconds, on any device, with nothing to install.</p><h2>How we choose games</h2><p>Every game is checked to make sure it loads, works with touch and keyboard, and is clear about how to play. We add new games every day and remove games that stop working.</p><h2>Free to play</h2><p>All games on EasyGameFun are free. You do not need an account. Your saved games are stored on your own device.</p><h2>Game creators</h2><p>If you make games and want to share them with players, <a href="/contact/#submit">contact us</a>.</p>`],
    ['contact', 'Contact us', 'Contact Us | EasyGameFun', 'Contact the EasyGameFun team for questions, game submissions, feedback, problem reports or copyright requests. We read every message.',
      `<h1>Contact us</h1><p>We read every message. Use the address below for questions, feedback, game submissions and business requests.</p><h2>Email</h2><p><a href="mailto:${mail}">${mail}</a></p><h2 id="report">Report a problem</h2><p>If a game does not load, tell us the game name, your device and your browser. This helps us fix it quickly.</p><h2 id="submit">Submit your game</h2><p>Send us a link to your game and a short description. We reply if it is a good fit.</p><h2>Copyright</h2><p>For copyright requests, see our <a href="/copyright/">copyright page</a>.</p>`],
    ['privacy', 'Privacy policy', 'Privacy Policy | EasyGameFun', 'How EasyGameFun handles your data: what we store on your device, privacy-friendly analytics, cookies, embedded games and your choices.',
      `<h1>Privacy policy</h1><p>This page explains what data EasyGameFun uses and why.</p><h2>Data stored on your device</h2><p>Saved games, recently played games and your theme choice are stored in your browser. They never leave your device and you can clear them in your browser settings.</p><h2>Analytics</h2><p>We use privacy-friendly analytics that do not use cookies, to understand which pages are popular and how fast they load.</p><h2>Embedded games</h2><p>Games are provided by game partners and load inside a frame on our pages only after you press Play. The partner may use its own cookies or ads inside the game, under its own privacy policy.</p><h2>Advertising</h2><p>If we show ads in the future, our ad partners may use cookies to show relevant ads, based on your consent choices. We will update this page first.</p><h2>Children</h2><p>EasyGameFun is a general audience site. We do not knowingly collect personal information from children.</p><h2>Contact</h2><p>Questions about privacy? <a href="/contact/">Contact us</a>.</p>`],
    ['terms', 'Terms of use', 'Terms of Use | EasyGameFun', 'The rules for using EasyGameFun: acceptable use, game content from partners, availability of the site and games, and the limits of our liability.',
      `<h1>Terms of use</h1><p>By using EasyGameFun you agree to these terms.</p><h2>Using the site</h2><p>You may play games for personal, non-commercial use. Do not try to break, copy or overload the site.</p><h2>Game content</h2><p>Games belong to their creators and publishers. Names and trademarks belong to their owners.</p><h2>Availability</h2><p>We may change or remove games and features at any time. We do not promise the site will always be available.</p><h2>Contact</h2><p>Questions about these terms? <a href="/contact/">Contact us</a>.</p>`],
    ['copyright', 'Copyright (DMCA)', 'Copyright and DMCA | EasyGameFun', 'How to report copyright concerns about content on EasyGameFun, what to include in your notice, and how we review and respond to each request.',
      `<h1>Copyright (DMCA)</h1><p>We respect the rights of game creators. If you believe a game on EasyGameFun uses your work without permission, send us a notice.</p><h2>What to include</h2><ul><li>Your name and contact details</li><li>The page address (URL) of the game</li><li>A description of your work and how it is used without permission</li><li>A statement that you are the owner or are allowed to act for the owner</li></ul><h2>What happens next</h2><p>We review each notice quickly and remove content when needed. Email your notice to <a href="mailto:${mail}">${mail}</a>.</p>`]
  ];
  return P.map(([slug, crumb, title, desc, html]) => ({
    path: `/${slug}/`, title, desc: fitDesc(desc),
    body: `${crumbs([['Home', '/'], [crumb, '']])}<article class="card prose" style="margin-top:0">${html}</article>`,
    ld: [crumbLD(B, [['Home', '/'], [crumb, `/${slug}/`]])]
  }));
}
