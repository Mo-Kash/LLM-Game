import { create } from "zustand";
import type {
	DialogueMessage,
	NPC,
	JournalEntry,
	Clue,
	MessageType,
	EmotionalState,
	RelationshipTier,
} from "@/types/game";
import {
	apiClient,
	wsService,
	type GameStateResponse,
	type ActionResponse,
	type NPCInfo,
	type WSOutMessage,
	type SaveInfo,
} from "@/services/api";

interface GameState {
	// Session
	sessionId: string | null;
	playerName: string | null;
	isConnected: boolean;

	// App Metadata
	metadata: {
		title: string;
		description: string;
		character_options?: {
			genders: string[];
			occupations: Array<{ id: string; name: string; desc: string }>;
		};
	} | null;
	fetchMetadata: () => Promise<void>;

	// Location
	currentLocation: string;
	currentLocationName: string;
	currentLocationDescription: string;
	connectedLocations: string[];
	setLocation: (location: string, name?: string, description?: string) => void;

	// Dialogue
	dialogueHistory: DialogueMessage[];
	addMessage: (msg: DialogueMessage) => void;
	clearHistory: () => void;

	// NPCs
	activeNPC: NPC | null;
	setActiveNPC: (npc: NPC | null) => void;
	npcs: Record<string, NPC>;
	updateNPC: (id: string, updates: Partial<NPC>) => void;

	// Journal
	journalEntries: JournalEntry[];
	addJournalEntry: (entry: JournalEntry) => void;

	// Clues
	clues: Clue[];
	addClue: (clue: Clue) => void;

	// Processing
	isProcessing: boolean;
	setProcessing: (v: boolean) => void;

	// Inventory
	inventory: Array<{ id: string; name: string; description: string }>;

	// Relationships
	relationships: Record<string, Record<string, number>>;

	// Turn
	turn: number;
	moralAlignment: number;

	// ── Backend integration actions ──────────────────────────

	/** Create a new game session on the backend */
	createSession: (metadata: {
		name: string;
		gender: string;
		age: number;
		occupation: string;
	}) => Promise<void>;

	/** Refresh state from the backend */
	refreshState: () => Promise<void>;

	/** Send player input (dialogue or command) to backend */
	sendAction: (content: string, targetNpcId?: string) => Promise<void>;

	/** Directly move player to location */
	movePlayer: (locationId: string) => Promise<void>;

	/** Link two clues logically on the backend */
	linkClues: (id1: string, id2: string) => Promise<void>;

	/** Switch active NPC via backend */
	switchNPC: (npcId: string) => Promise<void>;

	/** Trigger manual save on backend */
	saveGame: () => Promise<boolean>;

	/** Load an existing session */
	loadGame: (sessionId: string) => Promise<void>;

	/** Get list of saved sessions */
	listSavedSessions: () => Promise<SaveInfo[]>;

	/** Disconnect and clean up */
	disconnect: () => void;

	/** Connect WebSocket to session */
	connectWebSocket: () => void;
}

/** Convert backend NPCInfo to frontend NPC type */
function toFrontendNPC(info: NPCInfo): NPC {
	return {
		id: info.id,
		name: info.name,
		title: info.title,
		trust: info.trust,
		maxTrust: info.max_trust,
		trustThresholds: info.trust_thresholds,
		emotionalState: info.emotional_state as EmotionalState,
		hiddenSecrets: 0,
		revealedSecrets: 0,
		allegiances: [],
		relationshipTier: info.relationship_tier as RelationshipTier,
		suspicion: info.suspicion,
		emotionalLabel: info.emotional_label,
		trustPercent: info.trust_percent,
		locationId: info.location_id,
	};
}

