import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { cn } from "@/lib/utils";

export default function JournalPage() {
	const { journalEntries, clues } = useGameStore();
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedClueId, setSelectedClueId] = useState<string | null>(null);

	const caseEntries = journalEntries.filter(
		(e) =>
			(!e.category || e.category === "case" || e.category === "note") &&
			(!searchQuery ||
				e.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
				e.tags.some((t) =>
					t.toLowerCase().includes(searchQuery.toLowerCase()),
				)),
	);

	const evidenceEntries = journalEntries.filter(
		(e) =>
			e.category === "evidence" &&
			(!searchQuery ||
				e.content.toLowerCase().includes(searchQuery.toLowerCase())),
	);

	const selectedClue = clues.find((c) => c.id === selectedClueId);

	return (
		<div className="flex h-full">
			<div className="flex flex-1 flex-col">
				{/* Tabs */}
				<div className="flex items-center border-b border-border px-6 py-3">
					<div className="ml-auto flex items-center gap-2">
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search..."
							className="w-48 border border-border bg-secondary px-3 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:border-primary/30 focus:outline-none"
						/>
					</div>
				</div>

				{/* Content */}
				<div className="flex flex-1 overflow-hidden">
					<div className="flex-1 overflow-y-auto p-6">
						<div className="space-y-12">
							<div className="space-y-4">
								<h3 className="font-heading text-sm tracking-wider text-primary">
									CASE FILE — THE RUSTED FLAGON
								</h3>
								{caseEntries.length === 0 ? (
									<p className="font-mono text-xs text-muted-foreground">
										{searchQuery
											? "No matching entries."
											: "The case file is empty."}
									</p>
								) : (
									caseEntries.map((entry) => (
										<motion.div
											key={entry.id}
											className="border-l-2 border-primary/30 py-2 pl-4"
											initial={{ opacity: 0, x: -10 }}
											animate={{ opacity: 1, x: 0 }}
										>
											<div className="mb-1 flex items-center gap-2">
												<span className="font-mono text-[10px] text-muted-foreground">
													{new Date(entry.timestamp).toLocaleTimeString()}
												</span>
												{entry.tags.map((tag) => (
													<span
														key={tag}
														className="border border-border bg-secondary px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground"
													>
														{tag}
													</span>
												))}
											</div>
											<p className="text-sm leading-relaxed text-foreground">
												{entry.content}
											</p>
										</motion.div>
									))
								)}
							</div>

							<div>
								<h3 className="mb-4 font-heading text-sm tracking-wider text-primary">
									EVIDENCE & CLUES
								</h3>
								<div className="grid grid-cols-2 gap-3">
									{clues
										.filter((c) => c.discovered)
										.map((clue) => (
											<button
												key={clue.id}
												onClick={() => setSelectedClueId(clue.id)}
												className={cn(
													"space-y-2 border p-4 text-left transition-colors",
													selectedClueId === clue.id
														? "border-primary/40 bg-secondary"
														: "border-border bg-card hover:border-primary/30",
												)}
											>
												<h4 className="font-heading text-xs tracking-wider text-primary">
													{clue.title}
												</h4>
												<p className="text-[11px] leading-relaxed text-muted-foreground">
													{clue.description}
												</p>
												<div className="flex items-center gap-2 pt-1">
													{clue.linkedClues.length > 0 && (
														<span className="font-mono text-[9px] text-accent-foreground">
															⟁ {clue.linkedClues.length} linked
														</span>
													)}
													<span className="font-mono text-[9px] text-muted-foreground">
														TENSION: {clue.tension}%
													</span>
												</div>
											</button>
										))}
								</div>
								{evidenceEntries.length > 0 && (
									<div className="mt-6 space-y-3">
										<h4 className="font-mono text-[10px] tracking-widest text-muted-foreground">
											FIELD NOTES
										</h4>
										{evidenceEntries.map((entry) => (
											<div
												key={entry.id}
												className="border-l-2 border-accent/30 py-1 pl-3"
											>
												<p className="text-xs leading-relaxed text-foreground/80">
													{entry.content}
												</p>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Clue detail panel */}
					{selectedClue && (
						<div className="w-[300px] border-l border-border bg-card p-4">
							<motion.div
								key={selectedClue.id}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								className="space-y-3"
							>
								<h4 className="font-heading text-sm tracking-wider text-primary">
									{selectedClue.title}
								</h4>
								<p className="text-xs italic leading-relaxed text-foreground/80">
									{selectedClue.description}
								</p>
								<div className="flex items-center gap-2 border-t border-border pt-3">
									<span className="font-mono text-[9px] tracking-wider text-muted-foreground">
										TENSION
									</span>
									<div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
										<div
											className="h-full bg-destructive"
											style={{ width: `${selectedClue.tension}%` }}
										/>
									</div>
									<span className="font-mono text-[9px] text-destructive">
										{selectedClue.tension}%
									</span>
								</div>
								{selectedClue.linkedClues.length > 0 && (
									<div className="border-t border-border pt-3">
										<span className="font-mono text-[9px] tracking-widest text-muted-foreground">
											LINKED CLUES
										</span>
										{selectedClue.linkedClues.map((id) => {
											const linked = clues.find((c) => c.id === id);
											return linked ? (
												<button
													key={id}
													onClick={() => setSelectedClueId(id)}
													className="mt-1 block text-xs text-primary hover:underline"
												>
													→ {linked.title}
												</button>
											) : null;
										})}
									</div>
								)}
							</motion.div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
