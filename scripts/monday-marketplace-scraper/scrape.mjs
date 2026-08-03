import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { validatePage } from "./validate.mjs";

const MANIFEST_PATH = new URL("./manifest.json", import.meta.url);
const OUTPUT_DIR = new URL("./output/html/", import.meta.url);
const MAX_ATTEMPTS = 3;
const NAV_TIMEOUT_MS = 45_000;

/**
 * The metadata container mounts well before the panel finishes filling in — waiting on it
 * alone is what produced 402 files that looked fine but had no categories. Wait for the
 * data points themselves instead.
 */
const CONTENT_SELECTOR = '[data-testid="app-metadata-container"]';
const CONTENT_TIMEOUT_MS = 15_000;
const DATA_TIMEOUT_MS = 20_000;

/**
 * Request pacing. The previous run used 3 tabs and a 1-3s gap and got the IP blocked
 * roughly halfway through (468 of 1005 pages came back as the anti-bot interstitial), so
 * the default is now one tab and a much wider gap.
 */
const DEFAULT_DELAY_MIN_MS = 5_000;
const DEFAULT_DELAY_MAX_MS = 12_000;
/** Extra pause before re-attempting a page that rendered incompletely. */
const RETRY_BACKOFF_MS = 15_000;
const SAVE_EVERY = 5;
const PROGRESS_EVERY = 20;

function parseArgs(argv) {
	const args = {
		limit: Infinity,
		force: false,
		retryStatuses: new Set(),
		delayMin: DEFAULT_DELAY_MIN_MS,
		delayMax: DEFAULT_DELAY_MAX_MS,
	};
	for (const arg of argv) {
		if (arg.startsWith("--limit=")) args.limit = Number(arg.split("=")[1]);
		else if (arg === "--force") args.force = true;
		else if (arg === "--retry-failed") args.retryStatuses.add("failed");
		else if (arg === "--retry-incomplete") args.retryStatuses.add("incomplete");
		else if (arg === "--retry-blocked") args.retryStatuses.add("blocked");
		else if (arg.startsWith("--delay-min=")) args.delayMin = Number(arg.split("=")[1]);
		else if (arg.startsWith("--delay-max=")) args.delayMax = Number(arg.split("=")[1]);
		else if (arg.startsWith("--concurrency=")) {
			// Deliberately unsupported: parallel tabs are what got the IP blocked.
			console.error("--concurrency is no longer supported; this scraper runs one page at a time.");
			process.exit(2);
		}
	}
	if (args.delayMax < args.delayMin) args.delayMax = args.delayMin;
	return args;
}

