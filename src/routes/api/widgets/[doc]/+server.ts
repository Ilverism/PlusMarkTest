import { json, type RequestHandler } from '@sveltejs/kit';
import { getReactionDocumentStub } from '$lib/server/reaction-service';
import { normalizeDocId } from '$lib/widget';

export const GET: RequestHandler = async (event) => {
	const doc = normalizeDocId(event.params.doc ?? '');

	if (!doc) {
		return json({ error: 'A valid content ID is required.' }, { status: 400 });
	}

	const stub = await getReactionDocumentStub(event, doc);
	const result = await stub.getWidget();

	if (!result.ok) {
		return json({ error: result.message }, { status: result.status });
	}

	return json({ widget: result.widget });
};
