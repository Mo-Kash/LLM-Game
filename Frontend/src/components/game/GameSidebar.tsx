import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { cn } from "@/lib/utils";
import type { NPC } from "@/types/game";

/** Convert snake_case IDs to Title Case display names */
function toTitleCase(s: string): string {
	return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const EMOTION_COLORS: Record<string, string> = {
	neutral: "text-muted-foreground",
	suspicious: "text-destructive",
	fearful: "text-accent-foreground",
	angry: "text-destructive",
	melancholic: "text-muted-foreground",
	guarded: "text-muted-foreground",
	trusting: "text-primary",
	desperate: "text-destructive",
	hostile: "text-destructive",
	playful: "text-primary",
};

type SidebarSection = "location" | "player" | "npcs" | "inventory" | "journal";

function SectionHeader({
	label,
	section,
	active,
	onClick,
	badge,
}: {
	label: string;
	section: SidebarSection;
	active: SidebarSection;
	onClick: (s: SidebarSection) => void;
	badge?: string | number;
}) {
	const isActive = active === section;
	return (
		<button
			onClick={() => onClick(section)}
			className={cn(
				"flex w-full items-center justify-between px-3 py-2.5 font-mono text-[11px] tracking-[0.15em] transition-all duration-200",
				isActive
					? "bg-secondary/80 text-primary"
					: "text-muted-foreground/60 hover:bg-secondary/40 hover:text-muted-foreground",
			)}
		>
			<span>{label}</span>
			<span className="flex items-center gap-1.5">
				{badge !== undefined && (
					<span
						className={cn(
							"min-w-[18px] rounded-sm px-1.5 py-px text-center font-mono text-[10px]",
							isActive
								? "bg-primary/20 text-primary"
								: "bg-secondary text-muted-foreground/50",
						)}
					>
						{badge}
					</span>
				)}
				<span className="text-[10px]">{isActive ? "▾" : "▸"}</span>
			</span>
		</button>
	);
}

function MiniTrustBar({ npc }: { npc: NPC }) {
	const pct = ((npc.trust + 100) / 200) * 100;
	return (
		<div className="mt-1.5 space-y-0.5">
			<div className="flex justify-between font-mono text-[10px] text-muted-foreground/50">
				<span>{npc.relationshipTier.toUpperCase()}</span>
				<span>{npc.trust}</span>
			</div>
			<div className="relative h-1 overflow-hidden rounded-full bg-secondary">
				<motion.div
					className="trust-gradient h-full rounded-full"
					initial={{ width: 0 }}
					animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
					transition={{ duration: 0.8, ease: "easeOut" }}
				/>
			</div>
		</div>
	);
}

function LocationSection() {
	const {
		currentLocationName,
		currentLocationDescription,
		connectedLocations,
		turn,
	} = useGameStore();

	return (
		<div className="space-y-3 px-3 py-3">
			<div>
				<span className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground/50">
					CURRENT LOCATION
				</span>
				<h3 className="mt-0.5 font-heading text-base tracking-wider text-primary">
					{currentLocationName || "Unknown"}
				</h3>
			</div>

			{currentLocationDescription && (
				<p className="text-sm italic leading-relaxed text-foreground/60">
					{currentLocationDescription}
				</p>
			)}

			{turn > 0 && (
				<div className="flex items-center gap-2">
					<span className="font-mono text-[10px] tracking-wider text-muted-foreground/40">
						TURN {turn}
					</span>
				</div>
			)}

			{connectedLocations.length > 0 && (
				<div>
					<span className="font-mono text-xs tracking-[0.15em] text-muted-foreground/40">
						EXITS
					</span>
					<div className="mt-1 flex flex-wrap gap-1">
						{connectedLocations.map((loc) => (
							<span
								key={loc}
								className="border border-border/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground/60"
							>
								{toTitleCase(loc)}
							</span>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function PlayerSection() {
	const { playerName, moralAlignment, currency, turn } = useGameStore();

	const alignmentLabel =
		moralAlignment > 70
			? "Virtuous"
			: moralAlignment > 40
				? "Neutral"
				: "Corrupt";
	const alignmentColor =
		moralAlignment > 70
			? "text-primary"
			: moralAlignment > 40
				? "text-muted-foreground"
				: "text-destructive";

	return (
		<div className="space-y-3 px-3 py-3">
			{/* Name */}
			<div>
				<span className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground/50">
					INVESTIGATOR
				</span>
				<p className="mt-0.5 font-heading text-base tracking-wider text-foreground">
					{playerName || "Unknown"}
				</p>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-2 gap-2">
				<div className="border border-border/40 bg-secondary/30 p-2">
					<span className="block font-mono text-[9px] tracking-[0.15em] text-muted-foreground/50">
						CURRENCY
					</span>
					<span className="mt-0.5 block font-heading text-base tracking-wider text-primary">
						${currency}
					</span>
				</div>
				<div className="border border-border/40 bg-secondary/30 p-2">
					<span className="block font-mono text-[9px] tracking-[0.15em] text-muted-foreground/50">
						ALIGNMENT
					</span>
					<span
						className={cn(
							"mt-0.5 block font-heading text-base tracking-wider",
							alignmentColor,
						)}
					>
						{alignmentLabel}
					</span>
				</div>
			</div>

			{/* Moral Alignment Bar */}
			<div>
				<div className="flex justify-between font-mono text-[10px] text-muted-foreground/40">
					<span>CORRUPT</span>
					<span>{moralAlignment}/100</span>
					<span>VIRTUOUS</span>
				</div>
				<div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
					<motion.div
						className="h-full rounded-full bg-gradient-to-r from-destructive via-muted-foreground to-primary"
						style={{ width: "100%" }}
					/>
					{/* Position indicator */}
					<motion.div
						className="absolute top-0 h-full w-0.5 bg-foreground"
						animate={{ left: `${moralAlignment}%` }}
						transition={{ duration: 0.5 }}
					/>
				</div>
			</div>
		</div>
	);
}

function NPCsSection() {
	const { npcs, activeNPC, switchNPC, currentLocation } = useGameStore();
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const npcList = Object.values(npcs).filter(
		(n) => n.locationId === currentLocation,
	);

	if (npcList.length === 0) {
		return (
			<div className="px-3 py-4 text-center">
				<span className="font-mono text-[11px] text-muted-foreground/40">
					NO ONE OF NOTE HERE
				</span>
			</div>
		);
	}

	return (
		<div className="divide-y divide-border/30">
			{npcList.map((npc) => {
				const isActive = activeNPC?.id === npc.id;
				const isExpanded = expandedId === npc.id;
				const emotionColor =
					EMOTION_COLORS[npc.emotionalState] || "text-muted-foreground";

				return (
					<div key={npc.id} className="px-3 py-2">
						<button
							onClick={() => setExpandedId(isExpanded ? null : npc.id)}
							className="flex w-full items-center justify-between text-left"
						>
							<div className="flex items-center gap-1.5">
								{isActive && (
									<span className="animate-ember h-1.5 w-1.5 rounded-full bg-primary" />
								)}
								<span
									className={cn(
										"font-heading text-sm tracking-wider",
										isActive ? "text-primary" : "text-foreground",
									)}
								>
									{npc.name}
								</span>
							</div>
							<span
								className={cn("font-mono text-[10px] uppercase", emotionColor)}
							>
								{npc.emotionalLabel}
							</span>
						</button>

						{/* Title */}
						{npc.title && (
							<p className="mt-0.5 font-mono text-[10px] text-muted-foreground/50">
								{npc.title}
							</p>
						)}

						{/* Mini trust bar */}
						<MiniTrustBar npc={npc} />

						{/* Expanded detail */}
						<AnimatePresence>
							{isExpanded && (
								<motion.div
									initial={{ height: 0, opacity: 0 }}
									animate={{ height: "auto", opacity: 1 }}
									exit={{ height: 0, opacity: 0 }}
									transition={{ duration: 0.2 }}
									className="overflow-hidden"
								>
									<div className="mt-2 space-y-2 border-t border-border/20 pt-2">
										{npc.description && (
											<p className="text-xs italic leading-relaxed text-foreground/60">
												{npc.description}
											</p>
										)}

										{/* NPC Stats */}
										<div className="flex flex-wrap gap-1.5">
											<span className="border border-border/40 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground/60">
												SUSPICION: {npc.suspicion}%
											</span>
											<span className="border border-border/40 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground/60">
												TRUST: {npc.trust}
											</span>
										</div>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				);
			})}
		</div>
	);
}

function InventorySection() {
	const { inventory, dropObject, currency } = useGameStore();

	return (
		<div className="space-y-2 px-3 py-3">
			{/* Currency Display */}
			<div className="flex items-center justify-between border-b border-border/30 pb-2">
				<span className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground/50">
					PURSE
				</span>
				<span className="font-heading text-base tracking-wider text-primary">
					${currency}
				</span>
			</div>

			{/* Items */}
			{inventory.length === 0 ? (
				<div className="py-3 text-center">
					<span className="font-mono text-[11px] italic text-muted-foreground/40">
						Your pockets are empty.
					</span>
				</div>
			) : (
				<div className="space-y-1.5">
					{inventory.map((item) => (
						<div
							key={item.id}
							className="group flex items-start justify-between border border-border/30 bg-secondary/20 p-2 transition-colors hover:border-border/60"
						>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-1.5">
									<span className="font-heading text-sm tracking-wider text-foreground">
										{item.name}
									</span>
									{item.properties?.value && (
										<span className="font-mono text-[9px] text-primary/60">
											${String(item.properties.value)}
										</span>
									)}
								</div>
								<p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground/60">
									{item.description}
								</p>
							</div>
							<button
								onClick={() => dropObject(item.id)}
								className="ml-2 shrink-0 border border-border/40 px-2 py-1 font-mono text-[9px] tracking-wider text-muted-foreground/50 opacity-0 transition-all hover:border-destructive/40 hover:text-destructive group-hover:opacity-100"
								title="Drop this item"
							>
								DROP
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function JournalSection() {
	const { journalEntries } = useGameStore();

	const recentEntries = [...journalEntries]
		.sort((a, b) => b.timestamp - a.timestamp)
		.slice(0, 8);

	if (recentEntries.length === 0) {
		return (
			<div className="px-3 py-4 text-center">
				<span className="font-mono text-[11px] italic text-muted-foreground/40">
					No entries recorded yet.
				</span>
			</div>
		);
	}

	return (
		<div className="space-y-2 px-3 py-3">
			<span className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground/40">
				RECENT ENTRIES
			</span>
			{recentEntries.map((entry, idx) => (
				<div key={entry.id || idx} className="border-l border-primary/20 pl-2">
					<p className="text-xs leading-relaxed text-foreground/70">
						{entry.content.length > 120
							? `${entry.content.slice(0, 120)}…`
							: entry.content}
					</p>
					<span className="mt-0.5 block font-mono text-[9px] text-muted-foreground/40">
						{new Date(entry.timestamp).toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</span>
				</div>
			))}
		</div>
	);
}

export function GameSidebar() {
	const [activeSection, setActiveSection] =
		useState<SidebarSection>("location");
	const { npcs, inventory, journalEntries, currentLocation, isConnected } =
		useGameStore();
	const [collapsed, setCollapsed] = useState(false);

	const npcCount = Object.values(npcs).filter(
		(n) => n.locationId === currentLocation,
	).length;

	if (collapsed) {
		return (
			<div className="flex h-full w-8 flex-col items-center border-l border-border bg-card/60 pt-2">
				<button
					onClick={() => setCollapsed(false)}
					className="font-mono text-[9px] text-muted-foreground/50 transition-colors hover:text-primary"
					title="Expand sidebar"
				>
					◂
				</button>
				{/* Rotated mini-labels */}
				<div className="mt-4 flex flex-col items-center gap-3">
					<span
						className="h-1.5 w-1.5 rounded-full"
						style={{
							backgroundColor: isConnected
								? "hsl(var(--primary))"
								: "hsl(var(--destructive))",
						}}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full w-[260px] flex-col border-l border-border bg-card/60">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-border px-3 py-1.5">
				<span className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground/40">
					DOSSIER
				</span>
				<div className="flex items-center gap-2">
					<span
						className="h-1.5 w-1.5 rounded-full"
						style={{
							backgroundColor: isConnected
								? "hsl(var(--primary))"
								: "hsl(var(--destructive))",
						}}
						title={isConnected ? "Connected" : "Disconnected"}
					/>
					<button
						onClick={() => setCollapsed(true)}
						className="font-mono text-[9px] text-muted-foreground/40 transition-colors hover:text-primary"
						title="Collapse sidebar"
					>
						▸
					</button>
				</div>
			</div>

			{/* Section Tabs */}
			<div className="border-b border-border">
				<SectionHeader
					label="LOCATION"
					section="location"
					active={activeSection}
					onClick={setActiveSection}
				/>
				<SectionHeader
					label="PLAYER"
					section="player"
					active={activeSection}
					onClick={setActiveSection}
				/>
				<SectionHeader
					label="CHARACTERS"
					section="npcs"
					active={activeSection}
					onClick={setActiveSection}
					badge={npcCount}
				/>
				<SectionHeader
					label="INVENTORY"
					section="inventory"
					active={activeSection}
					onClick={setActiveSection}
					badge={inventory.length}
				/>
				<SectionHeader
					label="JOURNAL"
					section="journal"
					active={activeSection}
					onClick={setActiveSection}
					badge={journalEntries.length}
				/>
			</div>

			{/* Content */}
			<div className="custom-scrollbar flex-1 overflow-y-auto">
				<AnimatePresence mode="wait">
					<motion.div
						key={activeSection}
						initial={{ opacity: 0, y: 4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -4 }}
						transition={{ duration: 0.15 }}
					>
						{activeSection === "location" && <LocationSection />}
						{activeSection === "player" && <PlayerSection />}
						{activeSection === "npcs" && <NPCsSection />}
						{activeSection === "inventory" && <InventorySection />}
						{activeSection === "journal" && <JournalSection />}
					</motion.div>
				</AnimatePresence>
			</div>
		</div>
	);
}
