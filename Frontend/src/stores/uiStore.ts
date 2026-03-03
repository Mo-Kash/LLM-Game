import { create } from "zustand";

interface UIState {
	activeModal: string | null;
	openModal: (id: string) => void;
	closeModal: () => void;

	loadingStates: Record<string, boolean>;
	setLoading: (key: string, value: boolean) => void;

	notifications: {
		id: string;
		message: string;
		type: "info" | "warning" | "danger";
	}[];
	addNotification: (n: UIState["notifications"][0]) => void;
	dismissNotification: (id: string) => void;

	sidebarCollapsed: { left: boolean; right: boolean };
	toggleSidebar: (side: "left" | "right") => void;
}

export const useUIStore = create<UIState>((set) => ({
	activeModal: null,
	openModal: (id) => set({ activeModal: id }),
	closeModal: () => set({ activeModal: null }),

	loadingStates: {},
	setLoading: (key, value) =>
		set((s) => ({ loadingStates: { ...s.loadingStates, [key]: value } })),

	notifications: [],
	addNotification: (n) =>
		set((s) => ({ notifications: [...s.notifications, n] })),
	dismissNotification: (id) =>
		set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

	sidebarCollapsed: { left: false, right: false },
	toggleSidebar: (side) =>
		set((s) => ({
			sidebarCollapsed: {
				...s.sidebarCollapsed,
				[side]: !s.sidebarCollapsed[side],
			},
		})),
}));
