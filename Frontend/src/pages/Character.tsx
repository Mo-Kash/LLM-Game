import { motion } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { useSessionStore } from "@/stores/sessionStore";
import { cn } from "@/lib/utils";

export default function CharacterPage() {
	const { activeNPC, currentLocationName, turn, inventory } = useGameStore();
	const { activeSession } = useSessionStore();

	return (
		<div className="flex h-full">
			{/* Left — Player Identity */}
			<div className="flex w-[300px] flex-col border-r border-border bg-card">
				<div className="border-b border-border px-4 py-3">
					<h2 className="font-heading text-xs tracking-widest text-muted-foreground">
						INVESTIGATOR
					</h2>
				</div>
				<div className="space-y-4 overflow-y-auto p-4">
					{/* Portrait */}
					<div className="flex h-32 w-full items-center justify-center border border-border bg-secondary">
						<span className="font-heading text-4xl text-muted-foreground/30">
							?
						</span>
					</div>

					{activeSession && (
						<div className="space-y-1">
							<span className="font-mono text-[9px] tracking-widest text-muted-foreground">
								BACKGROUND
							</span>
							<p className="font-heading text-sm tracking-wider text-foreground">
								{activeSession.background}
							</p>
						</div>
					)}

					{/* Current Location */}
					<div className="space-y-1 border-t border-border pt-3">
						<span className="font-mono text-[9px] tracking-widest text-muted-foreground">
							CURRENT LOCATION
						</span>
						<p className="text-sm text-foreground">
							{currentLocationName || "Unknown"}
						</p>
					</div>

					{/* Active NPC */}
					{activeNPC && (
						<div className="space-y-1 border-t border-border pt-3">
							<span className="font-mono text-[9px] tracking-widest text-muted-foreground">
								SPEAKING WITH
							</span>
							<p className="text-sm text-foreground">{activeNPC.name}</p>
							<p className="font-mono text-[10px] text-muted-foreground">
								{activeNPC.title}
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Center — Flags & Environment */}
			<div className="flex flex-1 flex-col overflow-y-auto p-6">
				<div className="space-y-6">
					{activeNPC && (
						<div>
							<h3 className="mb-3 font-heading text-xs tracking-widest text-primary">
								TRUST — {activeNPC.name.toUpperCase()}
							</h3>
							<div className="space-y-2">
								<div className="flex justify-between font-mono text-[10px]">
									<span className="text-muted-foreground">
										{activeNPC.relationshipTier.toUpperCase()}
									</span>
									<span className="text-primary">
										{activeNPC.trust}/{activeNPC.maxTrust}
									</span>
								</div>
								<div className="h-2 w-full overflow-hidden bg-secondary">
									<motion.div
										className="h-full bg-primary"
										initial={{ width: 0 }}
										animate={{
											width: `${(activeNPC.trust / activeNPC.maxTrust) * 100}%`,
										}}
										transition={{ duration: 0.6 }}
									/>
								</div>
								<div className="flex gap-2">
									{activeNPC.trustThresholds.map((t) => (
										<span
											key={t.label}
											className={cn(
												"font-mono text-[9px]",
												t.unlocked
													? "text-primary"
													: "text-muted-foreground/40",
											)}
										>
											{t.unlocked ? "●" : "○"} {t.label}
										</span>
									))}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
