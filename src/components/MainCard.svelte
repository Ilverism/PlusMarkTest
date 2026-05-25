<!-- src/components/MainCard.svelte -->
<script lang="ts">

	import Manager from "$lib/Manager.svelte";
    import { __generate_HTML_button, __tagline, __instructions_header, __instructions_step_1, __instructions_step_2, __instructions_step_3 } from "$lib/paraglide/messages";
    import { CirclePlay } from "@lucide/svelte";
    import { backIn, backOut } from "svelte/easing";
    import { scale, slide } from "svelte/transition";

</script>

<div class="main-card">

	<!-- Header & Tagline -->
    <h2 class="ml-4">PlusMark</h2>
	<p class="text-gray-600 mt-4 px-4">
		{@html __tagline()}
	</p>

	<!-- Instructions -->
	<hr class="border-orange-200 border-2 drop-shadow-xs drop-shadow-black/30 mt-4"/>
	<h3 class="ml-4 underline mt-4">{__instructions_header()}</h3>
	<ol class="mt-4 list-decimal list-inside">
		<li>{@html __instructions_step_1()}</li>
		<li>{@html __instructions_step_2()}</li>
		<li>{@html __instructions_step_3()}</li>
	</ol>

	<!-- Generated HTML -->
	{#if Manager.didStartGenerate}
		<div
			class="main-card-generated-container"
			in:slide={{duration: 400, delay: 600 }}
			out:slide={{duration: 400}}
		>
			<hr class="border-orange-200 border-2 drop-shadow-xs drop-shadow-black/30 mt-4"/>
			<h3 class="ml-4 underline mt-4">Output</h3>
			<div class="main-card-generated">
				<code>
				{Manager.outputDisplayed}
				</code>
			</div>
		</div>
	{/if}

	<!-- Generate Button -->
	{#if !Manager.didStartGenerate}
		<button
			class="main-card-generate-button"
			onclick={() => Manager.generateStart()}
			in:scale={{duration: 400, easing: backOut }}
			out:scale={{duration: 400, easing: backIn }}
		>
			<CirclePlay />
			{@html __generate_HTML_button()}
		</button>
	{/if}

</div>



<style lang="postcss">

	@import "tailwindcss";

	.main-card {
		@apply px-6 py-8;

		@apply bg-orange-300;
		@apply rounded-xl;
		@apply w-lg h-fit;

		@apply drop-shadow-sm;

		@apply relative;

		@apply border-b-4 border-orange-200;
	}

	.main-card-generate-button {

		@apply absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2;
		@apply ring-4 ring-orange-200;

		@apply mt-4;

		@apply text-gray-500;
		@apply px-4 py-2;

		@apply w-fit;

		@apply font-semibold;

		@apply bg-white;
		@apply rounded-full;
		
		@apply flex items-center justify-center gap-2;
		
		@apply hover:bg-sky-600;
		@apply hover:text-white;
		@apply hover:scale-110;
		@apply transition-transform;

		@apply select-none;
	}

	/* .main-card-logo {
		@apply absolute top-0 right-0 translate-x-1/2 -translate-y-1/2;
		@apply opacity-50;
		@apply scale-25;
		@apply drop-shadow-lg drop-shadow-black/30;
	} */

	.main-card-generated-container {
		@apply mt-4;
		@apply overflow-hidden;
	}

	.main-card-generated {

		@apply rounded-md;
		@apply h-48;

		@apply mt-4 mb-4;
		@apply px-4 py-2;
		@apply bg-orange-50;

		@apply overflow-y-scroll;
		@apply scrollbar-thin;
		@apply scrollbar-thumb-orange-200;

		@apply wrap-anywhere;
		@apply select-all;
	}

	h2 {
		@apply text-5xl;
		@apply font-semibold;
		@apply underline;
		@apply text-gray-700;
	}

	h3 {
		@apply text-2xl;
		@apply font-semibold;
		@apply text-gray-700;
	}

	ol {
		@apply font-semibold;
	}

	p {
		@apply text-xl;
		@apply italic;
	}

</style>