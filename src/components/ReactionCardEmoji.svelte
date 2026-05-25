<!-- src/components/ReactionCardEmoji.svelte -->
<script lang="ts">
    import type Reaction from "../Reaction.svelte";
	import Manager from "$lib/Manager.svelte";


	type Props = {
		reaction: Reaction;
	};

	let { reaction }: Props = $props();

	const openEmojiPicker = (event: MouseEvent) => {
		const emojiButton = event.currentTarget as HTMLButtonElement;

		Manager.openEmojiPickerForReaction(
			reaction,
			emojiButton.getBoundingClientRect()
		);
	};

</script>

<div class="reaction-card-emoji-picker">
	<button
		class="reaction-card-emoji-button group"
		aria-label={`Change reaction emoji. Current emoji: ${reaction.emoji}`}
		aria-haspopup="dialog"
		// onclick={openEmojiPicker}
		onclick={(event) => {
			event.stopPropagation();
			Manager.openEmojiPickerForReaction(reaction, event.currentTarget.getBoundingClientRect());
		}}
	>
		<span class="reaction-card-emoji-icon">{reaction.emoji}</span>
	</button>
</div>


<style lang="postcss">
	@import "tailwindcss";
	@reference "../routes/layout.css";

	.reaction-card-emoji-picker {
		@apply relative;
	}

	.reaction-card-emoji-button {
		@apply pb-1;
		@apply relative;
		@apply w-20 aspect-square;
		@apply bg-orange-50;
		@apply rounded-full;
		@apply select-none;

		@apply drop-shadow-sm;

		@apply ring-4 ring-orange-200;

		@apply hover:bg-sky-600;
		@apply hover:ring-white;
	}

	.reaction-card-emoji-icon {
		@apply absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2;

		@apply text-4xl;
		@apply text-shadow-black/30;
		@apply text-shadow-md;

		@apply group-hover:scale-150;
		@apply group-hover:pb-8;
		@apply group-hover:text-shadow-black/25;
		@apply group-hover:text-shadow-lg;
		@apply transition-all duration-300;

		@apply group-hover:animate-wiggle;

		transform-origin: center;
		will-change: scale, rotate, padding-bottom;
	}


</style>
