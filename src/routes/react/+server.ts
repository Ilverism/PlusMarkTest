import { error, redirect, type RequestHandler } from '@sveltejs/kit';
import {
	getReactionDocumentStub,
	getVoterHash,
	parseDocAndReaction
} from '$lib/server/reaction-service';

export const GET: RequestHandler = async (event) => {
	const parsed = parseDocAndReaction(event);

	if (parsed instanceof Response) {
		const { error: message } = await parsed.json() as { error: string };
		error(parsed.status, message);
	}

	const voterHash = await getVoterHash(event, parsed.doc);
	const stub = await getReactionDocumentStub(event, parsed.doc);
	const result = await stub.toggleReaction(parsed.reaction, voterHash);

	if (!result.ok) {
		error(result.status, result.message);
	}

	redirect(302, result.returnUrl);
};
