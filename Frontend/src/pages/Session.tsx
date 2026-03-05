import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { apiClient, SaveInfo } from "@/services/api";

export default function SessionPage() {
	const navigate = useNavigate();
	const { loadGame } = useGameStore();
	const [saves, setSaves] = useState<SaveInfo[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	// Always re-fetch when this page mounts (e.g. after saving)
	useEffect(() => {
		setIsLoading(true);
		apiClient
			.listSessions()
			.then(setSaves)
			.catch(console.error)
			.finally(() => setIsLoading(false));
	}, []);

	const handleLoad = async (id: string) => {
		try {
			await loadGame(id);
			navigate("/game");
		} catch (error) {
			console.error("Load failed:", error);
		}
	};

	return (
		<div className="flex h-full flex-col bg-background p-8">
			<div className="mb-8 space-y-2">
				<h2 className="font-heading text-xl tracking-[0.2em] text-primary">
					ARCHIVED DOSSIERS
				</h2>
				<p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground opacity-60">
					Select a session to resume investigation
				</p>
			</div>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{isLoading ? (
					<div className="col-span-full py-20 text-center">
						<p className="animate-pulse font-mono text-xs text-muted-foreground">
							SCANNING ARCHIVES...
						</p>
					</div>
				) : saves.length === 0 ? (
					<div className="col-span-full border border-dashed border-border/40 bg-card/10 py-20 text-center">
						<p className="font-mono text-xs uppercase tracking-widest text-muted-foreground opacity-40">
							NO SAVED SESSIONS FOUND
						</p>
					</div>
				) : (
					saves.map((save) => (
						<motion.button
							key={save.session_id}
							initial={{ opacity: 0, scale: 0.98 }}
							animate={{ opacity: 1, scale: 1 }}
							onClick={() => handleLoad(save.session_id)}
							className="group flex flex-col border border-border bg-card/40 p-6 text-left shadow-sm transition-all hover:border-primary/50 hover:bg-secondary/40 hover:shadow-primary/5"
						>
							<div className="mb-4 flex items-start justify-between">
								<span className="font-heading text-sm tracking-widest text-primary">
									{save.player_name.toUpperCase()}
								</span>
								<span className="font-mono text-[9px] text-muted-foreground/40">
									TURN {save.turn}
								</span>
							</div>

							<div className="space-y-4">
								<div className="space-y-1">
									<label className="block font-mono text-[9px] uppercase tracking-widest text-muted-foreground opacity-50">
										LAST KNOWN LOCATION
									</label>
									<p className="text-sm font-medium text-foreground/90">
										{save.location_name}
									</p>
								</div>

								<div className="flex items-center justify-between border-t border-border/40 pt-4">
									<span className="font-mono text-[9px] text-muted-foreground">
										RECORDED:{" "}
										{new Date(save.created_at * 1000).toLocaleDateString()}
									</span>
									<span className="font-mono text-[9px] text-primary opacity-0 transition-opacity group-hover:opacity-100">
										RESUME →
									</span>
								</div>
							</div>
						</motion.button>
					))
				)}
			</div>
		</div>
	);
}
