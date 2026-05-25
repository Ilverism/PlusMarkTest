<!-- src/components/EmojiPicker.svelte -->
<script lang="ts">
    import type { EmojiCategory } from "$lib/emoji";
    import { onMount } from "svelte";
	import Manager from "$lib/Manager.svelte";
    import { fade, scale } from "svelte/transition";
    import { cubicInOut, cubicOut } from "svelte/easing";
    import { BadgeQuestionMark, Loader, LoaderCircle, Triangle } from "@lucide/svelte";

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

	const selectEmoji = (selectedEmoji: string) => {

		Manager.reactionEmojiEditing!.emoji = selectedEmoji;
		search = "";
		
	};

	const selectCategory = (categoryId: string) => {
		activeCategoryId = categoryId;
		search = "";
	};

	let hasCategoriesAvailable = $derived(categories.length > 0);

	const REM_SCALE = 4.0;
	const pickerWidth = 96 * REM_SCALE;
	const pickerHeight = 80 * REM_SCALE;
	const pickerGap = 12;

	const anchorRect = $derived(Manager.reactionEmojiPickerPosition);
	const pickerPosition = $derived.by(() => {

		const ANCHOR_PADDING = 8;
		const ANCHOR_POS_DEFAULT = {top: 16, left: 16};

		// No anchor position available -> Default to top-left corner
		if (anchorRect === null)
			return ANCHOR_POS_DEFAULT;

		console.log("Anchor Rect:", anchorRect);

		const preferredTop = anchorRect.top - pickerHeight - pickerGap;
		const fallbackTop = anchorRect.bottom + pickerGap;

		const top = (preferredTop >= ANCHOR_PADDING)
			? preferredTop
			: fallbackTop;

		const centeredLeft = anchorRect.left + (anchorRect.width / 2) - (pickerWidth / 2);

		const left = Math.min(
			Math.max(centeredLeft, ANCHOR_PADDING),
			window.innerWidth - pickerWidth - ANCHOR_PADDING
		);

		return {
			top,
			left
		};

	});

	onMount(() => {

		// Load emoji data when the component is mounted
		void loadEmojiData();

		// Close the emoji picker when the window is resized to prevent mispositioning
		const close = () => {
			Manager.closeEmojiPicker();
		};

		const targetElement = document.getElementById('emoji-picker-container');
		document.addEventListener('click', (event) => {

			// Target element not found
			if (!targetElement)
				return;

			// // event.target is typed as EventTarget | null; ensure it's a Node before calling contains
			// const maybeNode = event.target;
			// if (!(maybeNode instanceof Node))
			// 	return;

			// if (!targetElement.contains(maybeNode))
			// 	close();
		});

		window.addEventListener("resize", close);
		return () => {
			window.removeEventListener("resize", close);
		};
	
	});

</script>

<div
	id="emoji-picker-container"
	class="emoji-picker-container"
	style="top: {pickerPosition.top}px; left: {pickerPosition.left}px;"
