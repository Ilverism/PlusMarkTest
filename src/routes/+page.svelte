<!-- src/routes/+page.svelte -->
<script>
    import ReactionCard from "../components/ReactionCard.svelte";
	import Manager from "$lib/Manager.svelte";
    import MainCard from "../components/MainCard.svelte";
    import ReactionAddButton from "../components/ReactionAddButton.svelte";
    import { flip } from "svelte/animate";
    import TextButton from "../components/TextButton.svelte";
	import { SiKofi } from "@icons-pack/svelte-simple-icons";
    import { ExternalLink } from "@lucide/svelte";
    import EmojiPicker from "../components/EmojiPicker.svelte";
    import { cubicOut } from "svelte/easing";
    import LanguagePicker from "../components/LanguagePicker.svelte";
    import { __support } from "$lib/paraglide/messages";

</script>

<div class="page-body noto-sans w-full">

	<div class="page-content">

		<!-- Main Card -->
		<MainCard />

		<!-- Reaction Items -->
		<div class="reaction-items" class:reaction-items-disabled={Manager.isGenerating}>

			{#each Manager.reactions as reaction (reaction.uuid)}
				<div animate:flip={{duration: 300, easing: cubicOut}}>
					<ReactionCard {reaction} />
				</div>
			{:else}
				<p>No reactions yet!</p>
			{/each}

			<!-- Add Reaction Button -->
			<ReactionAddButton />

		</div>

	</div>

	<!-- Corner Buttons -->
	<TextButton link="https://github.com" cLass="absolute top-4 left-4 flex gap-2 group hover:scale-105">
		<!-- <SiGithub size={18} />
		<span>GitHub</span> -->

		<img src="/PlusMark-logo.svg" alt="PlusMark Logo" class="main-card-logo w-16"/>

		<!-- ... -->
		<div class="flex flex-col items-start">
			<span class="text-base font-black group-hover:underline">PlusMark</span>

			<!-- Not Hovering -> Show Version & Date -->
			<span class="text-xs text-gray-600 font-light group-hover:hidden">ver. 2026-05.23 (Beta)</span>
			<span class="text-xs text-gray-600 font-light not-group-hover:hidden flex gap-1 items-center">
				<ExternalLink  size={16}/>
				Open in GitHub</span>
		</div>

	</TextButton>
	<TextButton link="https://github.com" cLass="absolute bottom-4 left-4 hover:underline">
		<SiKofi size={18} />
		<span>{__support()} (Ko-fi)</span>
	</TextButton>
	<LanguagePicker cLass="absolute bottom-4 right-4" />

	<!-- Emoji Picker -->
	{#if Manager.reactionEmojiPickerOpen}
		<EmojiPicker />
	{/if}

</div>



<style lang="postcss">
	@import "tailwindcss";

	.page-body {
		@apply relative;

		@apply flex items-center justify-center;
	}

	.page-content {
		@apply p-8;

		@apply flex items-center gap-6;
	}

	.reaction-items {
		@apply flex-1;

		@apply flex flex-col items-center gap-4;

		@apply transition-all duration-400;
	}

	.reaction-items-disabled {
		@apply opacity-50;
		@apply pointer-events-none;
		@apply select-none;
	}



</style>
