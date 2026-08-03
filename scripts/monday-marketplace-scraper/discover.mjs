import { readFile, writeFile } from "node:fs/promises";

const SITEMAP_URL = "https://monday.com/sitemap-apps-mp.xml";
const MANIFEST_PATH = new URL("./manifest.json", import.meta.url);
const LISTING_URL_RE =
	/https:\/\/monday\.com\/marketplace\/listing\/(\d+)\/([a-z0-9-]+)/g;

async function loadExistingManifest() {
	try {
		const raw = await readFile(MANIFEST_PATH, "utf8");
		return JSON.parse(raw);
	} catch (err) {
		if (err.code === "ENOENT") return [];
		throw err;
	}
}

async function main() {
	console.log(`Fetching ${SITEMAP_URL} ...`);
	const res = await fetch(SITEMAP_URL, {
		headers: { "user-agent": "Mozilla/5.0 (monday-marketplace-scraper)" },
	});
	if (!res.ok) {
		throw new Error(`Failed to fetch sitemap: ${res.status} ${res.statusText}`);
	}
	const xml = await res.text();

	const discovered = new Map();
	for (const match of xml.matchAll(LISTING_URL_RE)) {
		const [url, id, slug] = match;
		discovered.set(id, { id, slug, url });
	}
	console.log(`Discovered ${discovered.size} app listing URLs in sitemap.`);

	const existing = await loadExistingManifest();
	const byId = new Map(existing.map((entry) => [entry.id, entry]));

	let added = 0;
	for (const { id, slug, url } of discovered.values()) {
		if (!byId.has(id)) {
			byId.set(id, { id, slug, url, status: "pending", attempts: 0 });
			added++;
		}
	}

	const manifest = [...byId.values()].sort((a, b) => Number(a.id) - Number(b.id));
	await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

	console.log(
		`Manifest updated: ${manifest.length} total entries (${added} new). Written to ${MANIFEST_PATH.pathname}`,
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
