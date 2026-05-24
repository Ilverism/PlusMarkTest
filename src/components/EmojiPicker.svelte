<!-- src/components/EmojiPicker.svelte -->
<script lang="ts">
    import type { EmojiCategory } from "$lib/emoji";
    import { onMount } from "svelte";
	import Manager from "$lib/Manager.svelte";
    import { fade } from "svelte/transition";

	let search = $state("");
	let categories = $state<EmojiCategory[]>([]);
	let activeCategoryId = $state("reactions");
	let isLoadingEmoji = $state(false);
	let didFailToLoadEmojiFile = $state(false);

	const normalizedSearch = $derived(search.trim().toLowerCase());

	const activeCategory = $derived.by(() => {
		return categories.find((category) => category.id === activeCategoryId)
			?? categories[0]
			?? null;
	});

	const allEmojis = $derived.by(() => {
		return categories.filter((category) => category.label !== "Reactions").flatMap((category) => category.emojis);
	});

	const visibleEmojis = $derived.by(() => {
		if (normalizedSearch) {
			return allEmojis.filter((entry) => {
				return entry.keywords.includes(normalizedSearch);
			});
		}

		return activeCategory?.emojis ?? [];
	});

	const loadEmojiData = async () => {
		if (categories.length > 0 || isLoadingEmoji) return;

		isLoadingEmoji = true;

		try {
			const module = await import("$lib/generated/reaction-emojis.json");
			const loadedCategories = module.default as EmojiCategory[];

			categories = loadedCategories;

			if (loadedCategories.some((category) => category.id === "reactions")) {
				activeCategoryId = "reactions";
			} else {
				activeCategoryId = loadedCategories[0]?.id ?? "";
			}

			didFailToLoadEmojiFile = false;
		} catch {
			didFailToLoadEmojiFile = true;
		} finally {
			isLoadingEmoji = false;
		}
	};
	onMount(() => {
		void loadEmojiData();
	});

	// const togglePicker = () => {
	// 	isPickerOpen = !isPickerOpen;

	// 	if (isPickerOpen)
	// 		void loadEmojiData();
	// };

	const selectEmoji = (selectedEmoji: string) => {
		// onEmojiChange(selectedEmoji);

		Manager.reactionEmojiEditing!.emoji = selectedEmoji;
		search = "";
		
	};

	const selectCategory = (categoryId: string) => {
		activeCategoryId = categoryId;
		search = "";
	};

	let hasCategoriesAvailable = $derived(categories.length > 0);

</script>


<div class="reaction-card-emoji-menu" role="dialog" aria-label="Choose reaction emoji">
	<input
		class="reaction-card-emoji-search"
		type="search"
		placeholder="Search emoji"
		bind:value={search}
	/>

	<!-- Category Tabs -->
	{#if hasCategoriesAvailable}
		<div class="reaction-card-emoji-categories" aria-label="Emoji categories">
			{#each categories as category (category.id)}
				<button
					type="button"
					class="reaction-card-emoji-category group"
					class:reaction-card-emoji-category-active={!normalizedSearch && activeCategoryId === category.id}
					aria-label={category.label}
					title={category.label}
					onclick={() => selectCategory(category.id)}
				>
					<div class="reaction-card-emoji-category-icon">
						{category.icon}
					</div>
				</button>
			{/each}
		</div>
	{/if}

	<!-- Emoji Grid -->
	<div class="reaction-card-emoji-grid">
		{#if isLoadingEmoji}
			<p class="reaction-card-emoji-empty">Loading emoji...</p>
		{:else}
			{#each visibleEmojis as entry, index (entry.emoji)}
				<button
					class="reaction-card-emoji-option"
					aria-label={entry.name}
					title={entry.name}
					onclick={() => selectEmoji(entry.emoji)}
				>
					{entry.emoji}
				</button>
			{:else}
				<p class="reaction-card-emoji-empty">No emoji found.</p>
			{/each}
		{/if}
	</div>

	<!-- Error Message -->
	{#if didFailToLoadEmojiFile}
		<p class="reaction-card-emoji-note">Could not load emoji list.</p>
	{/if}
	
</div>


<style lang="postcss">

	@reference "tailwindcss";

	input {
		@apply bg-orange-50;
		@apply ring-2 ring-orange-200;
		@apply px-2 py-1;
		@apply rounded-md;
		@apply w-full;

		@apply drop-shadow-sm;
	}


	.reaction-card-emoji-menu {
		@apply absolute top-16 left-16;
		@apply w-80 h-64;
		@apply p-2;

		@apply rounded-lg;
		@apply bg-orange-300;

		@apply z-100;

		@apply flex flex-col;

		@apply drop-shadow-sm;
	}

	.reaction-card-emoji-categories {

		@apply bg-orange-50;
		@apply rounded-md;
		@apply w-fit mx-auto;
		@apply px-2 py-1;
		@apply flex items-center justify-center gap-1;
		@apply mt-2 mb-1;
	}

	.reaction-card-emoji-category {

		&::before {
			content: '';
			position: absolute;
			@apply absolute -translate-x-1/2 translate-y-1/2;
			left: anchor(left);
			right: anchor(right);
			bottom: anchor(bottom);
			/* height: 10px; */
			@apply w-4 aspect-square;
			@apply rounded-full;
			/* background: black/5 */
			@apply bg-black/30;

			position-anchor: --hovered-category-indicator;

			@apply pointer-events-none;
		}

	}

	.reaction-card-emoji-category-icon {
		@apply text-shadow-2xs text-shadow-black/30;
		@apply group-hover:scale-175;
		@apply transition-transform;

		@apply z-100;
	}

	.reaction-card-emoji-category:hover {
		anchor-name: --hovered-category-indicator;
	}


	.reaction-card-emoji-grid {
		@apply h-full;
		@apply overflow-y-auto overflow-x-hidden;
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		/* gap: 4; */
		@apply gap-1;
		/* max-height: 16rem; */
		/* margin-top: 0.5rem; */
		@apply mt-2;
		/* overflow-y: auto; */
		/* border: 1px solid black; */
		border-bottom: 0;
		border-right: 0;
	}

	.reaction-card-emoji-option {
		/* aspect-ratio: 1; */
		/* font-size: 1.25rem; */
		/* line-height: 1; */

		@apply w-8 aspect-square;

		@apply bg-orange-50;
		@apply rounded-full;

		@apply border-2;
		@apply border-orange-200;
		@apply hover:border-white;
		@apply hover:bg-sky-600;

		@apply text-shadow-2xs text-shadow-black/30;
	}

	.reaction-card-emoji-empty,
	.reaction-card-emoji-note {
		margin: 0;
		color: black;
		font-size: 0.75rem;
	}

	.reaction-card-emoji-empty {
		grid-column: 1 / -1;
		padding: 0.75rem;
	}

	.reaction-card-emoji-note {
		margin-top: 0.5rem;
	}


</style>