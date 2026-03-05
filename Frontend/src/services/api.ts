/**
 * API Client — Real backend integration
 * ──────────────────────────────────────
 * Typed REST client for FastAPI backend.
 * All game state flows through this module.
 */

import type { APIResponse } from "@/types/game";

// ── API Types (mirroring backend schemas) ──────────────────

export interface SessionInfo {
	session_id: string;
	player_name: string;
	turn: number;
	active_npc_id: string;
	current_location_id: string;
	created_at: number;
}

export interface NPCInfo {
	id: string;
	name: string;
	description: string;
	personality: string;
	location_id: string;
	alive: boolean;
	trust: number;
}

export interface ObjectInfo {
	id: string;
	name: string;
	description: string;
	location_id: string | null;
	properties: Record<string, unknown>;
}

export interface LocationInfo {
	id: string;
	name: string;
	description: string;
	connected_to: string[];
	npcs_present: NPCInfo[];
	objects_here: ObjectInfo[];
	state: Record<string, unknown>;
}

export interface PlayerInfo {
	current_location_id: string;
	inventory: ObjectInfo[];
	flags: Record<string, unknown>;
}

export interface GameStateResponse {
	session_id: string;
	turn: number;
	active_npc_id: string;
	active_npc: NPCInfo | null;
	location: LocationInfo | null;
	player: PlayerInfo | null;
	relationships: Record<string, Record<string, number>>;
	journal: Array<{
		id: string;
		turn: number;
		content: string;
		timestamp: number;
	}>;
	dialogue_history?: Array<{
		id: string;
		type: string;
		speaker?: string;
		content: string;
		timestamp: number;
		trustChange?: number;
		narration?: string;
	}>;
}

export interface ActionResponse {
	npc_dialogue: string;
	narration: string;
	npc_id: string;
	npc_name: string;
	turn: number;
	trust_change: number;
	validation_errors: string[];
	elapsed_ms: number;
	events: Array<{ type: string; payload: Record<string, unknown> }>;
	error?: boolean;
}

export interface NPCListResponse {
	npcs: NPCInfo[];
	active_npc_id: string;
}

export interface HealthResponse {
	status: string;
	version: string;
	llm_reachable: boolean;
	active_sessions: number;
}

export interface SaveInfo {
	session_id: string;
	player_name: string;
	location_name: string;
	turn: number;
	created_at: number;
	is_auto: boolean;
}

export interface GameMetadataResponse {
	title: string;
	description: string;
	character_options?: {
		genders: string[];
		occupations: Array<{ id: string; name: string; desc: string }>;
	};
}

// ── REST Client ────────────────────────────────────────────

class APIClient {
	private baseUrl: string;

	constructor(baseUrl = "/api/game") {
		this.baseUrl = baseUrl;
	}

	private async request<T>(
		method: string,
		path: string,
		body?: unknown,
	): Promise<T> {
		const url = `${this.baseUrl}${path}`;
		const options: RequestInit = {
			method,
			headers: { "Content-Type": "application/json" },
		};
		if (body !== undefined) {
			options.body = JSON.stringify(body);
		}

		const response = await fetch(url, options);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new APIError(
				response.status,
				(errorData as Record<string, string>).detail ||
					(errorData as Record<string, string>).error ||
					response.statusText,
			);
		}

		return response.json() as Promise<T>;
	}

	// ── Session ────────────────────────────────────────────

	async createSession(config: {
		name: string;
		gender: string;
		age: number;
		occupation: string;
		defaultNpcId?: string;
		reset?: boolean;
	}): Promise<SessionInfo> {
		return this.request<SessionInfo>("POST", "/session", {
			name: config.name,
			gender: config.gender,
			age: config.age,
			occupation: config.occupation,
			default_npc_id: config.defaultNpcId ?? "gareth_barkeep",
			reset: config.reset ?? false,
		});
	}

	async destroySession(sessionId: string): Promise<void> {
		await this.request("DELETE", `/session/${sessionId}`);
	}

	// ── State ──────────────────────────────────────────────

	async getGameState(sessionId: string): Promise<GameStateResponse> {
		return this.request<GameStateResponse>("GET", `/state/${sessionId}`);
	}

	// ── Actions ────────────────────────────────────────────

	async sendAction(
		sessionId: string,
		content: string,
		npcId?: string,
	): Promise<ActionResponse> {
		return this.request<ActionResponse>("POST", `/action/${sessionId}`, {
			content,
			npc_id: npcId,
		});
	}

	// ── NPCs ───────────────────────────────────────────────

	async listNPCs(
		sessionId: string,
		locationOnly = true,
	): Promise<NPCListResponse> {
		const query = locationOnly ? "?location_only=true" : "";
		return this.request<NPCListResponse>("GET", `/npcs/${sessionId}${query}`);
	}

	async switchNPC(
		sessionId: string,
		npcId: string,
	): Promise<{ status: string; npc: NPCInfo }> {
		return this.request("POST", `/npc/${sessionId}/${npcId}`);
	}

	// ── Location ───────────────────────────────────────────

	async getLocation(sessionId: string): Promise<LocationInfo> {
		return this.request<LocationInfo>("GET", `/location/${sessionId}`);
	}

	async listLocations(sessionId: string): Promise<LocationInfo[]> {
		return this.request<LocationInfo[]>("GET", `/locations/${sessionId}`);
	}

	// ── Health ──────────────────────────────────────────────

	async healthCheck(): Promise<HealthResponse> {
		return this.request<HealthResponse>("GET", "/health");
	}

	async listSessions(): Promise<SaveInfo[]> {
		return this.request<SaveInfo[]>("GET", "/sessions");
	}

	async saveSession(sessionId: string): Promise<void> {
		await this.request("POST", `/save/${sessionId}`);
	}

	async loadSession(sessionId: string): Promise<SessionInfo> {
		return this.request<SessionInfo>("POST", `/load/${sessionId}`);
	}

	// ── Metadata ───────────────────────────────────────────

	async getMetadata(): Promise<GameMetadataResponse> {
		return this.request<GameMetadataResponse>("GET", "/metadata");
	}
}

