import { expect, test } from '@playwright/test';

test('creates, protects, badges, and toggles a reaction widget', async ({ request }) => {
	const doc = `playwright-${Date.now()}-${Math.random().toString(36).slice(2)}`;
	const returnUrl = 'https://example.com/markdown-source';
	const reactions = [
		{
			id: 'thumbs-up',
			emoji: '👍',
			label: 'Thumbs Up',
			description: 'Like this'
		}
	];

	const createResponse = await request.post('/api/widgets', {
		data: { doc, returnUrl, reactions }
	});
	expect(createResponse.ok()).toBe(true);

	const createBody = await createResponse.json() as { editToken: string };
	expect(createBody.editToken).toBeTruthy();

	const blockedUpdate = await request.post('/api/widgets', {
		data: {
			doc,
			returnUrl,
			reactions: [{ ...reactions[0], label: 'Updated without token' }]
		}
	});
	expect(blockedUpdate.status()).toBe(409);

	const allowedUpdate = await request.post('/api/widgets', {
		data: {
			doc,
			returnUrl,
			editToken: createBody.editToken,
			reactions: [{ ...reactions[0], label: 'Updated with token' }]
		}
	});
	expect(allowedUpdate.ok()).toBe(true);

	const unknownBadge = await request.get(`/badge?doc=${doc}&r=missing`);
	expect(unknownBadge.status()).toBe(404);
	expect(unknownBadge.headers()['content-type']).toContain('image/svg+xml');

	const firstClick = await request.get(`/react?doc=${doc}&r=thumbs-up`, {
		maxRedirects: 0
	});
	expect(firstClick.status()).toBe(302);
	expect(firstClick.headers().location).toBe(returnUrl);

	const setCookie = firstClick.headers()['set-cookie'];
	expect(setCookie).toContain('pm_vid=');

	const badgeAfterClick = await request.get(`/badge?doc=${doc}&r=thumbs-up`);
	expect(await badgeAfterClick.text()).toContain('👍 1');

	const secondClick = await request.get(`/react?doc=${doc}&r=thumbs-up`, {
		headers: { cookie: setCookie.split(';')[0] },
		maxRedirects: 0
	});
	expect(secondClick.status()).toBe(302);

	const badgeAfterToggle = await request.get(`/badge?doc=${doc}&r=thumbs-up`);
	expect(await badgeAfterToggle.text()).toContain('👍 0');
});
