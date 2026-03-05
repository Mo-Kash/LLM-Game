import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DialogueMessage, NPC, JournalEntry, Clue } from "@/types/game";
import {
	apiClient,
	wsService,
	type GameStateResponse,
	type ActionResponse,
	type NPCInfo,
	type WSOutMessage,
} from "@/services/api";

interface GameState {
	// Session
	sessionId: string | null;
	isConnected: boolean;

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
	linkClues: (id1: string, id2: string) => void;

	// Processing
	isProcessing: boolean;
	setProcessing: (v: boolean) => void;

	// Inventory
	inventory: Array<{ id: string; name: string; description: string }>;

	// Relationships
	relationships: Record<string, Record<string, number>>;

	// Turn
	turn: number;

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
	sendAction: (content: string) => Promise<void>;

	/** Switch active NPC via backend */
	switchNPC: (npcId: string) => Promise<void>;

	/** Disconnect and clean up */
	disconnect: () => void;

	/** Connect WebSocket to session */
	connectWebSocket: () => void;
}

/** Convert backend NPCInfo to frontend NPC type */
function toFrontendNPC(
	info: NPCInfo,
	relationships: Record<string, Record<string, number>> = {},
): NPC {
	const trust = info.trust ?? relationships[info.id]?.player ?? 0;
	return {
		id: info.id,
		name: info.name,
		title: info.personality.split(".")[0] || undefined,
		trust,
		maxTrust: 100,
		trustThresholds: [
			{ value: 25, label: "Wary", unlocked: trust >= 25 },
			{ value: 50, label: "Cautious Trust", unlocked: trust >= 50 },
			{ value: 75, label: "Confidant", unlocked: trust >= 75 },
		],
		emotionalState:
			trust > 60
				? "trusting"
				: trust > 30
					? "neutral"
					: trust < -20
						? "hostile"
						: "guarded",
		hiddenSecrets: 0,
		revealedSecrets: 0,
		allegiances: [],
		relationshipTier:
			trust > 60 ? "confidant" : trust > 30 ? "acquaintance" : "stranger",
		suspicion: Math.max(0, -trust),
	};
}

export const useGameStore = create<GameState>()(
	persist(
		(set, get) => ({
			// ... existing state ...
			sessionId: null,
			isConnected: false,

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
			linkClues: (id1, id2) =>
				set((s) => ({
					clues: s.clues.map((c) => {
						if (c.id === id1)
							return {
								...c,
								linkedClues: [...c.linkedClues, id2],
							};
						if (c.id === id2)
							return {
								...c,
								linkedClues: [...c.linkedClues, id1],
							};
						return c;
					}),
				})),

			// Processing
			isProcessing: false,
			setProcessing: (v) => set({ isProcessing: v }),

			// Inventory
			inventory: [],

			// Relationships
			relationships: {},

			// Turn
			turn: 0,

			// ── Backend integration ─────────────────────────────────

			createSession: async (metadata) => {
				try {
					const session = await apiClient.createSession({
						...metadata,
					});
					set({
						sessionId: session.session_id,
						turn: session.turn,
						dialogueHistory: [],
					});

					// Fetch full state
					await get().refreshState();

					// Connect WebSocket
					get().connectWebSocket();

					// Add narration message
					const state = get();
					get().addMessage({
						id: Date.now().toString(),
						type: "narration",
						content:
							state.currentLocationDescription ||
							`You step into ${state.currentLocationName}. The air hangs heavy with smoke and unspoken secrets.`,
						timestamp: Date.now(),
					});
				} catch (error) {
					console.error("[GameStore] Failed to create session:", error);
					throw error;
				}
			},

			refreshState: async () => {
				const { sessionId } = get();
				if (!sessionId) return;

				try {
					const state: GameStateResponse =
						await apiClient.getGameState(sessionId);

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
						updates.activeNPC = toFrontendNPC(
							state.active_npc,
							state.relationships,
						);
					}

					// Player
					if (state.player) {
						updates.inventory = state.player.inventory.map((o) => ({
							id: o.id,
							name: o.name,
							description: o.description,
						}));
					}

					// All NPCs in location
					if (state.location?.npcs_present) {
						const npcsRecord: Record<string, NPC> = {};
						for (const npcInfo of state.location.npcs_present) {
							npcsRecord[npcInfo.id] = toFrontendNPC(
								npcInfo,
								state.relationships,
							);
						}
						updates.npcs = npcsRecord;
					}

					set(updates as GameState);
				} catch (error) {
					console.error("[GameStore] Failed to refresh state:", error);
				}
			},

			sendAction: async (content: string) => {
				const { sessionId, activeNPC } = get();
				if (!sessionId) {
					console.error("[GameStore] No active session");
					return;
				}

				// Add player message
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
					);

					// Check if it's a command response
					if (content.startsWith("/")) {
						get().addMessage({
							id: (Date.now() + 1).toString(),
							type: "system",
							content: result.npc_dialogue,
							timestamp: Date.now(),
						});
					} else {
						// NPC response
						get().addMessage({
							id: (Date.now() + 1).toString(),
							type: "npc",
							speaker: result.npc_name,
							content: result.npc_dialogue,
							timestamp: Date.now(),
							trustChange: result.trust_change || undefined,
						});
					}

					// Update turn
					set({ turn: result.turn });

					// Refresh full state (location, NPCs, inventory may have changed)
					await get().refreshState();
				} catch (error) {
					console.error("[GameStore] Action error:", error);
					get().addMessage({
						id: (Date.now() + 2).toString(),
						type: "system",
						content: `Error: ${error instanceof Error ? error.message : "Failed to process action"}`,
						timestamp: Date.now(),
					});
				} finally {
					set({ isProcessing: false });
				}
			},

			switchNPC: async (npcId: string) => {
				const { sessionId } = get();
				if (!sessionId) return;

				try {
					const result = await apiClient.switchNPC(sessionId, npcId);
					const npcInfo = result.npc as NPCInfo;
					const npc = toFrontendNPC(npcInfo, get().relationships);
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
					const npc = toFrontendNPC(npcInfo, get().relationships);
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
		}),
		{
			name: "npc-engine-game-state",
			partialize: (state) => ({
				sessionId: state.sessionId,
				dialogueHistory: state.dialogueHistory,
				currentLocation: state.currentLocation,
				currentLocationName: state.currentLocationName,
				currentLocationDescription: state.currentLocationDescription,
				connectedLocations: state.connectedLocations,
				npcs: state.npcs,
				activeNPC: state.activeNPC,
				inventory: state.inventory,
				relationships: state.relationships,
				turn: state.turn,
				journalEntries: state.journalEntries,
				clues: state.clues,
			}),
			onRehydrateStorage: () => (state) => {
				if (state?.sessionId) {
					console.log("[GameStore] Rehydrated session:", state.sessionId);
					state.connectWebSocket();
				}
			},
		},
	),
);
