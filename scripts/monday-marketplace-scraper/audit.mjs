/**
 * Re-validates already-saved HTML against the current rules and rewrites manifest statuses.
 *
 * The first full run recorded "success" whenever a file was written, so every entry claims
 * success even though roughly 87% of the files are either the anti-bot interstitial or a
 * partially rendered page. Running this rewrites those to `blocked` / `incomplete`, which
 * makes `node scrape.mjs` pick them up again without re-fetching the pages that are fine.
 *
 * Usage:
 *   node audit.mjs --dry-run   # report only
 *   node audit.mjs             # report and rewrite manifest.json
 */

import { readFile, writeFile } from "node:fs/promises";
import { validatePage } from "./validate.mjs";

const MANIFEST_PATH = new URL("./manifest.json", import.meta.url);
const OUTPUT_DIR = new URL("./output/html/", import.meta.url);

const dryRun = process.argv.includes("--dry-run");

async function main() {
	const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
	const tally = { success: 0, blocked: 0, incomplete: 0, missingFile: 0 };
	const missingFields = {};

	for (const entry of manifest) {
		const filePath = new URL(`${entry.id}-${entry.slug}.html`, OUTPUT_DIR);

		let html;
		try {
			html = await readFile(filePath, "utf8");
		} catch {
			entry.status = "pending";
			entry.error = "no saved file";
			entry.missing = undefined;
			entry.data = undefined;
			tally.missingFile++;
			continue;
		}

		const result = validatePage(html);
		if (result.ok) {
			entry.status = "success";
			entry.error = undefined;
			entry.missing = undefined;
			entry.data = result.data;
			tally.success++;
		} else if (result.blocked) {
			entry.status = "blocked";
			entry.error = "anti-bot interstitial";
			entry.missing = undefined;
			entry.data = undefined;
			tally.blocked++;
		} else {
			entry.status = "incomplete";
			entry.error = `missing: ${result.missing.join(", ")}`;
			entry.missing = result.missing;
			entry.data = result.data;
			tally.incomplete++;
			for (const field of result.missing) {
				missingFields[field] = (missingFields[field] ?? 0) + 1;
			}
		}
	}

	if (!dryRun) await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

	const requeue = tally.blocked + tally.incomplete + tally.missingFile;
	console.log(`Audited ${manifest.length} entries${dryRun ? " (dry run, manifest not written)" : ""}`);
	console.log(`  success     ${tally.success}`);
	console.log(`  blocked     ${tally.blocked}`);
	console.log(`  incomplete  ${tally.incomplete}  ${JSON.stringify(missingFields)}`);
	console.log(`  no file     ${tally.missingFile}`);
	console.log(`  → ${requeue} entries will be re-scraped by \`node scrape.mjs\``);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
