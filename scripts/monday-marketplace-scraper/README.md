# monday.com marketplace scraper

Standalone tool (not part of the pnpm workspace) that downloads the fully
rendered HTML of every app listing page on the monday.com marketplace.

Three phases:
1. **Discover** — fetch monday.com's marketplace sitemap and build a
   manifest of every app URL.
2. **Scrape** — render each app page with headless Chromium (the pages are
   client-side rendered, so a plain HTTP fetch returns an empty shell) and
   save the HTML to disk.
3. **Audit** — re-validate saved HTML and re-queue anything unusable.

## What counts as a success

A page is only recorded as `success` when the **launched date** is present.
Installs count and categories are extracted and saved when available but not
required — some listings, mostly monday.com's own first-party apps (e.g.
`word-cloud`, `online-docs`), render the "Categories" heading with an empty
chip list and no installs count at all, so gating on either just produced
endless unproductive retries against pages with nothing more to load.

This is stricter than "the request returned 200", deliberately. Two failure
modes produce a perfectly normal-looking response:

- **Anti-bot interstitial.** monday.com serves a "Suspicious activity
  detected" page with a 200 status when it rate-limits an IP.
- **Partial render.** The SPA mounts its shell and some metadata, but the
  panel never finishes. The categories block renders last, so it is the
  field most often missing.

Both were common in the first full run: of 1005 saved files, 468 were the
interstitial, 402 were partially rendered, and only 135 were usable.

## Rate limiting

The scraper runs **one page at a time** with a 5–12 second gap by default.
`--concurrency` is no longer supported — parallel tabs are what triggered
the block.

If the interstitial is detected the run **stops immediately** rather than
burning through the remaining queue against a blocked IP. Wait for the
limit to clear (typically hours), then resume with a longer gap:

```bash
node scrape.mjs --delay-min=15000 --delay-max=30000
```

## Setup

```bash
cd scripts/monday-marketplace-scraper
npm install
npx playwright install chromium
```

## Usage

```bash
# 1. Discover all app URLs (writes/merges manifest.json)
node discover.mjs

# 2. Check what the saved files actually contain
node audit.mjs --dry-run

# 3. Scrape a handful first to sanity check
node scrape.mjs --limit=5

# 4. Scrape everything (resumable — safe to Ctrl-C and re-run)
node scrape.mjs
```

Output:
- `manifest.json` — one entry per app: `{ id, slug, url, status, attempts, filePath, scrapedAt, error, missing, data }`
- `output/html/{id}-{slug}.html` — rendered HTML per app

`status` is one of `pending`, `success`, `incomplete`, `blocked`, `failed`.
Everything except `success` is picked up again by the next `node scrape.mjs`.
On success, `data` holds the extracted `{ installs, launched, categories }`,
which is a useful cross-check before the separate parsing step.

## Flags for `scrape.mjs`

| Flag                  | Effect                                                         |
|-----------------------|----------------------------------------------------------------|
| `--limit=N`           | Only process the first N queued entries                        |
| `--delay-min=MS`      | Minimum gap between requests (default `5000`)                  |
| `--delay-max=MS`      | Maximum gap between requests (default `12000`)                 |
| `--force`             | Re-scrape everything, including already-`success` entries      |
| `--retry-failed`      | Only re-attempt entries currently marked `failed`               |
| `--retry-incomplete`  | Only re-attempt entries currently marked `incomplete`           |
| `--retry-blocked`     | Only re-attempt entries currently marked `blocked` — wait for the rate limit to clear first (see Rate limiting above) |

`--retry-*` flags are combinable (e.g. `--retry-failed --retry-incomplete`
retries both). With none passed, the default queue is everything not yet
`success` (`pending`, `failed`, `incomplete`, and `blocked`). If a run's
queue ends up empty, it prints the manifest's status breakdown so it's clear
whether that's because everything succeeded or just because the flags you
passed don't match anything.

Every 20 completions the run also prints a progress summary — elapsed time,
pages/min, and an ETA for the remaining queue — in addition to the per-page
`[n/total] STATUS url` line.

## `audit.mjs`

Re-validates every already-saved file against the rules above and rewrites
manifest statuses, so a re-run fetches only what is actually bad. Use
`--dry-run` to report without writing.

Re-running `node discover.mjs` later will pick up any new apps added to the
marketplace without resetting progress on already-scraped ones.
