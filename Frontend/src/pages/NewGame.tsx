import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSessionStore } from "@/stores/sessionStore";
import { useGameStore } from "@/stores/gameStore";
import { cn } from "@/lib/utils";

const CHARACTER_BACKGROUNDS = [
	{
		id: "constable",
		label: "Former Constable",
		desc: "You once upheld the law. Now you question it.",
	},
	{
		id: "merchant",
		label: "Disgraced Merchant",
		desc: "Coin was your currency. Now it's secrets.",
	},
	{
		id: "scholar",
		label: "Wandering Scholar",
		desc: "Knowledge drew you here. Curiosity may be your undoing.",
	},
	{
		id: "thief",
		label: "Reformed Thief",
		desc: "Old habits linger like smoke in this place.",
	},
];

export default function NewGame() {
	const navigate = useNavigate();
	const { setActiveSession } = useSessionStore();
	const { createSession } = useGameStore();
	const [name, setName] = useState("");
	const [background, setBackground] = useState("constable");
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleStart = async () => {
		setIsCreating(true);
		setError(null);

		try {
			// Create a real backend session
			await createSession();

			// Update session store with metadata
			setActiveSession({
				id: useGameStore.getState().sessionId || `session-${Date.now()}`,
				createdAt: Date.now(),
				worldSeed: `${background}-${Date.now().toString(36)}`,
				background:
					CHARACTER_BACKGROUNDS.find((b) => b.id === background)?.label ??
					background,
				moralAlignment: 50,
			});

			navigate("/game");
		} catch (err) {
			console.error("Failed to create game session:", err);
			setError(
				err instanceof Error
					? err.message
					: "Failed to connect to game server. Is the backend running?",
			);
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<div className="flex h-screen w-screen items-center justify-center bg-background">
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.5 }}
				className="w-full space-y-8 p-8"
			>
				<div className="text-center">
					<h2 className="font-heading text-xl tracking-[0.15em] text-primary">
						NEW INVESTIGATION
					</h2>
					<p className="mt-2 font-mono text-[10px] tracking-wider text-muted-foreground">
						DEFINE YOUR IDENTITY
					</p>
				</div>

				{/* Error message */}
				{error && (
					<div className="border border-destructive/30 bg-destructive/5 px-4 py-3 text-center">
						<p className="font-mono text-xs text-destructive">{error}</p>
					</div>
				)}

				{/* Character Name */}
				<div className="space-y-2">
					<label className="font-mono text-[10px] tracking-widest text-muted-foreground">
						NAME
					</label>
					<input
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Enter your name..."
						disabled={isCreating}
						className="w-full border border-border bg-secondary px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none disabled:opacity-50"
					/>
				</div>

				{/* Background */}
				<div className="space-y-3">
					<label className="font-mono text-[10px] tracking-widest text-muted-foreground">
						BACKGROUND
					</label>
					<div className="grid grid-cols-2 gap-2">
						{CHARACTER_BACKGROUNDS.map((bg) => (
							<button
								key={bg.id}
								onClick={() => setBackground(bg.id)}
								disabled={isCreating}
								className={cn(
									"border p-3 text-left transition-all duration-300",
									background === bg.id
										? "border-primary/50 bg-secondary"
										: "border-border hover:border-border hover:bg-secondary/50",
								)}
							>
								<span className="block font-heading text-xs tracking-wider text-foreground">
									{bg.label}
								</span>
								<span className="mt-1 block text-[10px] text-muted-foreground">
									{bg.desc}
								</span>
							</button>
						))}
					</div>
				</div>

				{/* Actions */}
				<div className="flex gap-3 pt-4">
					<button
						onClick={() => navigate("/")}
						disabled={isCreating}
						className="flex-1 border border-border px-4 py-3 font-mono text-xs tracking-wider text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
					>
						BACK
					</button>
					<button
						onClick={handleStart}
						disabled={isCreating}
						className="flex-1 border border-primary/50 bg-secondary px-4 py-3 font-heading text-xs tracking-[0.15em] text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
					>
						{isCreating ? (
							<motion.span
								animate={{ opacity: [1, 0.4, 1] }}
								transition={{
									duration: 1.5,
									repeat: Infinity,
								}}
							>
								CONNECTING...
							</motion.span>
						) : (
							"BEGIN"
						)}
					</button>
				</div>
			</motion.div>
		</div>
	);
}
