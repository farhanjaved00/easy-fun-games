// Small shared helpers for the build. No dependencies.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

export const slugify = s => String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// JSON for <script type="application/ld+json">, safe against "</script>".
export const ldJson = v => JSON.stringify(v).replace(/</g, '\\u003c');

export const chunk = (list, size) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out.length ? out : [[]];
};

// Category display names: "Puzzle" -> "Puzzle games", ".io Games" stays as is.
export const gamesOf = c => (/games$/i.test(c.name) ? c.name : c.name + ' games');
export const gamesOfLower = c => gamesOf(c).toLowerCase();
export const GamesOf = c => (/games$/i.test(c.name) ? c.name : c.name + ' Games');
export const shortCat = c => c.name.replace(/\s*games$/i, '');

// Fit a meta description into 140-155 characters by adding stock sentences or trimming.
const FILLERS = ['No download, no sign-up.', 'Works on phone, tablet and PC.', 'New games every day.', 'Free to play.'];
export function fitDesc(text) {
  let d = text.replace(/\s+/g, ' ').trim();
  // Too long: drop whole sentences from the end first.
  while (d.length > 155) {
    const cut = d.slice(0, -1).lastIndexOf('. ');
    if (cut < 60) break;
    d = d.slice(0, cut + 1);
  }
  for (const f of FILLERS) {
    if (d.length >= 140) break;
    if (!d.includes(f) && (d + ' ' + f).length <= 155) d += ' ' + f;
  }
  if (d.length > 155) {
    d = d.slice(0, 154);
    d = d.slice(0, d.lastIndexOf(' ')).replace(/[,.;:!?-]+$/, '') + '…';
  }
  return d;
}

// Page titles under 60 characters. `tail` (like ": Page 2") is always kept so titles stay unique.
export function fitTitle(main, tail = '', suffix = ' | EasyGameFun') {
  const short = main.split(':')[0];
  for (const t of [main + tail + suffix, short + tail + suffix, main + tail, short + tail]) if (t.length <= 60) return t;
  return short.slice(0, 59 - tail.length).trimEnd() + '…' + tail;
}

export const fmtDate = iso => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