function formatDuration(ms) {
	const totalSeconds = Math.round(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	if (hours > 0) return `${hours}h${minutes}m`;
	if (minutes > 0) return `${minutes}m${seconds}s`;
	return `${seconds}s`;
}

function logProgress(stats, startedAt) {
	const elapsedMs = Date.now() - startedAt;
	const remaining = stats.total - stats.completed;
	const perPageMs = elapsedMs / stats.completed;
	const etaMs = perPageMs * remaining;
	const rate = (stats.completed / (elapsedMs / 1000)) * 60;
	console.log(
		`--- progress: ${stats.completed}/${stats.total} ` +
			`(success=${stats.success} incomplete=${stats.incomplete} failed=${stats.failed}) ` +
			`elapsed=${formatDuration(elapsedMs)} rate=${rate.toFixed(1)}/min eta=${formatDuration(etaMs)} ---`,
	);
}

function statusBreakdown(manifest) {
	const counts = {};
	for (const entry of manifest) counts[entry.status] = (counts[entry.status] ?? 0) + 1;
	return Object.entries(counts)
		.map(([status, count]) => `${status}=${count}`)
		.join(", ");
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(args) {
	return args.delayMin + Math.random() * (args.delayMax - args.delayMin);
}

async function loadManifest() {
	const raw = await readFile(MANIFEST_PATH, "utf8");
	return JSON.parse(raw);
}

async function saveManifest(manifest) {
	await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}

function selectQueue(manifest, args) {
	let candidates;
	if (args.force) {
		candidates = manifest;
	} else if (args.retryStatuses.size > 0) {
		candidates = manifest.filter((entry) => args.retryStatuses.has(entry.status));
	} else {
		// Anything not currently a verified success: pending, failed, blocked and
		// incomplete all need another go.
		candidates = manifest.filter((entry) => entry.status !== "success");
	}
	const queue = candidates.slice(0, args.limit);
	// Each invocation gets its own MAX_ATTEMPTS budget — otherwise an entry
	// that maxed out attempts in a previous run would never retry again.
	for (const entry of queue) entry.attempts = 0;
	return queue;
}

/** Raised when the anti-bot interstitial appears. Aborts the whole run. */
class BlockedError extends Error {
	constructor(url) {
		super(`Blocked by anti-bot protection at ${url}`);
		this.name = "BlockedError";
		this.url = url;
	}
}

async function scrapeOne(page, entry) {
	await page.goto(entry.url, { waitUntil: "load", timeout: NAV_TIMEOUT_MS });

	// networkidle is unreliable on this SPA (chat widgets / analytics beacons keep some
	// connections open indefinitely), so wait for app content to mount instead.
	try {
		await page.waitForSelector(CONTENT_SELECTOR, { timeout: CONTENT_TIMEOUT_MS });
	} catch {
		// Not fatal on its own — the validation below is the real gate.
	}

	// Then wait for the field that's actually required (see validate.mjs — installs and
	// categories are extracted but not gated on, since some listings never render them).
	//
	// Category chips are worth waiting for anyway when they do exist: the "Categories"
	// heading text mounts well before the chip list itself, which is an async fetch — an
	// earlier version of this wait checked only the heading text and missed chips that
	// hadn't loaded yet (e.g. quickbooks-integration-by-glances). Waiting on the chip
	// selector directly fixes that, and the two waits run concurrently so a listing with
	// no categories at all doesn't double the total wait time.
	let renderWarning;
	const [launchedResult] = await Promise.allSettled([
		page.waitForFunction(() => (document.body?.innerText ?? "").includes("Launched"), {
			timeout: DATA_TIMEOUT_MS,
		}),
		page.waitForSelector('[data-testid="chip"]', { timeout: DATA_TIMEOUT_MS }),
	]);
	if (launchedResult.status === "rejected") {
		renderWarning = `"Launched" did not render within ${DATA_TIMEOUT_MS}ms`;
	}

	const html = await page.content();
	const result = validatePage(html);

	if (result.blocked) {
		throw new BlockedError(entry.url);
	}

	// Incomplete pages are still written to disk so they can be inspected, but they are
	// never recorded as a success.
	const filePath = new URL(`${entry.id}-${entry.slug}.html`, OUTPUT_DIR);
	await writeFile(filePath, html);

	return { filePath: filePath.pathname, renderWarning, result };
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	await mkdir(OUTPUT_DIR, { recursive: true });

	const manifest = await loadManifest();
	const queue = selectQueue(manifest, args);

	if (queue.length === 0) {
		const filterDesc =
			args.retryStatuses.size > 0 ? `status in [${[...args.retryStatuses].join(", ")}]` : "force=true";
		console.log(
			manifest.length === 0
				? "Nothing to scrape: manifest is empty. Run discover.mjs first."
				: `Nothing to scrape: no entries match ${filterDesc}. Manifest breakdown: ${statusBreakdown(manifest)}.`,
		);
		return;
	}

	const retryDesc = args.retryStatuses.size > 0 ? [...args.retryStatuses].join(",") : "none";
	console.log(
		`Scraping ${queue.length} pages sequentially, ${Math.round(args.delayMin / 1000)}-${Math.round(
			args.delayMax / 1000,
		)}s between requests (force=${args.force}, retrying=${retryDesc})`,
	);

	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		userAgent:
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
	});
	const page = await context.newPage();

	const stats = { completed: 0, total: queue.length, success: 0, incomplete: 0, failed: 0 };
	const startedAt = Date.now();
	let blocked = null;

	try {
		for (const entry of queue) {
			let lastError;
			let done = false;

			for (let attempt = 1; attempt <= MAX_ATTEMPTS && !done; attempt++) {
				entry.attempts = attempt;
				if (attempt > 1) await sleep(RETRY_BACKOFF_MS);
				await sleep(randomDelay(args));

				try {
					const { filePath, renderWarning, result } = await scrapeOne(page, entry);
					entry.filePath = filePath;
					entry.renderWarning = renderWarning;
					entry.scrapedAt = new Date().toISOString();

					if (result.ok) {
						entry.status = "success";
						entry.error = undefined;
						entry.missing = undefined;
						entry.data = result.data;
						stats.success++;
						done = true;
					} else {
						entry.status = "incomplete";
						entry.missing = result.missing;
						entry.error = `missing: ${result.missing.join(", ")}`;
						console.warn(
							`  attempt ${attempt}/${MAX_ATTEMPTS} incomplete for ${entry.url} (missing: ${result.missing.join(", ")})`,
						);
					}
				} catch (err) {
					if (err instanceof BlockedError) {
						blocked = err;
						entry.status = "blocked";
						entry.error = err.message;
						done = true;
						break;
					}
					lastError = err;
					console.warn(`  attempt ${attempt}/${MAX_ATTEMPTS} failed for ${entry.url}: ${err.message}`);
				}
			}

			if (blocked) break;

			if (entry.status === "incomplete") stats.incomplete++;
			else if (entry.status !== "success") {
				entry.status = "failed";
				entry.error = lastError?.message ?? "unknown error";
				stats.failed++;
			}

			stats.completed++;
			console.log(`[${stats.completed}/${stats.total}] ${entry.status.toUpperCase()} ${entry.url}`);

			if (stats.completed % SAVE_EVERY === 0) await saveManifest(manifest);
			if (stats.completed % PROGRESS_EVERY === 0) logProgress(stats, startedAt);
		}
	} finally {
		await context.close();
		await browser.close();
		await saveManifest(manifest);
	}

	if (blocked) {
		console.error("");
		console.error("=".repeat(70));
		console.error("STOPPED: anti-bot protection triggered.");
		console.error(`  at: ${blocked.url}`);
		console.error(`  completed ${stats.completed}/${stats.total} before stopping`);
		console.error("");
		console.error("The IP is rate limited. Wait for it to clear (typically hours), then");
		console.error("re-run with a longer gap, e.g.:");
		console.error("  node scrape.mjs --delay-min=15000 --delay-max=30000");
		console.error("=".repeat(70));
		process.exitCode = 1;
		return;
	}

	const succeeded = manifest.filter((e) => e.status === "success").length;
	console.log(
		`Done. this run: success=${stats.success} incomplete=${stats.incomplete} failed=${stats.failed}. ` +
			`Manifest total verified: ${succeeded}/${manifest.length}`,
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
