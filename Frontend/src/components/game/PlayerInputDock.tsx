import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { cn } from "@/lib/utils";

export function PlayerInputDock() {
	const [input, setInput] = useState("");
	const [commandHistory, setCommandHistory] = useState<string[]>([]);
	const [historyIndex, setHistoryIndex] = useState(-1);
	const [targetNpcId, setTargetNpcId] = useState<string | null>(null);
	const { isProcessing, sendAction, sessionId, npcs, currentLocation } =
		useGameStore();
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const presentNpcs = Object.values(npcs).filter(
		(npc) => npc.id !== "narrator",
	);

	const handleSend = useCallback(() => {
		const curInput = input.trim();
		if (!curInput || isProcessing) return;

		setCommandHistory((prev) => [curInput, ...prev.slice(0, 49)]);
		setHistoryIndex(-1);
		setInput("");

		// Map addressing target to backend npc_id
		let npcIdForAction: string | undefined;
		if (targetNpcId === null) {
			// General / Nearby — let the backend decide (use active NPC)
			npcIdForAction = undefined;
		} else if (targetNpcId === "__self__") {
			// Self — no NPC target
			npcIdForAction = undefined;
		} else if (targetNpcId === "narrator") {
			npcIdForAction = "narrator";
		} else {
			npcIdForAction = targetNpcId;
		}

		sendAction(curInput, npcIdForAction);
	}, [isProcessing, sendAction, targetNpcId, input]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
		if (e.key === "ArrowUp" && commandHistory.length > 0) {
			e.preventDefault();
			const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
			setHistoryIndex(newIndex);
			setInput(commandHistory[newIndex]);
		}
		if (e.key === "ArrowDown") {
			e.preventDefault();
			if (historyIndex <= 0) {
				setHistoryIndex(-1);
				setInput("");
			} else {
				const newIndex = historyIndex - 1;
				setHistoryIndex(newIndex);
				setInput(commandHistory[newIndex]);
			}
		}
	};

	const isCommand = input.startsWith("/");
	const isDisabled = !sessionId;

	// Addressing options: Self, Narrator, General, + specific NPCs
	const addressingOptions: { id: string | null; label: string }[] = [
		{ id: null, label: "GENERAL / NEARBY" },
		{ id: "__self__", label: "SELF" },
		{ id: "narrator", label: "NARRATOR" },
		...presentNpcs.map((npc) => ({
			id: npc.id,
			label: npc.name.toUpperCase(),
		})),
	];

	return (
		<div className="border-t border-border bg-card px-4 py-3 pb-6">
			{/* Addressing Selector */}
			{!isCommand && !isDisabled && (
				<div className="mb-3 flex flex-wrap gap-2">
					<span className="mr-1 self-center font-mono text-[9px] tracking-widest text-muted-foreground">
						ADDRESSING:
					</span>
					{addressingOptions.map((opt) => (
						<button
							key={opt.id ?? "__general__"}
							onClick={() => setTargetNpcId(opt.id)}
							className={cn(
								"border px-2 py-0.5 font-mono text-[9px] tracking-wider transition-all",
								targetNpcId === opt.id
									? "border-primary bg-primary/10 text-primary"
									: "border-border text-muted-foreground opacity-60 hover:opacity-100",
							)}
						>
							{opt.label}
						</button>
					))}
				</div>
			)}

			<div className="flex items-end gap-2">
				<textarea
					ref={textareaRef}
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={
						isDisabled
							? "Start a new game to begin..."
							: isCommand
								? "/command..."
								: "Say something..."
					}
					disabled={isDisabled}
					rows={1}
					className={cn(
						"flex-1 resize-none border bg-secondary px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground/40 focus:outline-none disabled:opacity-40",
						isCommand
							? "border-accent/40 font-mono text-xs focus:border-accent/60"
							: "border-border focus:border-primary/30",
					)}
				/>
				<button
					onClick={handleSend}
					disabled={!input.trim() || isProcessing || isDisabled}
					className="shrink-0 border border-primary/30 px-4 py-2 font-mono text-xs tracking-wider text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-30"
				>
					{isProcessing ? (
						<motion.span className="inline-block text-primary">···</motion.span>
					) : (
						"SEND"
					)}
				</button>
			</div>
		</div>
	);
}
