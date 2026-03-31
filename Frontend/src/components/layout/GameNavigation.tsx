import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
	{ to: "/game", label: "Tavern" },
	{ to: "/world", label: "World" },
	{ to: "/npcs", label: "NPCs" },
	{ to: "/journal", label: "Journal" },
];

export function GameNavigation() {
	return (
		<nav className="flex h-10 items-center border-b border-border bg-card px-4">
			<div className="flex gap-1">
				{navItems.map((item) => (
					<NavLink
						key={item.to}
						to={item.to}
						className={({ isActive }) =>
							cn(
								"px-3 py-1.5 font-mono text-xs tracking-wide transition-colors duration-300",
								isActive
									? "bg-secondary text-primary"
									: "text-muted-foreground hover:text-foreground",
							)
						}
					>
						{item.label}
					</NavLink>
				))}
			</div>
			<div className="ml-auto flex items-center gap-2">
				<span className="font-mono text-[9px] text-muted-foreground/50">
					ESC = PAUSE
				</span>
			</div>
		</nav>
	);
}
