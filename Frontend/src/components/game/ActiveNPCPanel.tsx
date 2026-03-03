import { motion } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { cn } from "@/lib/utils";
import type { NPC } from "@/types/game";

const EMOTION_LABELS: Record<string, { label: string; color: string }> = {
	neutral: { label: "Composed", color: "text-muted-foreground" },
	suspicious: { label: "Suspicious", color: "text-destructive" },
	fearful: { label: "Fearful", color: "text-accent-foreground" },
	angry: { label: "Hostile", color: "text-destructive" },
	melancholic: { label: "Melancholic", color: "text-muted-foreground" },
	guarded: { label: "Guarded", color: "text-muted-foreground" },
	trusting: { label: "Trusting", color: "text-primary" },
	desperate: { label: "Desperate", color: "text-destructive" },
	hostile: { label: "Hostile", color: "text-destructive" },
	playful: { label: "Playful", color: "text-primary" },
};

function TrustMeter({ npc }: { npc: NPC }) {
	const pct = ((npc.trust + 100) / 200) * 100; // trust range: -100 to 100

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

function NPCSwitcher() {
	const { npcs, activeNPC, switchNPC } = useGameStore();
	const npcList = Object.values(npcs);

	if (npcList.length <= 1) return null;

	return (
		<div className="border-t border-border pt-3">
			<span className="mb-2 block font-mono text-[10px] tracking-wider text-muted-foreground/60">
				OTHERS PRESENT
			</span>
			<div className="space-y-1">
				{npcList
					.filter((n) => n.id !== activeNPC?.id)
					.map((n) => (
						<button
							key={n.id}
							onClick={() => switchNPC(n.id)}
							className="block w-full text-left font-mono text-xs text-muted-foreground transition-colors hover:text-primary"
						>
							→ {n.name}
						</button>
					))}
			</div>
		</div>
	);
}

export function ActiveNPCPanel() {
	const activeNPC = useGameStore((s) => s.activeNPC);

	if (!activeNPC) {
		return (
			<div className="flex h-full flex-col items-center justify-center">
				<p className="font-mono text-xs tracking-wider text-muted-foreground/30">
					NO ONE APPROACHES
				</p>
			</div>
		);
	}

	const emotion =
		EMOTION_LABELS[activeNPC.emotionalState] ?? EMOTION_LABELS.neutral;

	return (
		<div className="flex h-full flex-col">
			<div className="border-b border-border px-4 py-2">
				<h2 className="font-heading text-xs tracking-widest text-muted-foreground">
					PRESENT
				</h2>
			</div>
			<div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
				{/* Portrait placeholder */}
				<div className="relative mx-auto flex aspect-[3/4] w-full items-center justify-center border-2 border-border bg-secondary/50">
					<span className="font-heading text-xs tracking-widest text-muted-foreground/20">
						PORTRAIT
					</span>
					<div className="absolute inset-0 border border-primary/10" />
				</div>

				{/* Name & title */}
				<div className="text-center">
					<h3 className="font-heading text-base tracking-wider text-foreground">
						{activeNPC.name}
					</h3>
					{activeNPC.title && (
						<p className="mt-0.5 font-mono text-[10px] tracking-wider text-muted-foreground/60">
							{activeNPC.title}
						</p>
					)}
				</div>

				{/* Trust meter */}
				<TrustMeter npc={activeNPC} />

				{/* Emotional state */}
				<div className="flex items-center gap-2">
					<span className="font-mono text-[10px] tracking-wider text-muted-foreground/60">
						MOOD
					</span>
					<span className={cn("font-mono text-xs", emotion.color)}>
						{emotion.label}
					</span>
				</div>

				{/* Relationship tier */}
				<div className="flex items-center gap-2 border-t border-border pt-2">
					<span className="font-mono text-[10px] tracking-wider text-muted-foreground/60">
						STANDING
					</span>
					<span className="font-heading text-xs capitalize tracking-wider text-primary/70">
						{activeNPC.relationshipTier}
					</span>
				</div>

				{/* NPC Switcher */}
				<NPCSwitcher />
			</div>
		</div>
	);
}
