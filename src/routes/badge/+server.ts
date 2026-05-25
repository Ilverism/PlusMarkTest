import type { RequestHandler } from '@sveltejs/kit';
import { getReactionDocumentStub, parseDocAndReaction } from '$lib/server/reaction-service';

const BADGE_HEADERS = {
	'content-type': 'image/svg+xml; charset=utf-8',
	'cache-control': 'no-cache, no-store, max-age=0, s-maxage=0, must-revalidate',
	pragma: 'no-cache',
	expires: '0'
};

export const GET: RequestHandler = async (event) => {
	const parsed = parseDocAndReaction(event);

	if (parsed instanceof Response) {
		const { error } = await parsed.json() as { error: string };
		return svgBadgeResponse('?', error, parsed.status);
	}

	const stub = await getReactionDocumentStub(event, parsed.doc);
	const result = await stub.getBadge(parsed.reaction);

	if (!result.ok) {
		return svgBadgeResponse('?', result.message, result.status);
	}

	return svgBadgeResponse(result.reaction.emoji, String(result.reaction.count), 200, result.reaction.label);
};

function svgBadgeResponse(emoji: string, text: string, status: number, label = 'PlusMark reaction'): Response {
	const display = `${emoji} ${text}`;
	const width = Math.max(72, Math.min(260, 30 + Array.from(display).length * 9));
	const escapedDisplay = escapeXml(display);
	const escapedLabel = escapeXml(label);

	return new Response(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="24" role="img" aria-label="${escapedLabel} ${escapedDisplay}">
<title>${escapedLabel} ${escapedDisplay}</title>
<rect width="${width}" height="24" rx="12" fill="#f3f4f6"/>
<text x="12" y="16" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="14" fill="#111827">${escapedDisplay}</text>
</svg>`,
		{ status, headers: BADGE_HEADERS }
	);
}

function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
