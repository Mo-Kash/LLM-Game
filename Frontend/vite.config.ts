import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	const apiUrl = process.env.VITE_API_URL || "http://localhost:8000";
	const wsUrl = apiUrl.replace(/^http/, "ws");

	return {
		server: {
			host: "::",
			port: 8080,
			hmr: {
				overlay: false,
			},
			proxy: {
				"/api": {
					target: apiUrl,
					changeOrigin: true,
				},
				"/health": {
					target: apiUrl,
					changeOrigin: true,
				},
				"/ws": {
					target: wsUrl,
					ws: true,
				},
			},
		},
		plugins: [react(), mode === "development" && componentTagger()].filter(
			Boolean,
		),
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src"),
			},
		},
	};
});
