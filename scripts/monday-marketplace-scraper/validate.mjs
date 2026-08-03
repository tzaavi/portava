/**
 * Page validation for the marketplace scraper.
 *
 * A 200 response is not evidence of a usable page. Two failure modes were seen in the
 * first full run, and neither one throws:
 *
 *   1. monday.com serves an anti-bot interstitial ("Suspicious activity detected") with a
 *      normal status code. 468 of 1005 files from that run were this page.
 *   2. The SPA mounts its shell and some metadata, but the rest of the panel never
 *      renders, so the file looks the right size while missing the fields we came for.
 *
 * So a page only counts as a success when the launched date is present. Installs count
 * and categories are extracted when available but not required — some listings (mostly
 * monday.com's own first-party apps, e.g. "word-cloud", "online-docs") render the
 * "Categories" heading with an empty chip list and no installs count at all, so gating on
 * either just produced endless unproductive retries against pages with nothing more to
 * load.
 *
 * Kept dependency-free and operating on an HTML string so the same rules can validate a
 * live page during a scrape and audit already-saved files on disk.
 */

const BLOCK_MARKERS = [
	"Suspicious activity",
	"suspicious or high-volume traffic",
	"unusual traffic from your computer",
];

/** Anti-bot interstitial. Distinct from "incomplete" — it means back off, not retry. */
export function detectBlock(html) {
	return BLOCK_MARKERS.some((marker) => html.includes(marker));
}

/**
 * Flattens markup to visible text.
 *
 * Tags become newlines rather than being deleted, so a label and its value stay separate
 * tokens instead of merging into "InstallsMar 2024". <svg> is dropped wholesale because
 * path data is megabytes of noise that can contain anything.
 */
function decodeEntities(value) {
	return value
		.replace(/&nbsp;/g, " ")
		.replace(/&quot;/g, '"')
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
		.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		// Ampersand last, so "&amp;lt;" does not turn into a tag.
		.replace(/&amp;/g, "&");
}

function htmlToText(html) {
	const withoutTags = html.replace(/<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, "\n");
	return decodeEntities(withoutTags).replace(/[ \t]+/g, " ").replace(/\n\s*/g, "\n").trim();
}

/** e.g. "1.2K", "10,431", "500" — the count rendered next to the Installs label. */
function matchInstalls(text) {
	const match = text.match(/\bInstalls\b\s*\n\s*([\d][\d.,]*\s*[KkMm]?)\b/);
	return match ? match[1].trim() : null;
}

/** e.g. "Mar 2024". */
function matchLaunched(text) {
	const match = text.match(/\bLaunched\b\s*\n\s*([A-Z][a-z]{2,8}\s+\d{4})\b/);
	return match ? match[1].trim() : null;
}

/**
 * Category chips.
 *
 * Read from the chips' aria-labels rather than the flattened text, because the category
 * list sits in a wrapper whose text ordering is not stable across listings.
 */
function matchCategories(html) {
	const section = html.split("Categories")[1];
	if (!section) return [];
	// Only look at the markup immediately following the heading; later chips on the page
	// (related apps, tags) would otherwise count as categories.
	const window = section.slice(0, 4000);
	const names = [];
	const chipPattern = /data-testid="chip"[^>]*aria-label="([^"]+)"/g;
	let match = chipPattern.exec(window);
	while (match !== null) {
		// Read from raw markup, so entities still need decoding ("Import &amp; export").
		const name = decodeEntities(match[1]).trim();
		if (name) names.push(name);
		match = chipPattern.exec(window);
	}
	return names;
}

export function extractDataPoints(html) {
	const text = htmlToText(html);
	return {
		installs: matchInstalls(text),
		launched: matchLaunched(text),
		categories: matchCategories(html),
	};
}

/**
 * @returns {{ok: boolean, blocked: boolean, missing: string[], data: object|null}}
 */
export function validatePage(html) {
	if (detectBlock(html)) {
		return { ok: false, blocked: true, missing: ["blocked"], data: null };
	}

	const data = extractDataPoints(html);
	const missing = [];
	if (!data.launched) missing.push("launched");

	return { ok: missing.length === 0, blocked: false, missing, data };
}
