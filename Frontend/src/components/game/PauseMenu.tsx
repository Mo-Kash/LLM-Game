import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/stores/uiStore";
import { useGameStore } from "@/stores/gameStore";
import { apiClient } from "@/services/api";

export function PauseMenu() {
	const navigate = useNavigate();
	const { activeModal, openModal, closeModal } = useUIStore();
	const isOpen = activeModal === "pause";
	const [hasSaves, setHasSaves] = useState(false);

	useEffect(() => {
		if (isOpen) {
			apiClient
				.listSessions()
				.then((saves) => setHasSaves(saves.length > 0))
				.catch(() => setHasSaves(false));
		}
	}, [isOpen]);

	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (isOpen) closeModal();
				else openModal("pause");
			}
		};
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [isOpen, openModal, closeModal]);

	const menuItems = [
		{ label: "RESUME", action: () => closeModal() },
		{
			label: "SAVE GAME",
			action: async () => {
				await useGameStore.getState().saveGame();
				setHasSaves(true);
				closeModal();
			},
		},
		...(hasSaves
			? [
					{
						label: "LOAD GAME",
						action: () => {
							closeModal();
							navigate("/session");
						},
					},
				]
			: []),
		{
			label: "MAIN MENU",
			action: () => {
				closeModal();
				navigate("/");
			},
		},
	];

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
					className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
					onClick={closeModal}
				>
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						transition={{ duration: 0.2 }}
						className="w-72 border border-border bg-card p-6"
						onClick={(e) => e.stopPropagation()}
					>
						<h2 className="mb-6 text-center font-heading text-sm tracking-[0.2em] text-primary">
							PAUSED
						</h2>
						<nav className="flex flex-col gap-2">
							{menuItems.map((item) => (
								<button
									key={item.label}
									onClick={item.action}
									className="w-full border border-border px-4 py-2.5 font-mono text-xs tracking-wider text-foreground transition-all duration-200 hover:border-primary/40 hover:bg-secondary hover:text-primary"
								>
									{item.label}
								</button>
							))}
						</nav>
						<p className="mt-4 text-center font-mono text-[9px] text-muted-foreground/50">
							Press ESC to resume
						</p>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
