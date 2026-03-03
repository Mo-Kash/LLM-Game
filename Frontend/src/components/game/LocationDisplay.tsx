import { useGameStore } from "@/stores/gameStore";

export function LocationDisplay() {
	const {
		currentLocationName,
		currentLocationDescription,
		connectedLocations,
		npcs,
		isConnected,
		turn,
	} = useGameStore();

	const npcNames = Object.values(npcs).map((n) => n.name);

	return (
		<div className="flex h-full flex-col items-center justify-center px-8">
			{/* Location header */}
			<div className="mb-6 text-center">
				<h2 className="font-heading text-xl tracking-[0.15em] text-foreground">
					{currentLocationName || "Unknown Location"}
				</h2>
				{turn > 0 && (
					<p className="mt-0.5 font-mono text-[10px] tracking-wider text-muted-foreground/40">
						TURN {turn}
					</p>
				)}
			</div>

			{/* Description */}
			<p className="mb-6 text-center text-sm italic leading-relaxed text-muted-foreground">
				{currentLocationDescription ||
					"The shadows are thick here. Every sound carries meaning."}
			</p>

			{/* NPCs Present */}
			{npcNames.length > 0 && (
				<div className="mb-4 text-center">
					<span className="mb-1 block font-mono text-[10px] tracking-widest text-muted-foreground/50">
						PRESENT
					</span>
					<p className="text-xs text-foreground/70">{npcNames.join(", ")}</p>
				</div>
			)}

			{/* Exits */}
			{connectedLocations.length > 0 && (
				<div className="text-center">
					<span className="mb-1 block font-mono text-[10px] tracking-widest text-muted-foreground/50">
						EXITS
					</span>
					<p className="text-xs text-foreground/70">
						{connectedLocations.join(" · ")}
					</p>
				</div>
			)}

			{/* Connection status */}
			<div className="mt-6">
				<span
					className={`inline-block h-2 w-2 rounded-full ${isConnected ? "bg-primary/60" : "bg-destructive/60"}`}
					title={isConnected ? "Connected" : "Disconnected"}
				/>
			</div>
		</div>
	);
}