export const useGameStore = create<GameState>((set, get) => ({
	// ... existing state ...
	sessionId: null,
	playerName: null,
	isConnected: false,

	// App Metadata
	metadata: null,
	fetchMetadata: async () => {
		try {
			const md = await apiClient.getMetadata();
			set({ metadata: md });
			if (md.title) {
				document.title = md.title;
			}
			if (md.description) {
				const metaDesc = document.querySelector('meta[name="description"]');
				if (metaDesc) {
					metaDesc.setAttribute("content", md.description);
				}
			}
		} catch (error) {
			console.error("[GameStore] Failed to fetch metadata:", error);
		}
	},

	// Location
	currentLocation: "",
	currentLocationName: "",
	currentLocationDescription: "",
	connectedLocations: [],
	setLocation: (location, name, description) =>
		set({
			currentLocation: location,
			currentLocationName: name ?? location,
			currentLocationDescription: description ?? "",
		}),

	// Dialogue
	dialogueHistory: [],
	addMessage: (msg) =>
		set((s) => ({
			dialogueHistory: [...s.dialogueHistory, msg],
		})),
	clearHistory: () => set({ dialogueHistory: [] }),

	// NPCs
	activeNPC: null,
	setActiveNPC: (npc) => set({ activeNPC: npc }),
	npcs: {},
	updateNPC: (id, updates) =>
		set((s) => ({
			npcs: {
				...s.npcs,
				[id]: { ...s.npcs[id], ...updates } as NPC,
			},
		})),

	// Journal
	journalEntries: [],
	addJournalEntry: (entry) =>
		set((s) => ({ journalEntries: [...s.journalEntries, entry] })),

	// Clues
	clues: [],
	addClue: (clue) => set((s) => ({ clues: [...s.clues, clue] })),

	// Processing
	isProcessing: false,
	setProcessing: (v) => set({ isProcessing: v }),

	// Inventory
	inventory: [],

	// Relationships
	relationships: {},

	// Turn
	turn: 0,
	moralAlignment: 50,

	// ── Backend integration ─────────────────────────────────

	createSession: async (metadata) => {
		try {
			const session = await apiClient.createSession({
				...metadata,
			});
			set({
				sessionId: session.session_id,
				playerName: session.player_name,
				turn: session.turn,
				dialogueHistory: [],
			});

			// Fetch full state
			await get().refreshState();

			// Connect WebSocket
			get().connectWebSocket();

			// We no longer add hardcoded narration here.
			// The backend should return the initial state/narration if turn=0.
			// Or the user can type /look.
		} catch (error) {
			console.error("[GameStore] Failed to create session:", error);
			throw error;
		}
	},

	refreshState: async () => {
		const { sessionId } = get();
		if (!sessionId) return;

		try {
			const state: GameStateResponse = await apiClient.getGameState(sessionId);

			const updates: Partial<GameState> = {
				turn: state.turn,
				relationships: state.relationships,
			};

			// Location
			if (state.location) {
				updates.currentLocation = state.location.id;
				updates.currentLocationName = state.location.name;
				updates.currentLocationDescription = state.location.description;
				updates.connectedLocations = state.location.connected_to;
			}

			// Active NPC
			if (state.active_npc) {
				updates.activeNPC = toFrontendNPC(state.active_npc);
			}

			// Player
			if (state.player) {
				updates.inventory = state.player.inventory.map((o) => ({
					id: o.id,
					name: o.name,
					description: o.description,
				}));
				updates.moralAlignment = state.player.moral_alignment;
			}

			// All NPCs in location — accumulate
			if (state.location?.npcs_present) {
				const npcsRecord: Record<string, NPC> = { ...get().npcs };
				for (const npcInfo of state.location.npcs_present) {
					npcsRecord[npcInfo.id] = toFrontendNPC(npcInfo);
				}
				updates.npcs = npcsRecord;
			} else {
				// We don't clear NPCs when moving to a location with no NPCs
			}

			// Journal Entries — always sync from backend
			updates.journalEntries = (state.journal || []).map((j) => ({
				id: j.id,
				timestamp: j.timestamp,
				content: j.content,
				tags: j.tags || [],
			}));

			// Clues — always sync from backend
			updates.clues = (state.clues || []).map((c) => ({
				id: c.id,
				title: c.title,
				description: c.description,
				linkedClues: c.linked_clues,
				npcId: c.npc_id,
				tension: c.tension,
				discovered: c.discovered,
			}));

			set(updates as GameState);
		} catch (error) {
			console.error("[GameStore] Failed to refresh state:", error);
		}
	},

	sendAction: async (content: string, targetNpcId?: string) => {
		const { sessionId } = get();
		if (!sessionId) {
			console.error("[GameStore] No active session");
			return;
		}

		const isCommand = content.startsWith("/");

		// Add player message to history (slash commands are filtered in UI)
		get().addMessage({
			id: Date.now().toString(),
			type: "player",
			content,
			timestamp: Date.now(),
		});

		set({ isProcessing: true });

		try {
			const result: ActionResponse = await apiClient.sendAction(
				sessionId,
				content,
				targetNpcId,
			);

			// Check if it's a command response
			if (isCommand) {
				if (result.error && content.startsWith("/move")) {
					throw new Error(result.npc_dialogue);
				}
				const type = result.npc_id === "narrator" ? "narration" : "system";
				get().addMessage({
					id: (Date.now() + 1).toString(),
					type: type as MessageType,
					speaker: result.npc_name,
					content: result.npc_dialogue,
					timestamp: Date.now(),
				});
			} else {
				// NPC response
				const {
					narration,
					npc_dialogue,
					npc_id,
					npc_name,
					trust_change,
					turn,
				} = result;

				// Special case: Narrator NPC - combine fields for a single bubble
				if (npc_id === "narrator") {
					const text1 = (narration || "").trim();
					const text2 = (npc_dialogue || "").trim();
					let combined = "";

					if (text1 && text2) {
						combined = `${text1}\n\n${text2}`;
					} else {
						combined = text1 || text2;
					}

					if (combined) {
						get().addMessage({
							id: `nar-npc-${Date.now()}`,
							type: "narration",
							speaker: "Narrator",
							content: combined,
							timestamp: Date.now(),
						});
					}
				} else {
					// 1. Add Narration if exists
					if (narration && narration.trim()) {
						get().addMessage({
							id: `nar-path-${Date.now()}`,
							type: "narration",
							speaker: "Narrator",
							content: narration.trim(),
							timestamp: Date.now(),
						});
					}

					// 2. Add NPC Dialogue if exists
					if (npc_dialogue && npc_dialogue.trim()) {
						get().addMessage({
							id: `npc-path-${Date.now() + 1}`,
							type: "npc",
							speaker: npc_name,
							content: npc_dialogue.trim(),
							timestamp: Date.now() + 1,
							trustChange: trust_change || undefined,
						});
					}
				}

				// Update turn
				set({ turn: turn });

				// Refresh full state (location, NPCs, journal, inventory may have changed)
				await get().refreshState();
			}
		} catch (error) {
			console.error("[GameStore] Action error:", error);
			if (!content.startsWith("/move")) {
				get().addMessage({
					id: (Date.now() + 2).toString(),
					type: "system",
					content: `Error: ${error instanceof Error ? error.message : "Failed to process action"}`,
					timestamp: Date.now(),
				});
			}
			throw error;
		} finally {
			set({ isProcessing: false });
		}
	},

	movePlayer: async (locationId: string) => {
		const { sessionId, refreshState } = get();
		if (!sessionId) return;
		try {
			await apiClient.movePlayer(sessionId, locationId);
			await refreshState();
		} catch (error) {
			console.error("[GameStore] Failed to move player:", error);
			throw error;
		}
	},

	linkClues: async (id1: string, id2: string) => {
		const { sessionId, refreshState } = get();
		if (!sessionId) return;
		try {
			await apiClient.linkClues(sessionId, id1, id2);
			await refreshState();
		} catch (error) {
			console.error("[GameStore] Failed to link clues:", error);
			throw error;
		}
	},

	switchNPC: async (npcId: string) => {
		const { sessionId } = get();
		if (!sessionId) return;

		try {
			const result = await apiClient.switchNPC(sessionId, npcId);
			const npcInfo = result.npc as NPCInfo;
			const npc = toFrontendNPC(npcInfo);
			set({ activeNPC: npc });

			get().addMessage({
				id: Date.now().toString(),
				type: "system",
				content: `Now talking to: ${npc.name}`,
				timestamp: Date.now(),
			});
		} catch (error) {
			console.error("[GameStore] Switch NPC error:", error);
		}
	},

	saveGame: async () => {
		const { sessionId } = get();
		if (!sessionId) return;
		try {
			await apiClient.saveSession(sessionId);
			get().addMessage({
				id: Date.now().toString(),
				type: "system",
				content: "Game state persisted to secure archive.",
				timestamp: Date.now(),
			});
			// Return true so callers know the save succeeded
			return true;
		} catch (error) {
			console.error("[GameStore] Save error:", error);
			return false;
		}
	},

	loadGame: async (sessionId: string) => {
		try {
			const session = await apiClient.loadSession(sessionId);
			set({
				sessionId: session.session_id,
				playerName: session.player_name,
				turn: session.turn,
				dialogueHistory: [], // Clear history for fresh reload or keep?
			});
			await get().refreshState();
			get().connectWebSocket();
		} catch (error) {
			console.error("[GameStore] Load error:", error);
			throw error;
		}
	},

	listSavedSessions: async () => {
		try {
			return await apiClient.listSessions();
		} catch (error) {
			console.error("[GameStore] List saves error:", error);
			return [];
		}
	},

	connectWebSocket: () => {
		const { sessionId } = get();
		if (!sessionId) return;

		wsService.connect(sessionId);

		// Connection state
		wsService.on("connection", (msg: WSOutMessage) => {
			const status = msg.payload.status as string;
			set({ isConnected: status === "connected" });
		});

		// Real-time NPC responses from other tabs/clients
		wsService.on("npc_response", (_msg: WSOutMessage) => {
			// Responses are already handled in sendAction;
			// this is for multi-client broadcasting only
		});

		// NPC switched (from another client)
		wsService.on("npc_switched", (msg: WSOutMessage) => {
			const npcInfo = msg.payload as unknown as NPCInfo;
			const npc = toFrontendNPC(npcInfo);
			set({ activeNPC: npc });
		});
	},

	disconnect: () => {
		wsService.disconnect();
		set({
			sessionId: null,
			isConnected: false,
			dialogueHistory: [],
			activeNPC: null,
			npcs: {},
			turn: 0,
		});
	},
}));
