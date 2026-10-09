import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from '@playwright/test';

const origin = process.argv[2];
if (!origin || new URL(origin).protocol !== 'https:') {
	throw new Error('Usage: node scripts/probe-browser-cache.mjs https://your-worker.workers.dev');
}
const doc = `browser-probe-${randomUUID()}`;
const report = { doc, origin, startedAt: new Date().toISOString(), samples: [] };
let html = '';
// Serve GitHub's rendered Markdown locally. The image itself comes from real Camo.
const server = createServer((_request, response) => {
	response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
	response.end(`<!doctype html><html><head><title>PlusMark cache test</title></head><body><h1>GitHub-rendered reaction</h1>${html}</body></html>`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const returnUrl = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true });
const voters = [];

async function post(url, body) {
	const response = await fetch(url, {
		method: 'POST', headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body), signal: AbortSignal.timeout(20_000)
	});
	assert.equal(response.status, 200, `POST ${url}`);
	return response;
}

try {
	await post(new URL('/api/widgets', origin), {
		doc, returnUrl, reactions: [{ id: 'like', emoji: '👍', label: 'Browser probe', description: '' }]
	});
	const badgeUrl = new URL(`/badge?doc=${doc}&r=like`, origin).href;
	const reactUrl = new URL(`/react?doc=${doc}&r=like`, origin).href;
	html = await (await post('https://api.github.com/markdown', {
		text: `[![Browser probe](${badgeUrl})](${reactUrl})`, mode: 'gfm'
	})).text();
	const camoUrl = html.match(/src="(https:\/\/camo\.githubusercontent\.com\/[^"]+)"/)?.[1];
	assert.ok(camoUrl, 'GitHub must proxy the badge');
	report.camoUrl = camoUrl;
	for (let i = 0; i < 2; i++) {
		const context = await browser.newContext();
		voters.push({ context, page: await context.newPage(), active: false });
	}

	async function view(voter, action, expected) {
		const started = performance.now();
		const responsePromise = voter.page.waitForResponse(r => r.url() === camoUrl, { timeout: 20_000 });
		await action();
		const response = await responsePromise;
		const svg = await response.text();
		const count = Number(svg.match(/ (\d+)<\/title>/)?.[1]);
		assert.equal(await voter.page.locator('img').evaluate(img => img.complete && img.naturalWidth > 0), true);
		const sample = {
			viewer: voters.indexOf(voter) + 1, expected, count,
			elapsedMs: Math.round(performance.now() - started),
			cacheControl: response.headers()['cache-control'],
			xCache: response.headers()['x-cache']
		};
		report.samples.push(sample);
		console.log(JSON.stringify(sample));
		assert.equal(count, expected, 'First page load must show the current count');
	}
	for (const voter of voters) await view(voter, () => voter.page.goto(returnUrl), 0);
	// Three cycles: separate visitors add votes, then each removes their own vote.
	// Reload the other viewer after every change, with normal browser caching enabled.
	for (let cycle = 0; cycle < 3; cycle++) {
		for (const index of [0, 1, 0, 1]) {
			const voter = voters[index];
			const expected = voters.filter(v => v.active).length + (voter.active ? -1 : 1);
			await view(voter, async () => {
				const mutation = voter.page.waitForResponse(r => r.url() === reactUrl);
				await voter.page.getByRole('link').click();
				assert.equal((await mutation).status(), 302);
				voter.active = !voter.active;
				await voter.page.waitForURL(returnUrl);
			}, expected);
			const other = voters[1 - index];
			await view(other, () => other.page.reload(), expected);
		}
	}
	await mkdir('.cache-probes', { recursive: true });
	await voters[0].page.screenshot({ path: `.cache-probes/${doc}.png` });
	report.passed = report.samples.every(s => s.count === s.expected && s.elapsedMs <= 5_000);
} catch (error) {
	report.error = String(error);
	report.passed = false;
} finally {
	for (const voter of voters.filter(v => v.active)) {
		try {
			const response = await voter.context.request.get(new URL(`/react?doc=${doc}&r=like`, origin).href, { maxRedirects: 0 });
			assert.equal(response.status(), 302);
		} catch (error) { report.cleanupError = String(error); }
	}
	await browser.close();
	await new Promise(resolve => server.close(resolve));
	await mkdir('.cache-probes', { recursive: true });
	const path = `.cache-probes/${doc}.json`;
	await writeFile(path, JSON.stringify(report, null, 2));
	console.log(JSON.stringify({ report: path, passed: report.passed, error: report.error }));
	if (!report.passed || report.cleanupError) process.exitCode = 1;
}
