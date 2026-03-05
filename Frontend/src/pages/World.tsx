import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/stores/gameStore";
import { apiClient, type LocationInfo, type NPCInfo } from "@/services/api";

export default function WorldPage() {
	const { currentLocation, sessionId, sendAction, refreshState } =
		useGameStore();
	const [locations, setLocations] = useState<LocationInfo[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	// Fetch world locations (only depends on sessionId)
	useEffect(() => {
		if (!sessionId) return;
		setIsLoading(true);
		apiClient
			.listLocations(sessionId)
			.then((list) => {
				setLocations(list);
			})
			.catch(console.error)
			.finally(() => setIsLoading(false));
	}, [sessionId, currentLocation]);

	// Always sync selectedId with currentLocation when it changes
	useEffect(() => {
		if (currentLocation) {
			setSelectedId(currentLocation);
		}
	}, [currentLocation]);

	// Fetch detailed current location whenever we move
	useEffect(() => {
		if (!sessionId || !currentLocation) return;
		apiClient
			.getLocation(sessionId)
			.then((loc) => {
				setLocations((prev) => prev.map((l) => (l.id === loc.id ? loc : l)));
			})
			.catch(console.error);
	}, [sessionId, currentLocation]);

	const selected = locations.find((l) => l.id === selectedId);

	const handleSelect = (locId: string) => {
		setSelectedId(locId);
	};

	const handleTravel = async (locId: string) => {
		await sendAction(`/move ${locId}`);
		// Force state refresh to update location, NPCs, etc.
		await refreshState();
	};

	if (!sessionId) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="font-mono text-xs tracking-wider text-muted-foreground/50">
					START A GAME TO EXPLORE THE WORLD
				</p>
			</div>
		);
	}

	return (
		<div className="flex h-full">
			{/* Location list */}
			<div className="flex w-[300px] flex-col border-r border-border">
				<div className="border-b border-border px-4 py-3">
					<h2 className="font-heading text-xs tracking-widest text-muted-foreground">
						LOCATIONS
					</h2>
					<p className="mt-1 font-mono text-[9px] text-muted-foreground/60">
						EXPLORE THE WORLD
					</p>
				</div>
				<div className="flex-1 overflow-y-auto">
					{isLoading ? (
						<div className="p-4">
							<p className="animate-pulse font-mono text-xs text-muted-foreground/50">
								Loading...
							</p>
						</div>
					) : (
						locations.map((loc) => {
							const isHere = currentLocation === loc.id;
							const isSelected = selectedId === loc.id;

							return (
								<button
									key={loc.id}
									onClick={() => setSelectedId(loc.id)}
									className={cn(
										"flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left transition-colors",
										isSelected ? "bg-secondary" : "hover:bg-secondary/50",
									)}
								>
									<div className="flex items-center gap-2">
										{isHere && (
											<span className="h-1.5 w-1.5 rounded-full bg-primary" />
										)}
										<span
											className={cn(
												"font-heading text-xs tracking-wider",
												isHere ? "text-primary" : "text-foreground",
											)}
										>
											{loc.name}
										</span>
									</div>
									{loc.npcs_present.length > 0 && (
										<span className="font-mono text-[9px] text-muted-foreground">
											{loc.npcs_present.map((n: NPCInfo) => n.name).join(" · ")}
										</span>
									)}
								</button>
							);
						})
					)}

					{/* Show connected locations */}
					{selected &&
						selected.connected_to.map((connId: string) => {
							const exists = locations.find((l) => l.id === connId);
							if (exists) return null;
							return (
								<button
									key={connId}
									onClick={() => handleSelect(connId)}
									className="flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left transition-colors hover:bg-secondary/50"
								>
									<div className="flex items-center gap-2">
										<span className="font-heading text-xs tracking-wider text-muted-foreground">
											→ {connId.replace(/_/g, " ")}
										</span>
									</div>
									<span className="font-mono text-[9px] text-muted-foreground/50">
										View location
									</span>
								</button>
							);
						})}
				</div>
			</div>

			{/* Detail panel */}
			<div className="flex flex-1 flex-col">
				{selected ? (
					<motion.div
						key={selected.id}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.3 }}
						className="flex flex-1 flex-col p-8"
					>
						<h3 className="font-heading text-lg tracking-wider text-foreground">
							{selected.name}
						</h3>

						{currentLocation === selected.id ? (
							<span className="mt-1 inline-block font-mono text-[10px] tracking-wider text-primary">
								● YOU ARE HERE
							</span>
						) : (
							<button
								onClick={() => handleTravel(selected.id)}
								className="mt-2 w-fit border border-primary px-4 py-1.5 font-mono text-[10px] tracking-wider text-primary transition-colors hover:bg-primary/10"
							>
								TRAVEL HERE
							</button>
						)}

						<p className="mt-4 text-sm italic leading-relaxed text-foreground/80">
							{selected.description}
						</p>

						{/* Objects */}
						{selected.objects_here.length > 0 && (
							<div className="mt-6 space-y-1 border-t border-border pt-4">
								<span className="font-mono text-[10px] tracking-wider text-muted-foreground">
									OBJECTS
								</span>
								{selected.objects_here.map((obj) => (
									<p key={obj.id} className="text-sm text-foreground">
										{obj.name}{" "}
										<span className="text-xs text-muted-foreground">
											— {obj.description}
										</span>
									</p>
								))}
							</div>
						)}

						{/* NPCs Present */}
						<div className="mt-4 space-y-1 border-t border-border pt-4">
							<span className="font-mono text-[10px] tracking-wider text-muted-foreground">
								PRESENT
							</span>
							{selected.npcs_present.length > 0 ? (
								selected.npcs_present.map((npc: NPCInfo) => (
									<p key={npc.id} className="text-sm text-foreground">
										{npc.name}
									</p>
								))
							) : (
								<p className="text-xs italic text-muted-foreground">
									No one of note
								</p>
							)}
						</div>

						{/* Connected locations */}
						<div className="mt-4 space-y-1 border-t border-border pt-4">
							<span className="font-mono text-[10px] tracking-wider text-muted-foreground">
								CONNECTED TO
							</span>
							<div className="flex flex-wrap gap-2">
								{selected.connected_to.map((connId: string) => (
									<button
										key={connId}
										onClick={() => handleSelect(connId)}
										className="border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
									>
										→ {connId.replace(/_/g, " ")}
									</button>
								))}
							</div>
						</div>
					</motion.div>
				) : (
					<div className="flex flex-1 items-center justify-center">
						<p className="font-mono text-xs text-muted-foreground/50">
							Select a location
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
