import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameLayout } from "./components/layout/GameLayout";
import { PauseMenu } from "./components/game/PauseMenu";
import MainMenu from "./pages/MainMenu";
import NewGame from "./pages/NewGame";
import GamePage from "./pages/Index";
import WorldPage from "./pages/World";
import NpcsPage from "./pages/Npcs";
import JournalPage from "./pages/Journal";
import SessionPage from "./pages/Session";

import NotFound from "./pages/NotFound";
import { useEffect, useState, useCallback } from "react";
import { useGameStore } from "@/stores/gameStore";
import { apiClient } from "@/services/api";
import { motion } from "framer-motion";

const queryClient = new QueryClient();

function BootGate({ children }: { children: React.ReactNode }) {
	const [ready, setReady] = useState(false);
	const [dots, setDots] = useState("");

	const poll = useCallback(async () => {
		try {
			const isReady = await apiClient.pollReady();
			if (isReady) {
				setReady(true);
				return;
			}
		} catch {
			// backend not up yet
		}
		setTimeout(poll, 1000);
	}, []);

	useEffect(() => {
		poll();
	}, [poll]);

	// Animated dots
	useEffect(() => {
		if (ready) return;
		const interval = setInterval(() => {
			setDots((d) => (d.length >= 3 ? "" : d + "."));
		}, 500);
		return () => clearInterval(interval);
	}, [ready]);

	if (!ready) {
		return (
			<div className="flex h-screen w-screen flex-col items-center justify-center bg-background">
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.6 }}
					className="flex flex-col items-center gap-6"
				>
					<h1 className="font-heading text-2xl tracking-[0.3em] text-primary/80">
						THE OBSIDIAN FLASK
					</h1>
					<div className="h-px w-32 bg-border" />
					<p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground/60">
						AWAKENING ENGINE{dots}
					</p>
					<div className="mt-2 h-0.5 w-20 overflow-hidden rounded-full bg-secondary">
						<motion.div
							className="h-full bg-primary/40"
							animate={{ x: ["-100%", "200%"] }}
							transition={{
								repeat: Infinity,
								duration: 1.5,
								ease: "easeInOut",
							}}
							style={{ width: "40%" }}
						/>
					</div>
				</motion.div>
			</div>
		);
	}

	return <>{children}</>;
}

const App = () => {
	const fetchMetadata = useGameStore((state) => state.fetchMetadata);

	useEffect(() => {
		fetchMetadata();
	}, [fetchMetadata]);

	return (
		<QueryClientProvider client={queryClient}>
			<TooltipProvider>
				<Toaster />
				<Sonner />
				<BootGate>
					<BrowserRouter>
						<PauseMenu />
						<Routes>
							<Route path="/" element={<MainMenu />} />
							<Route path="/new-game" element={<NewGame />} />
							<Route element={<GameLayout />}>
								<Route path="/game" element={<GamePage />} />
								<Route path="/world" element={<WorldPage />} />
								<Route path="/npcs" element={<NpcsPage />} />
								<Route path="/journal" element={<JournalPage />} />
								<Route path="/session" element={<SessionPage />} />
							</Route>
							<Route path="*" element={<NotFound />} />
						</Routes>
					</BrowserRouter>
				</BootGate>
			</TooltipProvider>
		</QueryClientProvider>
	);
};

export default App;
