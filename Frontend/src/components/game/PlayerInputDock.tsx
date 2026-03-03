import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { cn } from "@/lib/utils";

export function PlayerInputDock() {
	const [input, setInput] = useState("");
	const [commandHistory, setCommandHistory] = useState<string[]>([]);
	const [historyIndex, setHistoryIndex] = useState(-1);
	const { isProcessing, sendAction, sessionId } = useGameStore();
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const handleSend = useCallback(() => {
		if (!input.trim() || isProcessing) return;

		const trimmed = input.trim();
		setCommandHistory((prev) => [trimmed, ...prev.slice(0, 49)]);
		setHistoryIndex(-1);
		setInput("");

		// Send to backend (handles both commands and dialogue)
		sendAction(trimmed);
	}, [input, isProcessing, sendAction]);

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

	return (
		<div className="border-t border-border bg-card px-4 py-3">
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