>

	<div
		in:scale={{duration: 300, start: 0.00, easing: cubicOut}}
		out:scale={{duration: 300, start: 0.00, easing: cubicOut}}
		class="emoji-picker-transition-layer"
	>

		<!-- Emoji Picker Content -->
		<div
			class="reaction-card-emoji-menu"
			role="dialog"
		>
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
			<div class="reaction-card-emoji-grid py-4">
				{#if isLoadingEmoji}
					<div transition:fade={{duration: 400, easing: cubicInOut}} class="animate-spin text-orange-200 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
						<LoaderCircle size={64} strokeWidth={4}  />
					</div>
				{:else}
					{#each visibleEmojis as entry, index (entry.emoji)}
						<button
							class="reaction-card-emoji-option group"
							aria-label={entry.name}
							title={entry.name}
							onclick={() => selectEmoji(entry.emoji)}
						>
							<div class="reaction-card-emoji-option-icon">
								{entry.emoji}
							</div>
						</button>

					<!-- No Emoji Found Message -->
					{:else}
						<!-- <p class="reaction-card-emoji-empty">No emoji found.</p> -->
						<div transition:fade={{duration: 400, easing: cubicInOut}} class="animate-pulse text-orange-200 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
							<BadgeQuestionMark size={64} strokeWidth={2}  />
						</div>
					{/each}
				{/if}
			</div>

			<!-- Error Message -->
			{#if didFailToLoadEmojiFile}
				<p class="reaction-card-emoji-note">Could not load emoji list.</p>
			{/if}

			<!-- Down arrow icon (Fill Illusion) -->
			<Triangle fill={"var(--color-orange-300)"} class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 text-orange-300 rotate-180" size={24} strokeWidth={4} />
			


		</div>
		
		<!-- Down arrow icon (Bottom Stroke) -->
		<Triangle fill={"var(--color-orange-300)"} class="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-1/3 text-orange-200 rotate-180" size={24} strokeWidth={4} />

	</div>


</div>


<style lang="postcss">

	@reference "tailwindcss";
	@reference "../routes/layout.css";

	input {
		@apply bg-orange-50;
		@apply ring-2 ring-orange-200;
		@apply px-2 py-1;
		@apply rounded-md;
		@apply w-full;

		@apply drop-shadow-sm;
	}


	.emoji-picker-container {

		@apply select-none;

		@apply fixed;
		@apply z-50;

		@apply w-96 h-80;

		@apply flex items-start justify-center;

		@apply drop-shadow-sm;
	}

	.emoji-picker-transition-layer {
		@apply relative;
		@apply w-full h-full;

		will-change: transform, opacity;
		transform-origin: bottom center;
		/* contain: paint; */
	}

	.reaction-card-emoji-menu {
		@apply overflow-visible;
		
		@apply fixed;

		@apply w-full h-full;
		@apply p-2;

		@apply rounded-lg;
		@apply bg-orange-300;

		@apply z-100;

		@apply flex flex-col;
	
		@apply border-b-4 border-orange-200;

	}

	.reaction-card-emoji-categories {

		@apply pointer-events-none;
		@apply **:pointer-events-auto;
		
		@apply bg-orange-200;
		@apply rounded-md;
		@apply w-fit mx-auto;
		@apply px-2 py-1;
		@apply flex items-center justify-center gap-1;
		@apply mt-2 mb-1;

		@apply relative;
	}

	.reaction-card-emoji-categories::before {
		content: "";
		position: absolute;

		/* width: 1.75rem; */
		@apply w-9;
		@apply aspect-square;
		corner-shape: squircle;
		border-radius: 9999px;

		background: rgb(0 0 0 / 0.15);
		pointer-events: none;

		position-anchor: --category-indicator;
		left: anchor(center);
		top: anchor(center);
		transform: translate(-50%, -50%);

		transition:
			left 160ms ease,
			top 160ms ease;
	}

	.reaction-card-emoji-category {
		position: relative;
		z-index: 1;
	}

	.reaction-card-emoji-category-icon {
		@apply text-shadow-2xs text-shadow-black/30;
		@apply group-hover:scale-150;
		@apply transition-transform;

		@apply text-2xl;

		@apply relative;
		@apply z-2;
	}

	.reaction-card-emoji-categories:not(:hover)
		.reaction-card-emoji-category-active {
		anchor-name: --category-indicator;
	}
	.reaction-card-emoji-category:hover {
		anchor-name: --category-indicator;
	}

	.reaction-card-emoji-grid {
		@apply h-full;
		@apply overflow-y-auto overflow-x-hidden;
		@apply relative;
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		
		@apply gap-1;
		
		@apply mt-2;
		
		border-bottom: 0;
		border-right: 0;
	}

	.reaction-card-emoji-option {

		@apply relative;

		@apply w-10 aspect-square;


		@apply bg-orange-50;
		@apply rounded-full;

		@apply border-2;
		@apply border-orange-200;
		@apply hover:border-white;
		@apply hover:bg-sky-600;

		@apply text-shadow-2xs text-shadow-black/30;

	}

	.reaction-card-emoji-option-icon {

		@apply absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2;

		@apply text-xl;
		@apply text-shadow-black/30;
		@apply text-shadow-md;

		@apply group-hover:scale-150;
		@apply group-hover:pb-4;
		@apply group-hover:text-shadow-black/25;
		@apply group-hover:text-shadow-lg;
		@apply transition-all duration-300;

		@apply group-hover:animate-wiggle;

		transform-origin: center;
		will-change: scale, rotate, padding-bottom;

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