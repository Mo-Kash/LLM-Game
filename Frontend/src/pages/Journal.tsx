import { motion } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";

export default function JournalPage() {
	const { journalEntries } = useGameStore();

	const sortedEntries = [...journalEntries].sort(
		(a, b) => b.timestamp - a.timestamp,
	);

	return (
		<div className="flex h-full flex-col bg-background">
			{/* Header */}
			<div className="flex items-center border-b border-border px-8 py-6">
				<div className="space-y-1">
					<h3 className="font-heading text-lg tracking-[0.2em] text-primary">
						CHRONICLE OF EVENTS
					</h3>
					<p className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground opacity-60">
						Automated dossier logs
					</p>
				</div>
			</div>

			{/* Content */}
			<div className="custom-scrollbar flex-1 overflow-y-auto p-8">
				<div className="mx-auto max-w-3xl space-y-8">
					{sortedEntries.length === 0 ? (
						<div className="flex h-[40vh] items-center justify-center border border-dashed border-border/40">
							<p className="font-mono text-[10px] uppercase italic tracking-widest text-muted-foreground opacity-40">
								The archive is currently empty. Events will be logged
								automatically.
							</p>
						</div>
					) : (
						<div className="space-y-6">
							{sortedEntries.map((entry, idx) => (
								<motion.div
									key={entry.id || idx}
									initial={{ opacity: 0, x: -10 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: idx * 0.05 }}
									className="group relative border-l border-primary/20 py-4 pl-6 transition-all hover:border-primary/50"
								>
									{/* Timeline marker */}
									<div className="absolute -left-[4.5px] top-6 h-2 w-2 rounded-full border border-primary/20 bg-background group-hover:border-primary group-hover:bg-primary/20" />

									<div className="mb-2 flex items-center justify-between">
										<span className="font-mono text-[10px] tracking-widest text-primary/70">
											LOG ENTRY #{sortedEntries.length - idx}
										</span>
										<span className="font-mono text-[9px] text-muted-foreground opacity-60">
											{new Date(entry.timestamp).toLocaleString([], {
												hour: "2-digit",
												minute: "2-digit",
												second: "2-digit",
											})}
										</span>
									</div>

									<p className="font-body text-sm leading-relaxed text-foreground/90 selection:bg-primary/30">
										{entry.content}
									</p>
								</motion.div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Footer / Info */}
			<div className="border-t border-border bg-card/20 px-8 py-4">
				<p className="text-center font-mono text-[9px] tracking-widest text-muted-foreground opacity-40">
					[ END OF ARCHIVE ]
				</p>
			</div>
		</div>
	);
}
