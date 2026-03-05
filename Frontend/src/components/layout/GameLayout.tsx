import { useEffect } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { GameNavigation } from "./GameNavigation";
import { useGameStore } from "@/stores/gameStore";

export function GameLayout() {
	const { sessionId } = useGameStore();

	if (!sessionId) {
		return <Navigate to="/" replace />;
	}

	return (
		<div className="h-screen w-screen overflow-hidden bg-background">
			<GameNavigation />
			<main className="h-[calc(100vh-40px)]">
				<Outlet />
			</main>
		</div>
	);
}
