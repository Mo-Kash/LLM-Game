import { useLocation } from "react-router-dom";

const NotFound = () => {
	const location = useLocation();

	return (
		<div className="flex min-h-screen items-center justify-center bg-background">
			<div className="text-center">
				<h1 className="mb-4 font-heading text-4xl text-primary">404</h1>
				<p className="mb-2 font-mono text-xs tracking-wider text-muted-foreground">
					No path found: {location.pathname}
				</p>
				<p className="mb-6 text-sm text-foreground/60">
					The trail goes cold here. Turn back.
				</p>
				<a
					href="/"
					className="border border-border px-6 py-2 font-mono text-xs tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
				>
					RETURN TO MENU
				</a>
			</div>
		</div>
	);
};

export default NotFound;
