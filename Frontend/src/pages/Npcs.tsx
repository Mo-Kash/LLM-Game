import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/stores/gameStore";
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

export default function NpcsPage() {
	const { npcs } = useGameStore();
	const npcList = Object.values(npcs);
	const [selectedId, setSelectedId] = useState<string | null>(
		npcList[0]?.id ?? null,
	);
	const selected = npcList.find((n) => n.id === selectedId);

	if (npcList.length === 0) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="font-mono text-xs tracking-wider text-muted-foreground/50">
					NO KNOWN CHARACTERS
				</p>
			</div>
		);
	}

	return (
		<div className="flex h-full">
			{/* NPC List */}
			<div className="flex w-[300px] flex-col border-r border-border bg-card">
				<div className="border-b border-border px-4 py-3">
					<h2 className="font-heading text-xs tracking-widest text-muted-foreground">
						KNOWN CHARACTERS
					</h2>
				</div>
				<div className="flex-1 overflow-y-auto">
					{npcList.map((npc) => {
						const emotion =
							EMOTION_LABELS[npc.emotionalState] ?? EMOTION_LABELS.neutral;

						return (
							<button
								key={npc.id}
								onClick={() => setSelectedId(npc.id)}
								className={cn(
									"w-full border-b border-border px-4 py-3 text-left transition-colors duration-200",
									selectedId === npc.id
										? "bg-secondary"
										: "hover:bg-secondary/50",
								)}
							>
								<div className="flex items-center justify-between">
									<span className="font-heading text-sm tracking-wider text-foreground">
										{npc.name}
									</span>
									<span className={cn("text-[10px] capitalize", emotion.color)}>
										{emotion.label}
									</span>
								</div>
								<span className="mt-0.5 block text-[10px] text-muted-foreground">
									{npc.title}
								</span>
								{/* Mini trust bar */}
								<div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
									<div
										className="trust-gradient h-full transition-all duration-500"
										style={{
											width: `${((npc.trust + 100) / 200) * 100}%`,
										}}
									/>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* NPC Detail */}
			<div className="flex flex-1 flex-col overflow-y-auto">
				<AnimatePresence mode="wait">
					{selected ? (
						<motion.div
							key={selected.id}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.3 }}
							className="flex flex-1 flex-col p-6"
						>
							{/* Header */}
							<div className="mb-6 flex items-start gap-6">
								<div className="flex h-24 w-24 shrink-0 items-center justify-center border border-border bg-secondary">
									<span className="font-heading text-2xl text-muted-foreground">
										{selected.name[0]}
									</span>
								</div>
								<div>
									<h1 className="font-heading text-xl tracking-wider text-primary">
										{selected.name}
									</h1>
									<p className="mt-1 font-mono text-xs tracking-wider text-muted-foreground">
										{selected.title}
									</p>
									<div className="mt-2 flex gap-2">
										{selected.allegiances.map((a) => (
											<span
												key={a}
												className="border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
											>
												{a}
											</span>
										))}
									</div>
								</div>
							</div>

							{/* Stats Grid */}
							<div className="mb-6 grid grid-cols-3 gap-4">
								<StatBlock label="TRUST" value={`${selected.trust}`} />
								<StatBlock label="SUSPICION" value={`${selected.suspicion}%`} />
								<StatBlock
									label="MOOD"
									value={selected.emotionalState.toUpperCase()}
								/>
								<StatBlock
									label="RELATIONSHIP"
									value={selected.relationshipTier.toUpperCase()}
								/>
								<StatBlock
									label="SECRETS KNOWN"
									value={`${selected.revealedSecrets}/${selected.revealedSecrets + selected.hiddenSecrets}`}
								/>
								<StatBlock label="HIDDEN" value={`${selected.hiddenSecrets}`} />
							</div>

							{/* Trust Meter */}
							<div className="mb-6">
								<h3 className="mb-2 font-mono text-[10px] tracking-widest text-muted-foreground">
									TRUST PROGRESSION
								</h3>
								<div className="relative h-3 overflow-hidden rounded-full bg-secondary">
									<motion.div
										className="trust-gradient h-full"
										initial={{ width: 0 }}
										animate={{
											width: `${((selected.trust + 100) / 200) * 100}%`,
										}}
										transition={{
											duration: 0.8,
											ease: "easeOut",
										}}
									/>
									{selected.trustThresholds.map((t) => (
										<div
											key={t.value}
											className="absolute top-0 h-full w-px bg-background"
											style={{
												left: `${((t.value + 100) / 200) * 100}%`,
											}}
											title={t.label}
										/>
									))}
								</div>
								<div className="mt-2 flex justify-between">
									{selected.trustThresholds.map((t) => (
										<span
											key={t.value}
											className={cn(
												"font-mono text-[9px]",
												t.unlocked
													? "text-primary"
													: "text-muted-foreground/50",
											)}
										>
											{t.label}
										</span>
									))}
								</div>
							</div>

							{/* Description */}
							<div className="border-t border-border pt-4">
								<h3 className="mb-2 font-mono text-[10px] tracking-widest text-muted-foreground">
									NOTES
								</h3>
								<p className="text-sm italic leading-relaxed text-foreground/80">
									{selected.title
										? `${selected.name} — ${selected.title}.`
										: "No notes recorded."}
								</p>
							</div>
						</motion.div>
					) : (
						<div className="flex flex-1 items-center justify-center">
							<p className="font-mono text-xs text-muted-foreground/50">
								SELECT A CHARACTER
							</p>
						</div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}

function StatBlock({ label, value }: { label: string; value: string }) {
	return (
		<div className="border border-border bg-secondary/50 p-3">
			<span className="block font-mono text-[9px] tracking-widest text-muted-foreground">
				{label}
			</span>
			<span className="mt-1 block font-heading text-sm tracking-wider text-foreground">
				{value}
			</span>
		</div>
	);
}
