import { motion } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { cn } from "@/lib/utils";
import type { NPC } from "@/types/game";

function NPCSwitcher() {
	const { npcs, activeNPC, switchNPC, currentLocation } = useGameStore();
	const npcList = Object.values(npcs).filter(
		(n) => n.locationId === currentLocation,
	);

	if (npcList.length === 0) return null;

	return (
		<div className="border-t border-border pt-4">
			<span className="mb-3 block font-mono text-[10px] tracking-wider text-muted-foreground/60">
				{activeNPC ? "OTHERS PRESENT" : "SELECT SOMEONE TO TALK TO"}
			</span>
			<div className="space-y-2">
				{npcList
					.filter((n) => n.id !== activeNPC?.id)
					.map((n) => (
						<button
							key={n.id}
							onClick={() => switchNPC(n.id)}
							className="group flex w-full items-center justify-between border border-border px-3 py-2 text-left transition-all hover:border-primary/50 hover:bg-secondary"
						>
							<div className="flex flex-col">
								<span className="font-heading text-xs tracking-wider text-foreground group-hover:text-primary">
									{n.name}
								</span>
								<span className="font-mono text-[9px] text-muted-foreground/60">
									{n.emotionalLabel}
								</span>
							</div>
							<span className="font-mono text-[10px] text-muted-foreground group-hover:text-primary">
								→
							</span>
						</button>
					))}
			</div>
		</div>
	);
}

function TrustMeter({ npc }: { npc: NPC }) {
	const pct = npc.trustPercent;

	return (
		<div className="space-y-1">
			<div className="flex justify-between font-mono text-[10px] text-muted-foreground/60">
				<span>TRUST</span>
				<span>{npc.trust}</span>
			</div>
			<div className="relative h-1.5 overflow-hidden rounded-full bg-secondary">
				<motion.div
					className="trust-gradient h-full rounded-full"
					initial={{ width: 0 }}
					animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
					transition={{ duration: 1.5, ease: "easeOut" }}
				/>
				{npc.trustThresholds.map((t) => (
					<div
						key={t.value}
						className="absolute top-0 h-full w-px bg-foreground/20"
						style={{
							left: `${((t.value + 100) / 200) * 100}%`,
						}}
						title={t.label}
					/>
				))}
			</div>
			<div className="mt-1.5 flex gap-1">
				{npc.trustThresholds.map((t) => (
					<span
						key={t.value}
						className={cn(
							"font-mono text-[9px]",
							t.unlocked ? "text-primary/70" : "text-muted-foreground/30",
						)}
					>
						{t.label}
					</span>
				))}
			</div>
		</div>
	);
}

export function ActiveNPCPanel() {
	const activeNPC = useGameStore((s) => s.activeNPC);
	const currentLocationName = useGameStore((s) => s.currentLocationName);

	const innerContent = activeNPC ? (
		<div className="flex flex-1 flex-col space-y-6 overflow-y-auto px-4 py-4">
			{/* Portrait placeholder */}
			<div className="relative mx-auto flex aspect-[3/4] w-full items-center justify-center border-2 border-border bg-secondary/50">
				<span className="font-heading text-[10px] tracking-[0.3em] text-muted-foreground/20">
					PORTRAIT
				</span>
				<div className="absolute inset-0 border border-primary/5" />
			</div>

			{/* Name & title */}
			<div className="text-center">
				<h3 className="font-heading text-sm tracking-widest text-foreground">
					{activeNPC.name.toUpperCase()}
				</h3>
				{activeNPC.title && (
					<p className="mt-1 font-mono text-[9px] tracking-wider text-muted-foreground/60">
						{activeNPC.title.toUpperCase()}
					</p>
				)}
			</div>

			{/* Trust meter */}
			<TrustMeter npc={activeNPC} />

			{/* Emotional state & relationship */}
			<div className="space-y-2 border-t border-border pt-4">
				<div className="flex items-center justify-between">
					<span className="font-mono text-[10px] tracking-wider text-muted-foreground/60">
						MOOD
					</span>
					<span
						className={cn(
							"font-mono text-[10px] uppercase",
							activeNPC.emotionalState === "trusting"
								? "text-primary"
								: activeNPC.emotionalState === "hostile" ||
									  activeNPC.emotionalState === "suspicious"
									? "text-destructive"
									: "text-foreground",
						)}
					>
						{activeNPC.emotionalLabel}
					</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="font-mono text-[10px] tracking-wider text-muted-foreground/60">
						STANDING
					</span>
					<span className="font-heading text-[10px] tracking-wider text-primary/70">
						{activeNPC.relationshipTier.toUpperCase()}
					</span>
				</div>
			</div>

			{/* NPC Switcher */}
			<NPCSwitcher />
		</div>
	) : (
		<div className="flex-1 space-y-6 px-4 py-8">
			<div className="text-center">
				<p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground/40">
					NO ACTIVE ENGAGEMENT
				</p>
			</div>
			<NPCSwitcher />
		</div>
	);

	return (
		<div className="flex h-full flex-col">
			<div className="border-b border-border px-4 py-2">
				<h2 className="font-heading text-[10px] tracking-[0.2em] text-muted-foreground/60">
					LOCATION: {currentLocationName.toUpperCase()}
				</h2>
			</div>
			{innerContent}
		</div>
	);
}
