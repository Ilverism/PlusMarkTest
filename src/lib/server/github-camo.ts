export type CamoTarget = {
	reaction: string;
	canonicalUrl: string;
	camoUrl: string;
};

export type CamoDiscoveryResult = {
	status: number;
	targets: CamoTarget[];
	error?: string;
};

const GITHUB_HOSTNAME = 'github.com';
const CAMO_HOSTNAME = 'camo.githubusercontent.com';
const MAX_GITHUB_HTML_BYTES = 1_500_000;
const DISCOVERY_TIMEOUT_MS = 8_000;

export function toSafeGitHubPageUrl(input: string): string | null {
	try {
		const url = new URL(input);

		if (url.protocol !== 'https:') return null;
		if (url.hostname !== GITHUB_HOSTNAME) return null;
		if (url.port || url.username || url.password) return null;

		const pathSegments = url.pathname.split('/').filter(Boolean);
		if (pathSegments.length < 2) return null;
		if (!isSafeGitHubSegment(pathSegments[0]) || !isSafeGitHubSegment(pathSegments[1])) return null;

		url.hash = '';
		return url.toString();
	} catch {
		return null;
	}
}

export async function discoverGitHubCamoTargets(
	githubUrl: string,
	doc: string,
	reactionIds: Iterable<string>
): Promise<CamoDiscoveryResult> {
	const safeUrl = toSafeGitHubPageUrl(githubUrl);
	if (!safeUrl) {
		return { status: 0, targets: [], error: 'Return URL is not a supported GitHub page.' };
	}

	try {
		const response = await fetchWithTimeout(safeUrl);
		const status = response.status;

		if (!response.ok) {
			return { status, targets: [], error: `GitHub returned ${status}.` };
		}

		const contentType = response.headers.get('content-type') ?? '';
		if (!contentType.toLowerCase().includes('text/html')) {
			return { status, targets: [], error: 'GitHub response was not HTML.' };
		}

		const html = await readTextWithLimit(response, MAX_GITHUB_HTML_BYTES);
		return {
			status,
			targets: findCamoTargetsInHtml(html, doc, reactionIds)
		};
	} catch (err) {
		return {
			status: 0,
			targets: [],
			error: err instanceof Error ? err.message : 'GitHub discovery failed.'
		};
	}
}

export function findCamoTargetsInHtml(
	html: string,
	doc: string,
	reactionIds: Iterable<string>
): CamoTarget[] {
	const knownReactionIds = new Set(reactionIds);
	const targets = new Map<string, CamoTarget>();

	for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
		const attrs = parseAttributes(match[0]);
		const canonicalUrl = attrs['data-canonical-src'];
		const camoUrl = attrs.src ?? attrs['data-src'];

		if (!canonicalUrl || !camoUrl) continue;

		const reaction = reactionFromCanonicalBadge(canonicalUrl, doc, knownReactionIds);
		const normalizedCamoUrl = normalizeCamoUrl(camoUrl);

		if (!reaction || !normalizedCamoUrl || targets.has(reaction)) continue;

		targets.set(reaction, {
			reaction,
			canonicalUrl,
			camoUrl: normalizedCamoUrl
		});
	}

	return Array.from(targets.values());
}

export async function purgeCamoUrl(camoUrl: string): Promise<number> {
	const normalizedCamoUrl = normalizeCamoUrl(camoUrl);
	if (!normalizedCamoUrl) return 0;

	try {
		const response = await fetchWithTimeout(normalizedCamoUrl, { method: 'PURGE' });
		return response.status;
	} catch {
		return 0;
	}
}

function isSafeGitHubSegment(value: string): boolean {
	return /^[A-Za-z0-9_.-]{1,100}$/.test(value) && value !== '.' && value !== '..';
}

function normalizeCamoUrl(input: string): string | null {
	try {
		const url = new URL(input);

		if (url.protocol !== 'https:') return null;
		if (url.hostname !== CAMO_HOSTNAME) return null;
		if (!url.pathname || url.pathname === '/') return null;

		return url.toString();
	} catch {
		return null;
	}
}

function reactionFromCanonicalBadge(
	input: string,
	doc: string,
	reactionIds: Set<string>
): string | null {
	try {
		const url = new URL(input);

		if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
		if (url.pathname !== '/badge') return null;
		if (url.searchParams.get('doc') !== doc) return null;

		const reaction = url.searchParams.get('r');
		if (!reaction || !reactionIds.has(reaction)) return null;

		return reaction;
	} catch {
		return null;
	}
}

function parseAttributes(tag: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	const pattern = /([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

	for (const match of tag.matchAll(pattern)) {
		const name = match[1].toLowerCase();
		const value = match[2] ?? match[3] ?? match[4] ?? '';
		attrs[name] = decodeHtmlAttribute(value);
	}

	return attrs;
}

function decodeHtmlAttribute(value: string): string {
	return value.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (entity, body: string) => {
		const normalized = body.toLowerCase();

		if (normalized === 'amp') return '&';
		if (normalized === 'quot') return '"';
		if (normalized === 'apos') return "'";
		if (normalized === 'lt') return '<';
		if (normalized === 'gt') return '>';

		if (normalized.startsWith('#x')) {
			const codePoint = Number.parseInt(normalized.slice(2), 16);
			return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
		}

		if (normalized.startsWith('#')) {
			const codePoint = Number.parseInt(normalized.slice(1), 10);
			return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
		}

		return entity;
	});
}

async function fetchWithTimeout(input: string, init: RequestInit = {}): Promise<Response> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS);

	try {
		return await fetch(input, {
			...init,
			redirect: 'manual',
			headers: {
				accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
				'user-agent': 'PlusMark Camo Discovery',
				...init.headers
			},
			signal: controller.signal
		});
	} finally {
		clearTimeout(timeout);
	}
}

async function readTextWithLimit(response: Response, byteLimit: number): Promise<string> {
	if (!response.body) return response.text();

	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let received = 0;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		if (!value) continue;

		received += value.byteLength;
		if (received > byteLimit) {
			await reader.cancel();
			throw new Error('GitHub response was too large.');
		}

		chunks.push(value);
	}

	const bytes = new Uint8Array(received);
	let offset = 0;

	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}

	return new TextDecoder().decode(bytes);
}
