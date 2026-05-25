import { DurableObject } from 'cloudflare:workers';
import type { PublicWidget, PublicWidgetReaction, WidgetReactionInput } from '$lib/widget';

type SqlRow = Record<string, ArrayBuffer | string | number | null>;

type WidgetRow = SqlRow & {
	doc: string;
	return_url: string;
	edit_token_hash: string;
	created_at: number;
	updated_at: number;
};

type ReactionRow = SqlRow & {
	id: string;
	emoji: string;
	label: string;
	description: string;
	sort_order: number;
	count: number | null;
};

type SaveWidgetCommand = {
	widget: {
		doc: string;
		returnUrl: string;
		reactions: WidgetReactionInput[];
	};
	editTokenHash: string | null;
	createEditTokenHash: string;
};

type RpcFailure = {
	ok: false;
	status: number;
	message: string;
};

type WidgetSuccess = {
	ok: true;
	widget: PublicWidget;
	created: boolean;
};

type BadgeSuccess = {
	ok: true;
	reaction: PublicWidgetReaction;
};

type ToggleSuccess = {
	ok: true;
	count: number;
	active: boolean;
	returnUrl: string;
};

export class ReactionDocument extends DurableObject {
	private initialized = false;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.initialize();
	}

	async saveWidget(command: SaveWidgetCommand): Promise<WidgetSuccess | RpcFailure> {
		const saveResult = this.ctx.storage.transactionSync(() => {
			const existing = this.getWidgetRow();
			const now = Date.now();

			if (existing && existing.edit_token_hash !== command.editTokenHash) {
				return {
					ok: false,
					status: command.editTokenHash ? 403 : 409,
					message: command.editTokenHash
						? 'The edit token is not valid for this content ID.'
						: 'This content ID already exists. An edit token is required to update it.'
				} satisfies RpcFailure;
			}

			if (existing) {
				this.ctx.storage.sql.exec(
					'UPDATE widget SET return_url = ?, updated_at = ? WHERE doc = ?',
					command.widget.returnUrl,
					now,
					command.widget.doc
				);
			} else {
				this.ctx.storage.sql.exec(
					'INSERT INTO widget (doc, return_url, edit_token_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
					command.widget.doc,
					command.widget.returnUrl,
					command.createEditTokenHash,
					now,
					now
				);
			}

			this.replaceReactions(command.widget.reactions);

			return {
				ok: true as const,
				created: !existing
			};
		});

		if (!saveResult.ok) return saveResult;

		const widget = this.readWidget();
		if (!widget) {
			return {
				ok: false,
				status: 500,
				message: 'The widget could not be read after saving.'
			};
		}

		return {
			ok: true,
			widget,
			created: saveResult.created
		};
	}

	async getWidget(): Promise<WidgetSuccess | RpcFailure> {
		const widget = this.readWidget();

		if (!widget) {
			return {
				ok: false,
				status: 404,
				message: 'Unknown content ID.'
			};
		}

		return {
			ok: true,
			widget,
			created: false
		};
	}

	async getBadge(reactionId: string): Promise<BadgeSuccess | RpcFailure> {
		const widget = this.getWidgetRow();
		if (!widget) {
			return {
				ok: false,
				status: 404,
				message: 'Unknown content ID.'
			};
		}

		const reaction = this.readReaction(reactionId);
		if (!reaction) {
			return {
				ok: false,
				status: 404,
				message: 'Unknown reaction.'
			};
		}

		return {
			ok: true,
			reaction
		};
	}

	async toggleReaction(reactionId: string, voterHash: string): Promise<ToggleSuccess | RpcFailure> {
		const result = this.ctx.storage.transactionSync(() => {
			const widget = this.getWidgetRow();
			if (!widget) {
				return {
					ok: false,
					status: 404,
					message: 'Unknown content ID.'
				} satisfies RpcFailure;
			}

			const reaction = this.readReaction(reactionId);
			if (!reaction) {
				return {
					ok: false,
					status: 404,
					message: 'Unknown reaction.'
				} satisfies RpcFailure;
			}

			const vote = this.ctx.storage.sql
				.exec(
					'SELECT voter_hash FROM votes WHERE reaction = ? AND voter_hash = ? LIMIT 1',
					reactionId,
					voterHash
				)
				.toArray()[0];

			let active = true;

			if (vote) {
				active = false;
				this.ctx.storage.sql.exec(
					'DELETE FROM votes WHERE reaction = ? AND voter_hash = ?',
					reactionId,
					voterHash
				);
				this.ctx.storage.sql.exec(
					'UPDATE counts SET count = CASE WHEN count > 0 THEN count - 1 ELSE 0 END WHERE reaction = ?',
					reactionId
				);
			} else {
				this.ctx.storage.sql.exec(
					'INSERT INTO votes (reaction, voter_hash, created_at) VALUES (?, ?, ?)',
					reactionId,
					voterHash,
					Date.now()
				);
				this.ctx.storage.sql.exec(
					'INSERT OR IGNORE INTO counts (reaction, count) VALUES (?, 0)',
					reactionId
				);
				this.ctx.storage.sql.exec(
					'UPDATE counts SET count = count + 1 WHERE reaction = ?',
					reactionId
				);
			}

			const count = Number(
				this.ctx.storage.sql
					.exec<{ count: number }>('SELECT count FROM counts WHERE reaction = ? LIMIT 1', reactionId)
					.toArray()[0]?.count ?? 0
			);

			return {
				ok: true,
				count,
				active,
				returnUrl: widget.return_url
			} satisfies ToggleSuccess;
		});

		return result;
	}

	private initialize() {
		if (this.initialized) return;

		const sql = this.ctx.storage.sql;
		sql.exec(
			'CREATE TABLE IF NOT EXISTS widget (doc TEXT PRIMARY KEY, return_url TEXT NOT NULL, edit_token_hash TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)'
		);
		sql.exec(
			'CREATE TABLE IF NOT EXISTS reactions (id TEXT PRIMARY KEY, emoji TEXT NOT NULL, label TEXT NOT NULL, description TEXT NOT NULL DEFAULT \'\', sort_order INTEGER NOT NULL)'
		);
		sql.exec(
			'CREATE TABLE IF NOT EXISTS counts (reaction TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0)'
		);
		sql.exec(
			'CREATE TABLE IF NOT EXISTS votes (reaction TEXT NOT NULL, voter_hash TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (reaction, voter_hash))'
		);

		this.initialized = true;
	}

	private replaceReactions(reactions: WidgetReactionInput[]) {
		const ids = reactions.map((reaction) => reaction.id);
		const placeholders = ids.map(() => '?').join(', ');

		this.ctx.storage.sql.exec(`DELETE FROM reactions WHERE id NOT IN (${placeholders})`, ...ids);
		this.ctx.storage.sql.exec(`DELETE FROM counts WHERE reaction NOT IN (${placeholders})`, ...ids);
		this.ctx.storage.sql.exec(`DELETE FROM votes WHERE reaction NOT IN (${placeholders})`, ...ids);

		reactions.forEach((reaction, index) => {
			this.ctx.storage.sql.exec(
				`INSERT INTO reactions (id, emoji, label, description, sort_order)
					VALUES (?, ?, ?, ?, ?)
					ON CONFLICT(id) DO UPDATE SET
						emoji = excluded.emoji,
						label = excluded.label,
						description = excluded.description,
						sort_order = excluded.sort_order`,
				reaction.id,
				reaction.emoji,
				reaction.label,
				reaction.description,
				index
			);
			this.ctx.storage.sql.exec(
				'INSERT OR IGNORE INTO counts (reaction, count) VALUES (?, 0)',
				reaction.id
			);
		});
	}

	private getWidgetRow(): WidgetRow | null {
		return this.ctx.storage.sql.exec<WidgetRow>('SELECT * FROM widget LIMIT 1').toArray()[0] ?? null;
	}

	private readWidget(): PublicWidget | null {
		const row = this.getWidgetRow();
		if (!row) return null;

		const reactions = this.ctx.storage.sql
			.exec<ReactionRow>(
				`SELECT reactions.id, reactions.emoji, reactions.label, reactions.description, reactions.sort_order, counts.count
					FROM reactions
					LEFT JOIN counts ON counts.reaction = reactions.id
					ORDER BY reactions.sort_order ASC`
			)
			.toArray()
			.map(rowToReaction);

		return {
			doc: row.doc,
			returnUrl: row.return_url,
			reactions,
			createdAt: row.created_at,
			updatedAt: row.updated_at
		};
	}

	private readReaction(reactionId: string): PublicWidgetReaction | null {
		const row = this.ctx.storage.sql
			.exec<ReactionRow>(
				`SELECT reactions.id, reactions.emoji, reactions.label, reactions.description, reactions.sort_order, counts.count
					FROM reactions
					LEFT JOIN counts ON counts.reaction = reactions.id
					WHERE reactions.id = ?
					LIMIT 1`,
				reactionId
			)
			.toArray()[0];

		return row ? rowToReaction(row) : null;
	}
}

function rowToReaction(row: ReactionRow): PublicWidgetReaction {
	return {
		id: row.id,
		emoji: row.emoji,
		label: row.label,
		description: row.description,
		count: Number(row.count ?? 0)
	};
}
