import { DialoguePanel } from "@/components/game/DialoguePanel";
import { LocationDisplay } from "@/components/game/LocationDisplay";
import { PlayerInputDock } from "@/components/game/PlayerInputDock";

const Index = () => {
	return (
		<div className="flex h-full">
			{/* Main — Dialogue + Input */}
			<div className="flex flex-1 flex-col">
				<div className="flex flex-1 overflow-hidden">
					<div className="flex flex-1 flex-col">
						<DialoguePanel />
					</div>
					{/* Scene sidebar */}
					<div className="flex w-[300px] flex-col border-l border-border bg-card/30">
						<LocationDisplay />
					</div>
				</div>
				<PlayerInputDock />
			</div>
		</div>
	);
};

export default Index;
