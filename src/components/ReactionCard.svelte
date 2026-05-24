<!-- src/components/ReactionCard.svelte -->
<script lang="ts">
	import Manager from "$lib/Manager.svelte";
    import { fly } from "svelte/transition";
    import Reaction from "../Reaction.svelte";
    import ReactionCardEmoji from "./ReactionCardEmoji.svelte";
    import { cubicOut } from "svelte/easing";

	type Props = {
		reaction: Reaction
	};
	let { 
		reaction
	}: Props = $props();

	const removeThisReaction = () => {
		Manager.removeReactionByUUID(reaction.uuid);
	};

	const reactionRemovalAllowed = $derived(Manager.reactions.length > 1);

</script>

<div
	class="reaciton-card-body"
	in:fly={{duration: 400, easing: cubicOut, x: 400, y: 0}}
	out:fly={{duration: 400, easing: cubicOut, x: 400, y: 0}}
>

	<!-- Emoji -->
	<ReactionCardEmoji reaction={reaction} />

	<!-- Content -->
	<div>
		<input class="text-xl font-semibold mb-2" bind:value={reaction.name} placeholder="Name" />
		<input class="text-gray-600" bind:value={reaction.description} placeholder="Description (optional)" />
	</div>

	<!-- Remove Button -->
	<button class="reaction-card-remove-button" onclick={removeThisReaction} disabled={!reactionRemovalAllowed}>
		<div>━</div>
	</button>

</div>



<style lang="postcss">
	@import "tailwindcss";

	.reaciton-card-body {

		@apply bg-orange-300;
		@apply w-lg aspect-5/1;
		@apply rounded-xl;
		@apply px-6 py-4;

		@apply flex items-center gap-6;

		@apply drop-shadow-sm;

		@apply relative;
	}

	.reaction-card-remove-button {
		@apply absolute top-0 right-0 translate-x-1/2 -translate-y-1/2;
		@apply text-gray-500;
		@apply p-1;

		@apply w-6 aspect-square;

		@apply font-black;

		@apply bg-white;
		@apply rounded-full;

		@apply drop-shadow-lg;
		@apply drop-shadow-black/25;

		@apply flex items-center justify-center;
		
		@apply *:absolute;
		@apply *:pb-1;

		@apply enabled:hover:bg-orange-600;
		@apply enabled:hover:text-white;
		@apply enabled:hover:scale-125;
		@apply transition-transform;

		@apply select-none;
	}

	input {
		@apply bg-orange-50;
		@apply ring-2 ring-orange-200;
		@apply px-2 py-1;
		@apply rounded-md;
		@apply w-full;

		@apply drop-shadow-sm;
	}

</style>
