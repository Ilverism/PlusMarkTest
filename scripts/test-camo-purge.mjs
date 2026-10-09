import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import ts from 'typescript';
import * as camo from '../src/lib/server/github-camo.ts';

// Execute the actual Durable Object's SQL against SQLite; replace only the
// Workers base class and external purge request so failures/timing are repeatable.
const source = await readFile(new URL('../src/lib/server/reaction-document.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
	compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;

async function fixture(t, purge) {
	const db = new DatabaseSync(':memory:');
	t.after(() => db.close());
	let alarm = null;
	const ctx = { storage: {
		sql: { exec: (sql, ...args) => {
			const rows = db.prepare(sql).all(...args);
			return { toArray: () => rows };
		} },
		transactionSync: callback => callback(),
		getAlarm: async () => alarm,
		setAlarm: async value => { alarm = value; },
		deleteAlarm: async () => { alarm = null; }
	} };
	const exports = {};
	new Function('require', 'exports', compiled)(name => {
		if (name === 'cloudflare:workers') return { DurableObject: class {
			constructor(state) { this.ctx = state; }
		} };
		if (name === './github-camo') return { ...camo, purgeCamoUrl: purge };
		throw new Error(`Unexpected import ${name}`);
	}, exports);
	const document = new exports.ReactionDocument(ctx, {});
	await document.saveWidget({
		widget: { doc: 'test', returnUrl: 'https://github.com/example/repo', reactions: [
			{ id: 'like', emoji: '👍', label: 'Like', description: '' }
		] }, editTokenHash: null, createEditTokenHash: 'test'
	});
	document.storeCamoTargets([{
		reaction: 'like', canonicalUrl: 'https://example.com/badge?doc=test&r=like',
		camoUrl: 'https://camo.githubusercontent.com/test/image'
	}], Date.now());
	await document.toggleReaction('like', 'viewer1');
	db.prepare('UPDATE camo_targets SET next_purge_at = ?').run(Date.now() - 1);
	return { document, row: () => db.prepare('SELECT * FROM camo_targets').get() };
}

test('a failed purge remains scheduled for retry', async t => {
	const { document, row } = await fixture(t, async () => 503);
	await document.runCamoPurgeBatch(Date.now());
	assert.ok(row().purge_pending > 0);
	assert.ok(row().next_purge_at > Date.now());
	assert.ok(row().next_purge_at - row().last_purge_attempt_at >= 15 * 60_000);
	assert.equal(row().last_purge_status, 503);
});

test('a reaction arriving during a purge is not discarded', async t => {
	let finish;
	let started;
	let attempts = 0;
	const didStart = new Promise(resolve => { started = resolve; });
	const { document, row } = await fixture(t, () => {
		if (++attempts > 1) return Promise.resolve(200);
		started();
		return new Promise(resolve => { finish = resolve; });
	});
	const work = document.runCamoPurgeBatch(Date.now());
	await didStart;
	await document.toggleReaction('like', 'viewer2');
	finish(200);
	await work;
	assert.ok(row().purge_pending > 0);
	assert.ok(row().next_purge_at > Date.now());
	await document.runCamoPurgeBatch(row().next_purge_at + 1);
	assert.equal(attempts, 2);
	assert.equal(row().purge_pending, 0);
});

test('a successful purge clears the completed work', async t => {
	const { document, row } = await fixture(t, async () => 200);
	await document.runCamoPurgeBatch(Date.now());
	assert.equal(row().purge_pending, 0);
	assert.equal(row().next_purge_at, 0);
});

test('a permanent rejection does not retry indefinitely', async t => {
	const { document, row } = await fixture(t, async () => 403);
	await document.runCamoPurgeBatch(Date.now());
	assert.equal(row().purge_pending, 0);
	assert.equal(row().last_purge_status, 403);
});
