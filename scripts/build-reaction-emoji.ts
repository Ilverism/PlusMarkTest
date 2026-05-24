// scripts/build-reaction-emoji.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type EmojiEntry = {
	emoji: string;
	name: string;
	keywords: string;
};

type EmojiCategory = {
	id: string;
	label: string;
	icon: string;
	emojis: EmojiEntry[];
};

const inputPath = resolve("static/emoji-test.txt");
const outputPath = resolve("src/lib/generated/reaction-emojis.json");

const emojiGroupPattern = /^# group: (.+)$/u;
const emojiSubgroupPattern = /^# subgroup: (.+)$/u;

const emojiTestLinePattern =
	/^[0-9A-F ]+;\s*fully-qualified\s*#\s*(\S+)\s+E[\d.]+\s+(.+)$/u;

const blockedNamePatterns = [
	/\bskin tone\b/i,
	/\bcomponent\b/i,
	/\bmodifier\b/i,
	/\bfamily\b/i,
	/\bcouple\b/i,
	/\bpeople holding hands\b/i,
	/\bpeople wrestling\b/i,
	/\bperson\b.*\bhand\b/i,
	/\bkeycap\b/i,
	/\bflag:/i
];

const blockedEmojiPatterns = [
	/\u200D/u,
	/[\u{1F3FB}-\u{1F3FF}]/u
];

const preferredReactionEmojis = [
	"👍",
	"👎",
	"❤️",
	"😂",
	"😮",
	"😢",
	"😡",
	"👏",
	"🙌",
	"🙏",
	"💪",
	"🔥",
	"💯",
	"🎉",
	"🚀",
	"✨",
	"✅",
	"❌",
	"👀",
	"🤔",
	"😍",
	"😊",
	"😁",
	"😎",
	"🏆",
	"💡"
];

const categories: Omit<EmojiCategory, "emojis">[] = [
	{
		id: "reactions",
		label: "Reactions",
		icon: "👍"
	},
	{
		id: "smileys",
		label: "Smileys",
		icon: "😀"
	},
	{
		id: "gestures",
		label: "Gestures",
		icon: "👏"
	},
	{
		id: "symbols",
		label: "Symbols",
		icon: "❤️"
	},
	{
		id: "objects",
		label: "Objects",
		icon: "💡"
	},
	{
		id: "activities",
		label: "Activities",
		icon: "🎉"
	},
	{
		id: "nature",
		label: "Nature",
		icon: "🌱"
	},
	{
		id: "food",
		label: "Food",
		icon: "🍕"
	},
	{
		id: "travel",
		label: "Travel",
		icon: "🚀"
	}
];


const getCategoryIdFromGroup = (group: string, subgroup: string): string => {
	if (group === "Smileys & Emotion") {
		return "smileys";
	}

	if (group === "People & Body") {
		return "gestures";
	}

	if (group === "Animals & Nature") {
		return "nature";
	}

	if (group === "Food & Drink") {
		return "food";
	}

	if (group === "Travel & Places") {
		return "travel";
	}

	if (group === "Activities") {
		return "activities";
	}

	if (group === "Objects") {
		return "objects";
	}

	if (group === "Symbols") {
		return "symbols";
	}

	if (group === "Flags") {
		return "symbols";
	}

	if (subgroup.startsWith("face-")) {
		return "smileys";
	}

	if (
		subgroup.startsWith("hand-") ||
		subgroup === "hands" ||
		subgroup === "body-parts"
	) {
		return "gestures";
	}

	return "objects";
};

const input = readFileSync(inputPath, "utf8");

type ClassifiedEmojiEntry = EmojiEntry & {
	categoryId: string;
};

const entriesByEmoji = new Map<string, ClassifiedEmojiEntry>();

let currentGroup = "";
let currentSubgroup = "";

for (const rawLine of input.split(/\r?\n/u)) {
	const line = rawLine.trim();

	const groupMatch = line.match(emojiGroupPattern);

	if (groupMatch) {
		currentGroup = groupMatch[1];
		currentSubgroup = "";
		continue;
	}

	const subgroupMatch = line.match(emojiSubgroupPattern);

	if (subgroupMatch) {
		currentSubgroup = subgroupMatch[1];
		continue;
	}

	const match = line.match(emojiTestLinePattern);

	if (!match) continue;

	const [, emoji, rawName] = match;
	const name = rawName.trim();

	if (blockedEmojiPatterns.some((pattern) => pattern.test(emoji))) continue;
	if (blockedNamePatterns.some((pattern) => pattern.test(name))) continue;

	entriesByEmoji.set(emoji, {
		emoji,
		name,
		keywords: `${emoji} ${name.toLowerCase()}`,
		categoryId: getCategoryIdFromGroup(currentGroup, currentSubgroup)
	});
}

const entries = Array.from(entriesByEmoji.values());

const entriesByCategoryId = new Map<string, EmojiEntry[]>();

for (const category of categories) {
	entriesByCategoryId.set(category.id, []);
}

const reactionEntries = preferredReactionEmojis
	.map((emoji) => entriesByEmoji.get(emoji))
	.filter((entry): entry is EmojiEntry => Boolean(entry));

entriesByCategoryId.set("reactions", reactionEntries);

for (const entry of entries) {
	const { categoryId, ...emojiEntry } = entry;

	entriesByCategoryId.get(categoryId)?.push(emojiEntry);
}

const output: EmojiCategory[] = categories
	.map((category) => ({
		...category,
		emojis: entriesByCategoryId.get(category.id) ?? []
	}))
	.filter((category) => category.emojis.length > 0);

mkdirSync(dirname(outputPath), { recursive: true });

writeFileSync(outputPath, `${JSON.stringify(output, null, "\t")}\n`, "utf8");

console.log(
	`Generated ${entries.length} emoji across ${output.length} categories.`
);