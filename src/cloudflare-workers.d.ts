type SqlStorageValue = ArrayBuffer | string | number | null;

interface Fetcher {
	fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface DurableObjectId {
	toString(): string;
	equals(other: DurableObjectId): boolean;
}

interface DurableObjectStub {
	readonly id: DurableObjectId;
	fetch(request: Request): Promise<Response>;
}

interface DurableObjectNamespace {
	idFromName(name: string): DurableObjectId;
	idFromString(id: string): DurableObjectId;
	newUniqueId(): DurableObjectId;
	get(id: DurableObjectId): DurableObjectStub;
	getByName(name: string): DurableObjectStub;
}

interface DurableObjectState {
	readonly id: DurableObjectId;
	readonly storage: DurableObjectStorage;
	waitUntil(promise: Promise<unknown>): void;
	blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
}

interface DurableObjectStorage {
	sql: SqlStorage;
	transactionSync<T>(closure: () => T): T;
	getAlarm(): Promise<number | null>;
	setAlarm(scheduledTime: number | Date): Promise<void>;
	deleteAlarm(): Promise<void>;
}

interface SqlStorage {
	exec<T extends Record<string, SqlStorageValue>>(
		query: string,
		...bindings: unknown[]
	): SqlStorageCursor<T>;
}

interface SqlStorageCursor<T extends Record<string, SqlStorageValue>> {
	toArray(): T[];
	one(): T;
	[Symbol.iterator](): IterableIterator<T>;
}

interface ExecutionContext {
	waitUntil(promise: Promise<unknown>): void;
	passThroughOnException(): void;
}

type IncomingRequestCfProperties = Record<string, unknown>;

declare module 'cloudflare:workers' {
	export abstract class DurableObject<Env = unknown> {
		protected ctx: DurableObjectState;
		protected env: Env;

		constructor(ctx: DurableObjectState, env: Env);
	}
}
