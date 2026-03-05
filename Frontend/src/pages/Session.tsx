import { useSessionStore } from "@/stores/sessionStore";

export default function SessionPage() {
	const { saveSlots, activeSession } = useSessionStore();

	return (
		<div className="flex h-full">
			<div className="flex-1 space-y-8 overflow-y-auto p-8">
				{/* Active session info */}
				{activeSession && (
					<div className="space-y-3">
						<h2 className="font-heading text-xs tracking-widest text-muted-foreground">
							ACTIVE SESSION
						</h2>
						<div className="space-y-2 border border-border bg-card p-4">
							<div className="flex justify-between text-xs">
								<span className="font-mono text-muted-foreground/60">SEED</span>
								<span className="font-mono text-foreground">
									{activeSession.worldSeed}
								</span>
							</div>
							<div className="flex justify-between text-xs">
								<span className="font-mono text-muted-foreground/60">
									BACKGROUND
								</span>
								<span className="text-foreground">
									{activeSession.background}
								</span>
							</div>
							<div className="flex justify-between text-xs">
								<span className="font-mono text-muted-foreground/60">
									ALIGNMENT
								</span>
								<span className="text-foreground">
									{activeSession.moralAlignment}
								</span>
							</div>
						</div>
					</div>
				)}

				{/* Save slots */}
				<div className="space-y-3">
					<h2 className="font-heading text-xs tracking-widest text-muted-foreground">
						SAVE SLOTS
					</h2>
					<div className="space-y-2">
						{saveSlots.length === 0 ? (
							<div className="border border-dashed border-border/50 bg-card/10 p-12 text-center">
								<p className="font-mono text-xs tracking-[0.2em] text-muted-foreground/40">
									NO SAVED GAMES DETECTED
								</p>
							</div>
						) : (
							saveSlots.map((slot) => (
								<div
									key={slot.id}
									className="group flex cursor-pointer items-center justify-between border border-border bg-card p-4 transition-colors hover:border-primary/20"
								>
									<div>
										<span className="font-heading text-xs tracking-wider text-foreground">
											{slot.label ?? `Slot ${slot.id}`}
										</span>
										<p className="mt-0.5 font-mono text-[10px] text-muted-foreground/50">
											{slot.location} — {slot.subLocation}
										</p>
									</div>
									<div className="text-right">
										<span className="font-mono text-[10px] text-muted-foreground/40">
											{new Date(slot.timestamp).toLocaleDateString()}
										</span>
										<p className="font-mono text-[10px] text-muted-foreground/30">
											{Math.floor(slot.playtime / 60)}m
										</p>
									</div>
								</div>
							))
						)}
					</div>

					{/* Placeholder slots for flavor, only if slots exist or just show minimal empty slots */}
					{saveSlots.length > 0 && saveSlots.length < 3 && (
						<div className="cursor-pointer border border-dashed border-border/50 bg-card/30 p-4 text-center transition-colors hover:border-primary/20">
							<span className="font-mono text-[10px] tracking-widest text-muted-foreground/20">
								EMPTY SLOT
							</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
