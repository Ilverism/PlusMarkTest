// src/lib/emoji.ts
export type EmojiEntry = {
	emoji: string;
	name: string;
	keywords: string;
};

export type EmojiCategory = {
	id: string;
	label: string;
	icon: string;
	emojis: EmojiEntry[];
};