// src/lib/Manager.ts
import Reaction from "../Reaction.svelte";
import { buildMarkdownSnippet, createWidgetInput, slugifyContentId } from "$lib/widget";

export type EmojiPickerAnchorRect = {
	top: number;
	right: number;
	bottom: number;
	left: number;
	width: number;
	height: number;
};

class Manager {

	isGenerating: boolean = $state(false);
	didStartGenerate: boolean = $state(false);
	contentId: string = $state("");
	returnUrl: string = $state("");
	error: string = $state("");
	reactions: Reaction[] = $state([]);
	reactionEmojiEditing: Reaction | null = $state(null);
	reactionEmojiPickerPosition: EmojiPickerAnchorRect | null = $state(null);
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

		if (this.error.length > 0)
			return this.error;

		return "Generation failed or is taking longer than expected...";

	});

	constructor() {
		// EXAMPLE REACTIONS [EX]
		this.reactions.push(new Reaction());

	}

	/**
	 * Opens the emoji picker for a specific reaction, allowing the user to edit its emoji.
	 * 
	 * @param reaction - The Reaction for which to open the emoji picker
	 * @param buttonRect - The bounding rectangle of the emoji button, used for positioning the picker
	 */
	openEmojiPickerForReaction(reaction: Reaction, buttonRect: DOMRect) {

		// Already editing this reaction -> Close picker
		if (this.reactionEmojiEditing?.uuid === reaction.uuid) {
			this.reactionEmojiEditing = null;
			return;
		}

		this.reactionEmojiEditing = reaction;
		this.reactionEmojiPickerPosition = {
			top: buttonRect.top,
			right: buttonRect.right,
			bottom: buttonRect.bottom,
			left: buttonRect.left,
			width: buttonRect.width,
			height: buttonRect.height
		};

	}

	/**
	 * Closes the emoji picker and clears the editing state.
	 */
	closeEmojiPicker() {
		this.reactionEmojiEditing = null;
		this.reactionEmojiPickerPosition = null;
	}

	/**
	 * Adds a new reaction to the manager.
	 * 
	 * @param reaction - The new Reaction to add
	 */
	addReaction() {

		const newReaction = new Reaction();

		this.reactions.push(newReaction);
		this.markDirty();

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
		this.markDirty();
		return true;
		
	}

	/**
	 * Begins the HTML generation process for the current reactions.
	 * 
	 * @return The generated HTML code as a string
	 */
	setReturnUrl(value: string) {
		this.returnUrl = value;
		this.markDirty();

		if (this.contentId.trim().length === 0)
			this.contentId = slugifyContentId(value);
	}

	setContentId(value: string) {
		this.contentId = value;
		this.markDirty();
	}

	markDirty() {
		this.didStartGenerate = false;
		this.output = "";
		this.error = "";
	}

	/**
	 * Begins the Markdown generation process for the current reactions.
	 */
	async generateStart(): Promise<string> {

		// Flag as having started generation
		this.didStartGenerate = true;

		// Flag as generating
		this.isGenerating = true;
		this.output = "";
		this.error = "";

		const widgetInput = createWidgetInput({
			doc: this.contentId,
			returnUrl: this.returnUrl,
			reactions: this.reactions.map((reaction) => ({
				emoji: reaction.emoji,
				name: reaction.name,
				description: reaction.description
			}))
		});

		if (!widgetInput) {
			this.error = "Enter a valid return URL and at least one reaction.";
			this.generateFinish();
			return "";
		}

		this.contentId = widgetInput.doc;
		this.returnUrl = widgetInput.returnUrl;

		const editTokenStorageKey = `plusmark:edit-token:${widgetInput.doc}`;
		const editToken = localStorage.getItem(editTokenStorageKey);

		try {
			const response = await fetch("/api/widgets", {
				method: "POST",
				headers: {
					"content-type": "application/json"
				},
				body: JSON.stringify({
					...widgetInput,
					editToken
				})
			});

			const body = await response.json() as {
				widget?: typeof widgetInput;
				editToken?: string;
				error?: string;
			};

			if (!response.ok || !body.widget) {
				this.error = body.error ?? "Generation failed.";
				return "";
			}

			if (body.editToken) {
				localStorage.setItem(editTokenStorageKey, body.editToken);
			}

			this.output = buildMarkdownSnippet(body.widget, window.location.origin);
			return this.output;
		} catch {
			this.error = "Generation failed. Check that the Worker preview server is running.";
			return "";
		} finally {
			this.generateFinish();
		}


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
