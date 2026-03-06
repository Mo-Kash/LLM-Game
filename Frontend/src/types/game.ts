// ============================================
// Game Types & Interfaces
// ============================================

export type MessageType = "player" | "npc" | "narration" | "system";

export interface DialogueMessage {
	id: string;
	type: MessageType;
	speaker?: string;
	content: string;
	timestamp: number;
	trustChange?: number;
	memoryRef?: string;
}

export interface DialogueChoice {
	id: string;
	text: string;
	type: "normal";
	locked?: boolean;
	lockReason?: string;
}

export interface NPC {
	id: string;
	name: string;
	title?: string;
	portraitUrl?: string;
	trust: number;
	maxTrust: number;
	trustThresholds: TrustThreshold[];
	emotionalState: EmotionalState;
	hiddenSecrets: number;
	revealedSecrets: number;
	allegiances: string[];
	relationshipTier: RelationshipTier;
	suspicion: number;
	emotionalLabel: string;
	trustPercent: number;
	locationId?: string;
}

export interface TrustThreshold {
	value: number;
	label: string;
	unlocked: boolean;
}

export type EmotionalState =
	| "neutral"
	| "suspicious"
	| "fearful"
	| "angry"
	| "melancholic"
	| "guarded"
	| "trusting"
	| "desperate"
	| "hostile"
	| "playful";

export type RelationshipTier =
	| "stranger"
	| "acquaintance"
	| "confidant"
	| "ally"
	| "rival"
	| "enemy";

export interface Location {
	id: string;
	name: string;
	description: string;
	subLocations: SubLocation[];
	connectedTo: string[];
}

export interface SubLocation {
	id: string;
	name: string;
	description: string;
	npcsPresent: string[];
}

export interface JournalEntry {
	id: string;
	timestamp: number;
	content: string;
	npcId?: string;
	tags: string[];
	expanded?: boolean;
	category?: "case" | "evidence" | "note" | "thought";
}

export interface Clue {
	id: string;
	title: string;
	description: string;
	linkedClues: string[];
	npcId?: string;
	tension: number;
	discovered: boolean;
}

export interface SaveSlot {
	id: string;
	timestamp: number;
	location: string;
	subLocation: string;
	trustSummary: Record<string, number>;
	playtime: number;
	label?: string;
}

export interface GameSession {
	id: string;
	createdAt: number;
	worldSeed: string;
	background: string;
	moralAlignment: number;
}

export interface EventLog {
	id: string;
	timestamp: number;
	type: "dialogue" | "trust" | "location" | "item" | "clue" | "system";
	data: Record<string, unknown>;
}

export interface LLMPromptData {
	prompt: string;
	response: string;
	tokenUsage: { prompt: number; completion: number; total: number };
	latencyMs: number;
}

export interface MemoryStats {
	embeddingCount: number;
	retrievalLatencyMs: number;
}

export interface APIResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
}

export interface WSMessage {
	type: string;
	payload: unknown;
	timestamp: number;
}

// ── World Map ──────────────────────────────────────────
export interface MockLocation {
	id: string;
	label: string;
	connections: string[];
	description: string;
	npcs: string[];
	tension: "low" | "moderate" | "high";
}
