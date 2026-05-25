export type WidgetReactionInput = {
	id: string;
	emoji: string;
	label: string;
	description: string;
};

export type PublicWidgetReaction = WidgetReactionInput & {
	count: number;
};

export type PublicWidget = {
	doc: string;
	returnUrl: string;
	reactions: PublicWidgetReaction[];
	createdAt: number;
	updatedAt: number;
};

export type WidgetDraftReaction = {
	emoji: string;
	name: string;
	description: string;
};

export type WidgetDraft = {
	doc: string;
	returnUrl: string;
	reactions: WidgetDraftReaction[];
};

export const MAX_DOC_ID_LENGTH = 120;
export const MAX_REACTION_ID_LENGTH = 80;
export const MAX_LABEL_LENGTH = 80;
export const MAX_DESCRIPTION_LENGTH = 240;
export const MAX_RETURN_URL_LENGTH = 2048;
export const MAX_REACTIONS = 24;

export function slugifyContentId(input: string): string {
	return slugify(input, MAX_DOC_ID_LENGTH);
}

export function slugifyReactionId(input: string): string {
	return slugify(input, MAX_REACTION_ID_LENGTH);
}

export function normalizeDocId(input: string): string | null {
	const normalized = slugifyContentId(input);
	return normalized.length > 0 ? normalized : null;
}

export function normalizeReactionId(input: string): string | null {
	const normalized = slugifyReactionId(input);
	return normalized.length > 0 ? normalized : null;
}

export function normalizeReturnUrl(input: string): string | null {
	const value = input.trim();
	if (!value || value.length > MAX_RETURN_URL_LENGTH) return null;

	try {
		const url = new URL(value);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
		return url.toString();
	} catch {
		return null;
	}
}

export function createWidgetInput(draft: WidgetDraft): {
	doc: string;
	returnUrl: string;
	reactions: WidgetReactionInput[];
} | null {
	const returnUrl = normalizeReturnUrl(draft.returnUrl);
	const doc = normalizeDocId(draft.doc || draft.returnUrl);

	if (!doc || !returnUrl) return null;

	const usedIds = new Map<string, number>();
	const reactions = draft.reactions
		.map((reaction) => {
			const label = reaction.name.trim().slice(0, MAX_LABEL_LENGTH) || reaction.emoji;
			const baseId = slugifyReactionId(label || reaction.emoji) || 'reaction';
			const nextCount = (usedIds.get(baseId) ?? 0) + 1;
			usedIds.set(baseId, nextCount);

			const suffix = nextCount > 1 ? `-${nextCount}` : '';
			const id = `${baseId.slice(0, MAX_REACTION_ID_LENGTH - suffix.length)}${suffix}`;

			return {
				id,
				emoji: reaction.emoji.trim() || '👍',
				label,
				description: reaction.description.trim().slice(0, MAX_DESCRIPTION_LENGTH)
			};
		})
		.slice(0, MAX_REACTIONS);

	if (reactions.length === 0) return null;

	return {
		doc,
		returnUrl,
		reactions
	};
}

export function buildMarkdownSnippet(widget: Pick<PublicWidget, 'doc' | 'returnUrl'> & {
	reactions: WidgetReactionInput[];
}, origin: string): string {
	const baseUrl = origin.replace(/\/$/, '');

	return widget.reactions
		.map((reaction) => {
			const doc = encodeURIComponent(widget.doc);
			const reactionId = encodeURIComponent(reaction.id);
			const label = escapeMarkdownAlt(reaction.label);
			const badgeUrl = `${baseUrl}/badge?doc=${doc}&r=${reactionId}`;
			const reactUrl = `${baseUrl}/react?doc=${doc}&r=${reactionId}`;

			return `[![${reaction.emoji} ${label}](${badgeUrl})](${reactUrl})`;
		})
		.join('\n\n');
}

function slugify(input: string, maxLength: number): string {
	return input
		.trim()
		.toLowerCase()
		.replace(/^https?:\/\//, '')
		.replace(/^www\./, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, maxLength)
		.replace(/-+$/g, '');
}

function escapeMarkdownAlt(input: string): string {
	return input.replace(/[[\]\\]/g, '\\$&');
}