// ── Custom Error ───────────────────────────────────────────

export class APIError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message);
		this.name = "APIError";
	}
}

// ── WebSocket Message Types ────────────────────────────────

export interface WSOutMessage {
	type: string;
	payload: Record<string, unknown>;
	timestamp: number;
}

// ── WebSocket Service ──────────────────────────────────────

type WSCallback = (msg: WSOutMessage) => void;

class WebSocketService {
	private ws: WebSocket | null = null;
	private listeners: Map<string, WSCallback[]> = new Map();
	private reconnectAttempts = 0;
	private maxReconnects = 5;
	private sessionId: string | null = null;
	private _pingInterval: ReturnType<typeof setInterval> | null = null;

	connect(sessionId: string) {
		this.sessionId = sessionId;
		this.reconnectAttempts = 0;

		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const host = window.location.host;
		const url = `${protocol}//${host}/ws/game/${sessionId}`;

		this.ws = new WebSocket(url);

		this.ws.onopen = () => {
			console.log("[WS] Connected to session:", sessionId);
			this.reconnectAttempts = 0;
			this._emitLocal("connection", {
				type: "connection",
				payload: { status: "connected" },
				timestamp: Date.now(),
			});

			// Start heartbeat
			this._pingInterval = setInterval(() => {
				this.send("ping", {});
			}, 30000);
		};

		this.ws.onmessage = (event) => {
			try {
				const msg: WSOutMessage = JSON.parse(event.data);
				this._emitLocal(msg.type, msg);
				this._emitLocal("*", msg); // wildcard listeners
			} catch (e) {
				console.error("[WS] Parse error:", e);
			}
		};

		this.ws.onclose = (event) => {
			console.log("[WS] Disconnected:", event.code, event.reason);
			this._clearPing();
			this._emitLocal("connection", {
				type: "connection",
				payload: { status: "disconnected", code: event.code },
				timestamp: Date.now(),
			});
			if (event.code !== 1000 && event.code !== 4004) {
				this._handleReconnect();
			}
		};

		this.ws.onerror = (error) => {
			console.error("[WS] Error:", error);
		};
	}

	disconnect() {
		this._clearPing();
		if (this.ws) {
			this.ws.close(1000, "Client disconnect");
			this.ws = null;
		}
		this.sessionId = null;
	}

	send(type: string, payload: unknown) {
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify({ type, payload }));
		}
	}

	on(type: string, callback: WSCallback) {
		const existing = this.listeners.get(type) ?? [];
		this.listeners.set(type, [...existing, callback]);
	}

	off(type: string, callback: WSCallback) {
		const existing = this.listeners.get(type) ?? [];
		this.listeners.set(
			type,
			existing.filter((cb) => cb !== callback),
		);
	}

	get isConnected(): boolean {
		return this.ws?.readyState === WebSocket.OPEN;
	}

	private _emitLocal(type: string, msg: WSOutMessage) {
		const handlers = this.listeners.get(type) ?? [];
		handlers.forEach((cb) => cb(msg));
	}

	private _clearPing() {
		if (this._pingInterval) {
			clearInterval(this._pingInterval);
			this._pingInterval = null;
		}
	}

	private _handleReconnect() {
		if (this.reconnectAttempts < this.maxReconnects && this.sessionId) {
			this.reconnectAttempts++;
			const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
			console.log(
				`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`,
			);
			setTimeout(() => {
				if (this.sessionId) this.connect(this.sessionId);
			}, delay);
		}
	}
}

// ── Event Bus ──────────────────────────────────────────────

type EventCallback = (data: unknown) => void;

class EventBus {
	private handlers: Map<string, EventCallback[]> = new Map();

	subscribe(event: string, callback: EventCallback) {
		const existing = this.handlers.get(event) ?? [];
		this.handlers.set(event, [...existing, callback]);
		return () => this.unsubscribe(event, callback);
	}

	unsubscribe(event: string, callback: EventCallback) {
		const existing = this.handlers.get(event) ?? [];
		this.handlers.set(
			event,
			existing.filter((cb) => cb !== callback),
		);
	}

	emit(event: string, data?: unknown) {
		const handlers = this.handlers.get(event) ?? [];
		handlers.forEach((cb) => cb(data));
	}
}

// ── Singleton exports ──────────────────────────────────────

export const apiClient = new APIClient();
export const wsService = new WebSocketService();
export const eventBus = new EventBus();
