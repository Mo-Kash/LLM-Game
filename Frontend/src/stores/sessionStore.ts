import { create } from "zustand";
import type { SaveSlot, GameSession } from "@/types/game";

interface SessionState {
	saveSlots: SaveSlot[];
	activeSession: GameSession | null;
	version: string;
	addSaveSlot: (slot: SaveSlot) => void;
	removeSaveSlot: (id: string) => void;
	setActiveSession: (session: GameSession | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
	saveSlots: [],
	activeSession: null,
	version: "0.1.0",
	addSaveSlot: (slot) => set((s) => ({ saveSlots: [...s.saveSlots, slot] })),
	removeSaveSlot: (id) =>
		set((s) => ({ saveSlots: s.saveSlots.filter((sl) => sl.id !== id) })),
	setActiveSession: (session) => set({ activeSession: session }),
}));
