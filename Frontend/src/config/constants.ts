/**
 * Global application constants — central repository for all tunables.
 */

export const API_BASE_URL = "/api/game";

export const WS_CONFIG = {
	RECONNECT_MAX_ATTEMPTS: 5,
	HEARTBEAT_INTERVAL_MS: 30000,
	RECONNECT_BASE_DELAY_MS: 1000,
	RECONNECT_MAX_DELAY_MS: 30000,
};

export const GAME_CONSTANTS = {
	INITIAL_MORAL_ALIGNMENT: 50,
};

export const UI_CONSTANTS = {
	ANIMATION_FADE_IN_MS: 600,
	SCROLL_BOTTOM_THRESHOLD: 100,
};
