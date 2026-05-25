import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const workerPath = fileURLToPath(new URL('../build/cloudflare/_worker.js', import.meta.url));
const exportLine = 'export { ReactionDocument } from "../../src/lib/server/reaction-document.ts";';
const worker = readFileSync(workerPath, 'utf8');

if (!worker.includes(exportLine)) {
	writeFileSync(workerPath, `${worker.trimEnd()}\n${exportLine}\n`);
}
