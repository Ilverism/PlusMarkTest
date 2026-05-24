// src/lib/Manager.ts
import Reaction from "../Reaction.svelte";

class Manager {

	isGenerating: boolean = $state(false);
	didStartGenerate: boolean = $state(false);
	reactions: Reaction[] = $state([]);
	reactionEmojiEditing: Reaction | null = $state(null);
	reactionEmojiPickerOpen: boolean = $derived.by(() => {
		
		// No reaction being edited -> False
		if (this.reactionEmojiEditing === null)
			return false;

		// Reactions list no longer contains the reaction being edited -> False
		if (!this.reactions.some(r => r.uuid === this.reactionEmojiEditing?.uuid)) {
			//this.reactionEmojiEditing = null;
			return false;
		}

		return true;

	});

	output: string = $state("");
	outputDisplayed: string = $derived.by(() => {

		if (this.output.length > 0)
			return this.output;

		return "Generation failed or is taking longer than expected...";

	});

	constructor() {

		// Reset 'didStartGenerate' flag when reactions update
		$effect.root(() => {
			$effect(() => {
				this.reactions.forEach(r => r.name || r.emoji || r.description); // Track changes to reactions
				this.didStartGenerate = false;
			});

			return () => {
				// cleanup
			};
		});

		// EXAMPLE REACTIONS [EX]
		this.reactions.push(new Reaction());

	}

	/**
	 * Opens the emoji picker for a specific reaction, allowing the user to edit its emoji.
	 * 
	 * @param reaction - The Reaction for which to open the emoji picker
	 */
	openEmojiPickerForReaction(reaction: Reaction) {

		// Already editing this reaction -> Close picker
		if (this.reactionEmojiEditing?.uuid === reaction.uuid) {
			this.reactionEmojiEditing = null;
			return;
		}

		this.reactionEmojiEditing = reaction;

	}

	/**
	 * Adds a new reaction to the manager.
	 * 
	 * @param reaction - The new Reaction to add
	 */
	addReaction() {

		const newReaction = new Reaction();

		this.reactions.push(newReaction);

		console.log(`Added new reaction: ${newReaction.name}`);

	}

	/**
	 * Removes a reaction from the manager by its UUID.
	 * 
	 * @param uuid - The UUID of the Reaction to remove
	 * @return true if the reaction was found and removed, false otherwise
	 */
	removeReactionByUUID(uuid: string): boolean {

		const index = this.reactions.findIndex(r => r.uuid === uuid);

		// Reaction not found -> False
		if (index == -1)
			return false;

		this.reactions.splice(index, 1);
		return true;
		
	}

	/**
	 * Begins the HTML generation process for the current reactions.
	 * 
	 * @return The generated HTML code as a string
	 */
	generateStart(): string {

		// Flag as having started generation
		this.didStartGenerate = true;

		// Flag as generating
		this.isGenerating = true;

		// Generate HTML code for each reaction
		// ...

		// For now, automatically finish generation after a short delay (simulate async process)
		setTimeout(() => {
			this.generateFinish();
		}, 2000);

		return "";

	}

	/**
	 * Finishes the HTML generation process, resetting relevant state.
	 */
	generateFinish() {

		// Reset generation state
		this.isGenerating = false;

	}

}

const M = new Manager();
export default M as Manager;