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
| `npm run import -- --count 3` | Import new games from onlinegames.io with AI-written pages (needs `ANTHROPIC_API_KEY`) |
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

## Daily game import

`scripts/import-onlinegames.mjs` runs inside `deploy.yml` every day and imports 3 new games from
[onlinegames.io's embeddable list](https://www.onlinegames.io/t/embeddable-games-for-websites/). For each game it:

1. Checks the game page carries the **Embeddable** tag (others are skipped), and skips games marked as mature content or named after other companies' trademarks.
2. Reads the facts (name, embed URL, image, tags, description, controls) and saves the thumbnail in `src/static/thumbs/`.
3. Asks Claude (`claude-opus-5-5`) to write original page text from those facts only.
4. Checks the text: lengths, no banned claims, and no more than 8% of 6-word phrases shared with the source. Up to 3 tries, then the game is skipped.
5. Adds it to `data/games.json`. `data/sources/onlinegames.json` remembers what was imported or skipped.

Needs the `ANTHROPIC_API_KEY` repository secret; without it the import does nothing and the site still deploys.
Run it by hand: Actions > Deploy > Run workflow, and set how many games to import.

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
