<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Pathname } from '$app/types';
	import favicon from '$lib/assets/favicon.svg';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import './layout.css';
	import Manager from "$lib/Manager.svelte";
    import { fade } from 'svelte/transition';

	let { children } = $props();
</script>

<!-- Background -->
{#if !Manager.isGenerating}
	<div class="background" transition:fade={{duration: 500}}>
	</div>
{/if}

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}

<div style="display:none">
	{#each locales as locale (locale)}
		<a
			href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}
		>{locale}</a>
	{/each}
</div>


<style lang="postcss">

	@import "tailwindcss";
	@reference "./layout.css";

	.background {
		@apply bg-orange-200;
		@apply w-full h-full;
		@apply absolute;
	}

	:global(html) {
		--bg-grad-color-1: var(--color-orange-200);
		--bg-grad-color-2: var(--color-orange-300);
		@apply bg-[repeating-linear-gradient(-80deg,var(--bg-grad-color-1),var(--bg-grad-color-1)_120px,var(--bg-grad-color-2)_120px,var(--bg-grad-color-2)_240px)];
		@apply animate-slide-background;
		background-size: 200% 100%;
	}

	:global(body) {
		@apply relative;
		@apply flex;
		@apply min-h-screen;
	}

</style>
