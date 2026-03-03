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
import CharacterPage from "./pages/Character";
import NpcsPage from "./pages/Npcs";
import JournalPage from "./pages/Journal";
import SessionPage from "./pages/Session";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
	<QueryClientProvider client={queryClient}>
		<TooltipProvider>
			<Toaster />
			<Sonner />
			<BrowserRouter>
				<PauseMenu />
				<Routes>
					<Route path="/" element={<MainMenu />} />
					<Route path="/new-game" element={<NewGame />} />
					<Route element={<GameLayout />}>
						<Route path="/game" element={<GamePage />} />
						<Route path="/world" element={<WorldPage />} />
						<Route path="/character" element={<CharacterPage />} />
						<Route path="/npcs" element={<NpcsPage />} />
						<Route path="/journal" element={<JournalPage />} />
						<Route path="/session" element={<SessionPage />} />
					</Route>
					<Route path="*" element={<NotFound />} />
				</Routes>
			</BrowserRouter>
		</TooltipProvider>
	</QueryClientProvider>
);

export default App;
