<!-- src/components/ReactionCardEmoji.svelte -->
<script lang="ts">

	type Props = {
		emoji: string
	};
	let { 
		emoji
	}: Props = $props();

</script>

<button class="reaction-card-emoji-button group">
	<span class="reaction-card-emoji-icon">{emoji}</span>
</button>



<style lang="postcss">
	@import "tailwindcss";
	@reference "../routes/layout.css";

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
	}

</style>