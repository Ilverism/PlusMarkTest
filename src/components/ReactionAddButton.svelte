<!-- src/components/ReactionAddButton.svelte -->
<script lang="ts">
	import Manager from "$lib/Manager.svelte";
    import { slide } from "svelte/transition";
</script>

<button class="reaction-add-button" onclick={() => Manager.addReaction()} transition:slide|global={{duration: 10000}}>
	<div>＋ Add Reaction</div>
</button>


<style lang="postcss">
	@import "tailwindcss";

	.reaction-add-button {

		@apply mt-4;

		@apply text-gray-500;
		@apply px-4 py-2;

		@apply w-fit;

		@apply font-semibold;

		@apply bg-white;
		@apply rounded-full;

		@apply drop-shadow-lg;
		@apply drop-shadow-black/25;

		@apply flex items-center justify-center;
		
		@apply hover:bg-sky-600;
		@apply hover:text-white;
		@apply hover:scale-110;
		@apply transition-transform;

		@apply select-none;
	}
</style>