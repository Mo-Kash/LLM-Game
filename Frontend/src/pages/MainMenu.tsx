import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { apiClient, SaveInfo } from "@/services/api";

export default function MainMenu() {
	const navigate = useNavigate();
	const { sessionId } = useGameStore();
	const [saves, setSaves] = useState<SaveInfo[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		apiClient
			.listSessions()
			.then(setSaves)
			.catch(console.error)
			.finally(() => setIsLoading(false));
	}, []);

	const hasSaves = saves.length > 0;

	const menuItems = [
		{
			label: "NEW GAME",
			action: () => navigate("/new-game"),
			enabled: !isLoading,
		},
		// Only include Continue if there's an active session or saved games
		...(!!sessionId || hasSaves
			? [
					{
						label: "CONTINUE",
						action: async () => {
							if (sessionId) {
								navigate("/game");
								return;
							}
							if (saves.length > 0) {
								try {
									await useGameStore.getState().loadGame(saves[0].session_id);
									navigate("/game");
								} catch (err) {
									console.error(err);
								}
							}
						},
						enabled: !isLoading,
					},
				]
			: []),
		// Only include Load Game if there are saved games
		...(hasSaves
			? [
					{
						label: "LOAD GAME",
						action: () => navigate("/session"),
						enabled: !isLoading,
					},
				]
			: []),
	];

	return (
		<div className="flex h-screen w-screen flex-col items-center justify-center bg-background">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.8, ease: "easeOut" }}
				className="flex flex-col items-center gap-12"
			>
				<div className="text-center">
					<h1 className="font-heading text-4xl tracking-[0.2em] text-primary">
						THE RUSTED FLAGON
					</h1>
					<p className="mt-3 font-mono text-xs tracking-[0.3em] text-muted-foreground">
						ONTOLOGY-AWARE RAG DIALOGUE SYSTEM
					</p>
				</div>

				<div className="h-px w-48 bg-border" />

				<nav className="flex flex-col items-center gap-3">
					{menuItems.map((item, i) => (
						<motion.button
							key={item.label}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.3 + i * 0.1 }}
							onClick={item.action}
							disabled={!item.enabled}
							className="w-56 border border-border px-6 py-3 font-heading text-xs tracking-[0.2em] text-foreground transition-all duration-300 hover:border-primary/50 hover:bg-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
						>
							{item.label}
						</motion.button>
					))}
				</nav>
			</motion.div>
		</div>
	);
}
