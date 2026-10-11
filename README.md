# EasyGameFun

Static site for [easygamefun.com](https://easygamefun.com): free online games, embedded from a game partner.
Every page is pre-built HTML (fast, good for SEO). No server, no database, no dependencies.

## Commands

| Command | What it does |
|---|---|
| `npm run build` | Builds the site into `dist/` (about 6 seconds for 5,000 games) |
| `npm run check` | Checks `dist/`: one H1, unique titles and descriptions, canonicals, schema, broken links, sitemaps, file count, size budgets |
| `npm test` | Build + check |
| `npm run serve` | Preview `dist/` at http://localhost:8080 |
| `node scripts/make-icons.mjs` | Re-render icons and the social image from `brand/` (needs Chrome; only when the logo changes) |

Node 20 or newer. Nothing to install.

## Folders

```
data/        Source of truth: site settings, categories, games, collections (see data/README.md)
src/build.mjs        The generator
src/lib/             Data model, layout, page templates
src/assets/          CSS and browser JavaScript (file names get a content hash at build)
src/static/          Copied as-is: fonts, icons, favicon
brand/       Logo source SVGs
scripts/     check, serve, IndexNow ping, icon maker
.github/workflows/   ci.yml (checks on pull requests), deploy.yml (deploy to Cloudflare Pages)
```

## How deploys work

`deploy.yml` runs on every push to `main`, every day at 03:17 UTC, and on demand (Actions tab > Deploy > Run workflow).
It builds, runs every check, and only then uploads to Cloudflare Pages. A failed check means nothing is deployed and the old site stays live.
It also compares the game count with the live site and stops if more than 5% of games would disappear (a likely partner feed problem).

## Pages

| URL | Page |
|---|---|
| `/` | Home |
| `/game/{slug}/` | Game page |
| `/category/{slug}/`, `/category/{slug}/page/2/` | Category, 48 games per page |
| `/tag/{slug}/` | Tag (noindex below 8 games) |
| `/collection/{slug}/` | Curated collection |
| `/games/`, `/games/{letter}/` | A to Z hub and letter pages |
| `/new/`, `/trending/`, `/best/`, `/cats/` | Lists and category index |
| `/search/`, `/favs/` | Search and saved games (noindex, built in the browser) |
| `/about/`, `/contact/`, `/privacy/`, `/terms/`, `/copyright/` | Company and legal |

## Important settings (`data/site.json`)

- `indexing`: **false** until real partner games are in `data/games.json`. While false, every page is `noindex`, a "Preview site" bar shows, and no sitemap is announced. Set it to `true` to launch.
- `promo` and `seasonal`: the top announcement bar and the seasonal home row, each with an `until` date.
- `editorPicks`, `spotlights`: home page choices.

## Game records

The demo mini-games (`src/assets/demo.js`) run only when a game has no `embedUrl`. When the partner feed is connected, each game gets an `embedUrl` and the partner game loads in a sandboxed iframe after the player taps Play. Check the partner's required iframe `sandbox` and `allow` values in `src/assets/play.js` before launch.

No fake numbers: the site shows no ratings, votes or play counts, and the schema has no `aggregateRating`. `popularity` is used only for sorting.

## Before adding ads

The Content Security Policy in `src/build.mjs` allows only this site, Cloudflare Web Analytics, and HTTPS iframes and images. An ad network needs its script domains added there, plus an `ads.txt` file in `src/static/`.
