import { DialoguePanel } from "@/components/game/DialoguePanel";
import { LocationDisplay } from "@/components/game/LocationDisplay";
import { PlayerInputDock } from "@/components/game/PlayerInputDock";

const Index = () => {
	return (
		<div className="flex h-full">
			{/* Main — Dialogue + Input */}
			<div className="flex flex-1 flex-col">
				<div className="flex flex-1 overflow-hidden">
					<DialoguePanel />
				</div>
				<PlayerInputDock />
			</div>
		</div>
	);
};

export default Index;
