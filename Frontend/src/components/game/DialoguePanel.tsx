import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { cn } from "@/lib/utils";
import type { DialogueMessage } from "@/types/game";

function MessageBubble({ msg }: { msg: DialogueMessage }) {
	const styles: Record<string, string> = {
		player: "border-l-2 border-primary/40 pl-3 text-primary",
		npc: "border-l-2 border-accent/50 pl-3 text-foreground",
		narration: "italic text-muted-foreground",
		system: "font-mono text-[11px] text-muted-foreground/70",
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, ease: "easeOut" }}
			className={cn("py-2", styles[msg.type])}
		>
			{msg.speaker && (
				<span
					className={cn(
						"mb-0.5 block font-heading text-xs tracking-wider",
						msg.type === "npc" ? "text-accent-foreground" : "text-primary/80",
					)}
				>
					{msg.speaker}
				</span>
			)}
			<p className="text-sm leading-relaxed">{msg.content}</p>
			{msg.trustChange && (
				<span
					className={cn(
						"mt-1 inline-block font-mono text-[10px]",
						msg.trustChange > 0 ? "text-primary" : "text-destructive",
					)}
				>
					{msg.trustChange > 0 ? "▲" : "▼"} Trust{" "}
					{msg.trustChange > 0 ? "+" : ""}
					{msg.trustChange}
				</span>
			)}
		</motion.div>
	);
}

export function DialoguePanel() {
	const { dialogueHistory } = useGameStore();
	const scrollRef = useRef<HTMLDivElement>(null);

	// Filter out slash commands from the dialogue display
	const visibleMessages = dialogueHistory.filter(
		(msg) => !(msg.type === "player" && msg.content.startsWith("/")),
	);

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [visibleMessages.length]);

	return (
		<div className="flex h-full flex-col">
			<div className="border-b border-border px-4 py-2">
				<h2 className="font-heading text-xs tracking-widest text-muted-foreground">
					DIALOGUE
				</h2>
			</div>
			<div
				ref={scrollRef}
				className="flex-1 space-y-1 overflow-y-auto px-4 py-3"
			>
				<AnimatePresence>
					{visibleMessages.map((msg) => (
						<MessageBubble key={msg.id} msg={msg} />
					))}
				</AnimatePresence>
			</div>
		</div>
	);
}
