# Data

Source of truth for the site. The build reads these files.

| File | What it holds |
|---|---|
| `site.json` | Site settings. `indexing: false` keeps every page `noindex` until real games are live. |
| `categories.json` | Categories with intro text, FAQ and controls. |
| `games.json` | Game records (the daily pipeline will write this file). |
| `collections.json` | Curated collections. A `rule` picks games by `tag` or `category`. |
| `overrides.json` | Manual fixes by game slug, e.g. `{ "sky-hopper": { "name": "Sky Hopper Deluxe" } }`. The pipeline never overwrites this file. |
| `removed.json` | Removed games: `[{ "slug": "old-game", "to": "/category/puzzle/" }]`. Each becomes a 301 redirect. |

Game `status` must be `published` to appear. `quality.score` sets the tier: A is 75+, B is 50 to 74, C is below 50 (C pages are `noindex` and left out of the sitemap).
