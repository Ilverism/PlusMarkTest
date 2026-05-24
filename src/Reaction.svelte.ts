// src/Reaction.svelte.ts
export default class Reaction {

	emoji: string = $state("🎓");
	name: string = $state("Thumbs Up");
	description: string = $state("Like this message!");

	uuid: string = crypto.randomUUID();

}