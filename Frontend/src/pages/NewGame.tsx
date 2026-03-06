import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSessionStore } from "@/stores/sessionStore";
import { useGameStore } from "@/stores/gameStore";
import { cn } from "@/lib/utils";

export default function NewGame() {
	const navigate = useNavigate();
	const { setActiveSession } = useSessionStore();
	const { createSession, metadata } = useGameStore();
	const [name, setName] = useState("");
	const [gender, setGender] = useState("");
	const [age, setAge] = useState<string>("25");
	const [occupation, setOccupation] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const activeGenders = metadata?.character_options?.genders || [];
	const activeOccupations = metadata?.character_options?.occupations || [];

	const isLoadingMetadata = !metadata;

	const isFormValid =
		name.trim() !== "" &&
		gender !== "" &&
		parseInt(age) >= 18 &&
		occupation !== "";

	const handleStart = async () => {
		if (!isFormValid) {
			setError("Please fill out all fields correctly (Age must be 18+).");
			return;
		}

		setIsCreating(true);
		setError(null);

		try {
			await createSession({
				name,
				gender,
				age: parseInt(age),
				occupation,
			});

			const sessionId = useGameStore.getState().sessionId;
			setActiveSession({
				id: sessionId || `session-${Date.now()}`,
				createdAt: Date.now(),
				worldSeed: `seed-${Date.now().toString(36)}`,
				background: occupation,
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

	if (isLoadingMetadata) {
		return (
			<div className="flex h-screen w-screen items-center justify-center bg-background">
				<div className="flex flex-col items-center gap-4 text-center">
					<div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
					<p className="font-mono text-xs tracking-widest text-primary">
						RETRIVEING METADATA...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="h-screen w-screen overflow-y-auto bg-background">
			<div className="flex min-h-full w-full items-center justify-center p-4 py-12">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					className="panel-shadow w-full max-w-2xl space-y-10 rounded-lg border border-border bg-card/30 p-10 backdrop-blur-sm"
				>
					<div className="space-y-2 text-center">
						<h2 className="font-heading text-3xl tracking-[0.2em] text-primary">
							NEW INVESTIGATION
						</h2>
						<div className="mx-auto h-px w-24 bg-primary/30" />
						<p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground opacity-70">
							Establish your dossier
						</p>
					</div>

					{/* Error message */}
					{error && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							className="border border-destructive/30 bg-destructive/10 px-4 py-3 text-center"
						>
							<p className="font-mono text-xs text-destructive">{error}</p>
						</motion.div>
					)}

					<div className="space-y-8">
						{/* Name and Age */}
						<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
							<div className="space-y-3 md:col-span-2">
								<label className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/70">
									CODΞNAMΞ / NAMΞ
								</label>
								<input
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Enter your name..."
									disabled={isCreating}
									className="w-full border-b border-border bg-transparent px-0 py-3 font-body text-lg text-foreground transition-all focus:border-primary focus:outline-none"
								/>
							</div>
							<div className="space-y-3">
								<label className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/70">
									AGΞ (MIN. 18)
								</label>
								<input
									type="number"
									min="18"
									value={age}
									onChange={(e) => setAge(e.target.value)}
									disabled={isCreating}
									className="w-full border-b border-border bg-transparent px-0 py-3 font-body text-lg text-foreground transition-all focus:border-primary focus:outline-none"
								/>
							</div>
						</div>

						{/* Gender */}
						<div className="space-y-4">
							<label className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/70">
								GΞNDΞR IDΞNTITY
							</label>
							<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
								{activeGenders.map((opt) => (
									<button
										key={opt}
										onClick={() => setGender(opt)}
										disabled={isCreating}
										className={cn(
											"border px-3 py-4 font-mono text-[10px] tracking-widest transition-all",
											gender === opt
												? "border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(182,141,64,0.15)]"
												: "border-border text-muted-foreground hover:border-primary/40",
										)}
									>
										{opt.toUpperCase()}
									</button>
								))}
							</div>
						</div>

						{/* Occupation */}
						<div className="space-y-4">
							<label className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/70">
								PROFΞSSIONAL BACKGROUND
							</label>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								{activeOccupations.map((opt) => (
									<button
										key={opt.id}
										onClick={() => setOccupation(opt.name)}
										disabled={isCreating}
										className={cn(
											"flex flex-col space-y-2 border p-5 text-left transition-all",
											occupation === opt.name
												? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(182,141,64,0.1)]"
												: "border-border hover:border-primary/30",
										)}
									>
										<span
											className={cn(
												"font-heading text-sm tracking-widest",
												occupation === opt.name
													? "text-primary"
													: "text-foreground",
											)}
										>
											{opt.name.toUpperCase()}
										</span>
										<span className="font-body text-[11px] leading-relaxed text-muted-foreground">
											{opt.desc}
										</span>
									</button>
								))}
							</div>
						</div>
					</div>

					{/* Actions */}
					<div className="flex flex-col gap-4 pt-6 sm:flex-row">
						<button
							onClick={() => navigate("/")}
							disabled={isCreating}
							className="flex-1 border border-border px-6 py-4 font-mono text-[10px] tracking-[0.2em] text-muted-foreground transition-all hover:bg-muted/10 hover:text-foreground"
						>
							ABORT
						</button>
						<button
							onClick={handleStart}
							disabled={isCreating || !isFormValid}
							className={cn(
								"flex-[2] border px-6 py-4 font-heading text-xs tracking-[0.25em] transition-all",
								isFormValid
									? "border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(182,141,64,0.2)] hover:bg-primary/20"
									: "cursor-not-allowed border-border text-muted-foreground opacity-30",
							)}
						>
							{isCreating ? "INITIALIZING Dossier..." : "INITIALIZΞ SYSTΞM"}
						</button>
					</div>
				</motion.div>
			</div>
		</div>
	);
}
