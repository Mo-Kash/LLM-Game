import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { GameNavigation } from "./GameNavigation";
import { useGameStore } from "@/stores/gameStore";

export function GameLayout() {
	const { sessionId, disconnect } = useGameStore();

	// Clean up WebSocket on unmount
	useEffect(() => {
		return () => {
			// Don't disconnect session on unmount — let it persist across navigation
		};
	}, []);

	return (
		<div className="h-screen w-screen overflow-hidden bg-background">
			<GameNavigation />
			<main className="h-[calc(100vh-40px)]">
				<Outlet />
			</main>
		</div>
	);
}
