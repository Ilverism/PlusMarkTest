import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

// Creates an isolated test widget; deliberately disables the GitHub purge fallback
// by using a non-GitHub return URL. Requests the SAME Camo URL on every sample.
const origin = process.argv[2];
if (!origin || new URL(origin).protocol !== 'https:') {
	throw new Error('Usage: node scripts/probe-github-cache.mjs https://your-worker.workers.dev');
}
const existingDoc = process.argv[3];
const doc = existingDoc ?? `cache-probe-${randomUUID()}`;
if (!/^[a-z0-9-]+$/.test(doc)) throw new Error('Invalid probe document ID');
const report = { origin, doc, startedAt: new Date().toISOString(), rounds: [] };
const badgeUrl = new URL(`/badge?doc=${doc}&r=like`, origin).href;
const reactUrl = new URL(`/react?doc=${doc}&r=like`, origin).href;
let cookie;
let active = false;

async function request(url, options = {}) {
	const response = await fetch(url, { ...options, signal: AbortSignal.timeout(20_000) });
	if (!response.ok) throw new Error(`${url}: HTTP ${response.status}: ${(await response.text()).slice(0,200)}`);
	return response;
}

async function badge(url) {
	const start = performance.now();
	const response = await request(url);
	const body = await response.text();
	const count = body.match(/ (\d+)<\/title>/)?.[1];
	if (count === undefined) throw new Error(`No count in badge at ${url}`);
	return {
		count: Number(count),
		requestMs: Math.round(performance.now() - start),
		cacheControl: response.headers.get('cache-control'),
		age: response.headers.get('age'),
		xCache: response.headers.get('x-cache'),
		servedBy: response.headers.get('x-served-by')
	};
}

async function toggle() {
	const response = await fetch(reactUrl, {
		redirect: 'manual',
		headers: cookie ? { cookie } : {},
		signal: AbortSignal.timeout(20_000)
	});
	if (response.status !== 302) throw new Error(`Reaction returned HTTP ${response.status}`);
	cookie = response.headers.get('set-cookie')?.split(';')[0] ?? cookie;
	if (!cookie) throw new Error('Reaction did not establish a visitor cookie');
	active = !active;
	return response.headers.get('cache-control');
}

try {
	if (!existingDoc) await request(new URL('/api/widgets', origin), {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ doc, returnUrl: 'https://example.com/', reactions: [
			{ id: 'like', emoji: '👍', label: 'Cache probe', description: 'Isolated cache test' }
		] })
	});
	const rendered = await request('https://api.github.com/markdown', {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'user-agent': 'PlusMark-cache-probe' },
		body: JSON.stringify({ text: `[![Cache probe](${badgeUrl})](${reactUrl})`, mode: 'gfm' })
	});
	const html = await rendered.text();
	const camoUrl = html.match(/src="(https:\/\/camo\.githubusercontent\.com\/[^"]+)"/)?.[1]?.replaceAll('&amp;', '&');
	if (!camoUrl) throw new Error('GitHub did not return a Camo image URL');
	report.camoUrl = camoUrl;
	report.originBaseline = await badge(badgeUrl);
	report.camoBaseline = await badge(camoUrl);
	console.log(JSON.stringify({ baseline: report }));
	for (let round = 1; round <= 3; round++) {
		const redirectCacheControl = await toggle();
		const started = performance.now();
		const expected = active ? 1 : 0;
		const direct = await badge(badgeUrl);
		if (direct.count !== expected) throw new Error(`Origin count ${direct.count}, expected ${expected}`);
		const result = { round, expected, direct, redirectCacheControl, samples: [], freshAfterMs: null };
		report.rounds.push(result);
		do {
			const sample = { ...await badge(camoUrl), elapsedMs: Math.round(performance.now() - started) };
			result.samples.push(sample);
			console.log(JSON.stringify({ round, expected, ...sample }));
			if (sample.count === expected) {
				result.freshAfterMs = sample.elapsedMs;
				break;
			}
			if (performance.now() - started >= 60_000) break;
			await delay(5_000);
		} while (performance.now() - started < 65_000);
		// Stop on stale data so toggling back cannot masquerade as freshness.
		if (result.freshAfterMs === null) break;
		await delay(1_000);
	}
} catch (error) {
	report.error = String(error);
	process.exitCode = 1;
} finally {
	if (active) {
		try { await toggle(); report.cleanup = 'Test vote removed'; }
		catch (error) { report.cleanup = String(error); process.exitCode = 1; }
	}
	report.passed = !report.error && report.rounds.length === 3 && report.rounds.every(r => r.freshAfterMs !== null && r.freshAfterMs <= 5_000);
	await mkdir('.cache-probes', { recursive: true });
	const path = `.cache-probes/${doc}-${Date.now()}.json`;
	await writeFile(path, JSON.stringify(report, null, 2));
	console.log(JSON.stringify({ report: path, passed: report.passed, error: report.error }));
	if (!report.passed) process.exitCode = 1;
}
