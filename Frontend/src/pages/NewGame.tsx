import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSessionStore } from "@/stores/sessionStore";
import { useGameStore } from "@/stores/gameStore";
import { cn } from "@/lib/utils";

export default function NewGame() {
	const navigate = useNavigate();
	const { setActiveSession } = useSessionStore();
	const { createSession } = useGameStore();
	const [name, setName] = useState("");
	const [gender, setGender] = useState("");
	const [age, setAge] = useState<string>("");
	const [occupation, setOccupation] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isFormValid =
		name.trim() !== "" &&
		gender.trim() !== "" &&
		age.trim() !== "" &&
		occupation.trim() !== "";

	const handleStart = async () => {
		if (!isFormValid) {
			setError("Please fill out all fields to continue.");
			return;
		}

		setIsCreating(true);
		setError(null);

		try {
			// Create a real backend session with character metadata
			await createSession({
				name,
				gender,
				age: parseInt(age),
				occupation,
			});

			// Update session store with metadata
			setActiveSession({
				id: useGameStore.getState().sessionId || `session-${Date.now()}`,
				createdAt: Date.now(),
				worldSeed: `seed-${Date.now().toString(36)}`,
				background: occupation, // Using occupation as the primary background descriptor
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
		<div className="flex h-screen w-screen items-center justify-center overflow-y-auto bg-background">
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.5 }}
				className="w-full max-w-lg space-y-6 p-8"
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

				<div className="grid grid-cols-1 gap-6">
					{/* Name */}
					<div className="space-y-2">
						<label className="font-mono text-[10px] tracking-widest text-muted-foreground">
							NAME
						</label>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Your name..."
							disabled={isCreating}
							className="w-full border border-border bg-secondary px-4 py-3 font-body text-sm text-foreground focus:border-primary/40 focus:outline-none"
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						{/* Gender */}
						<div className="space-y-2">
							<label className="font-mono text-[10px] tracking-widest text-muted-foreground">
								GENDER
							</label>
							<input
								type="text"
								value={gender}
								onChange={(e) => setGender(e.target.value)}
								placeholder="e.g. Male, Female, etc."
								disabled={isCreating}
								className="w-full border border-border bg-secondary px-4 py-3 font-body text-sm text-foreground focus:border-primary/40 focus:outline-none"
							/>
						</div>

						{/* Age */}
						<div className="space-y-2">
							<label className="font-mono text-[10px] tracking-widest text-muted-foreground">
								AGE
							</label>
							<input
								type="number"
								value={age}
								onChange={(e) => setAge(e.target.value)}
								placeholder="30"
								disabled={isCreating}
								className="w-full border border-border bg-secondary px-4 py-3 font-body text-sm text-foreground focus:border-primary/40 focus:outline-none"
							/>
						</div>
					</div>

					{/* Occupation */}
					<div className="space-y-2">
						<label className="font-mono text-[10px] tracking-widest text-muted-foreground">
							OCCUPATION
						</label>
						<input
							type="text"
							value={occupation}
							onChange={(e) => setOccupation(e.target.value)}
							placeholder="Your current profession..."
							disabled={isCreating}
							className="w-full border border-border bg-secondary px-4 py-3 font-body text-sm text-foreground focus:border-primary/40 focus:outline-none"
						/>
					</div>
				</div>

				{/* Actions */}
				<div className="flex gap-3 pt-4">
					<button
						onClick={() => navigate("/")}
						disabled={isCreating}
						className="flex-1 border border-border px-4 py-3 font-mono text-xs tracking-wider text-muted-foreground transition-colors hover:text-foreground"
					>
						BACK
					</button>
					<button
						onClick={handleStart}
						disabled={isCreating || !isFormValid}
						className={cn(
							"flex-1 border px-4 py-3 font-heading text-xs tracking-[0.15em] transition-colors",
							isFormValid
								? "border-primary/50 bg-secondary text-primary hover:bg-primary/10"
								: "cursor-not-allowed border-border text-muted-foreground opacity-50",
						)}
					>
						{isCreating ? "INITIALIZING..." : "BEGIN"}
					</button>
				</div>
			</motion.div>
		</div>
	);
}
