/**
 * Centralized mock data module.
 * ─────────────────────────────
 * ALL seed / placeholder data lives here so it can be swapped
 * with real API responses in a single place.
 *
 * When the backend is ready, replace exports with API call results
 * and leave this file as a fallback / test fixture.
 */

import type {
	DialogueMessage,
	NPC,
	JournalEntry,
	Clue,
	SaveSlot,
	GameSession,
	MockLocation,
} from "@/types/game";

// ── Dialogue seed ──────────────────────────────────────
export const SEED_DIALOGUE: DialogueMessage[] = [
	{
		id: "1",
		type: "narration",
		content:
			"The door groans open. Smoke curls around your boots as you step into the dim warmth of the tavern. The barkeep doesn't look up.",
		timestamp: Date.now() - 60000,
	},
	{
		id: "2",
		type: "narration",
		content:
			"A figure sits alone in the far corner — hood drawn, fingers wrapped around a pewter mug. The candles gutter as the door shuts behind you.",
		timestamp: Date.now() - 45000,
	},
	{
		id: "3",
		type: "npc",
		speaker: "Marlowe Ashwick",
		content:
			"You're late. Sit down. And keep your voice low — the walls have ears in this place.",
		timestamp: Date.now() - 30000,
	},
];

// ── NPC roster (single source of truth) ────────────────
export const SEED_NPCS: NPC[] = [
	{
		id: "marlowe",
		name: "Marlowe Ashwick",
		title: "Disgraced Guild Informant",
		trust: 35,
		maxTrust: 100,
		trustThresholds: [
			{ value: 25, label: "Wary", unlocked: true },
			{ value: 50, label: "Cautious Trust", unlocked: false },
			{ value: 75, label: "Confidant", unlocked: false },
		],
		emotionalState: "guarded",
		hiddenSecrets: 4,
		revealedSecrets: 1,
		allegiances: ["Former Guild", "Tavern Regulars"],
		relationshipTier: "acquaintance",
		suspicion: 20,
	},
	{
		id: "elara",
		name: "Elara Voss",
		title: "Tavern Keeper",
		trust: 15,
		maxTrust: 100,
		trustThresholds: [
			{ value: 20, label: "Tolerant", unlocked: false },
			{ value: 50, label: "Friendly", unlocked: false },
			{ value: 80, label: "Loyal", unlocked: false },
		],
		emotionalState: "neutral",
		hiddenSecrets: 2,
		revealedSecrets: 0,
		allegiances: ["Tavern", "Old Town Quarter"],
		relationshipTier: "stranger",
		suspicion: 10,
	},
	{
		id: "silas",
		name: "Silas Crow",
		title: "Guild Enforcer",
		trust: 5,
		maxTrust: 100,
		trustThresholds: [
			{ value: 30, label: "Tolerated", unlocked: false },
			{ value: 60, label: "Respected", unlocked: false },
			{ value: 90, label: "Feared Ally", unlocked: false },
		],
		emotionalState: "hostile",
		hiddenSecrets: 6,
		revealedSecrets: 0,
		allegiances: ["The Guild", "Unknown Patron"],
		relationshipTier: "stranger",
		suspicion: 65,
	},
	{
		id: "wren",
		name: "Wren Halford",
		title: "Traveling Minstrel",
		trust: 45,
		maxTrust: 100,
		trustThresholds: [
			{ value: 20, label: "Amused", unlocked: true },
			{ value: 50, label: "Companion", unlocked: false },
			{ value: 70, label: "Confidant", unlocked: false },
		],
		emotionalState: "playful",
		hiddenSecrets: 3,
		revealedSecrets: 1,
		allegiances: ["None — Free Spirit"],
		relationshipTier: "acquaintance",
		suspicion: 5,
	},
];

/** The default active NPC (first session contact). */
export const SEED_ACTIVE_NPC: NPC = SEED_NPCS[0];

// ── NPC dossier descriptions (Characters page) ────────
export const NPC_DESCRIPTIONS: Record<string, string> = {
	marlowe:
		"A former Guild informant who turned his back on the organization. He knows more than he lets on, and every word from his mouth is carefully measured. His eyes never rest.",
	elara:
		"The keeper of the tavern. She sees everything but says little. The tavern is her domain, and she guards its secrets as fiercely as her own.",
	silas:
		"A shadow in Guild colors. Silas doesn't speak unless he intends harm, and his silence is heavier than most men's threats. He watches you with predatory patience.",
	wren: "A traveling minstrel whose songs carry more truth than any official report. Wren trades in rumor and melody, and their laughter hides a sharp, observant mind.",
};

// ── Journal entries ────────────────────────────────────
export const SEED_JOURNAL: JournalEntry[] = [
	{
		id: "1",
		timestamp: Date.now() - 120000,
		content:
			"Arrived at the tavern. Contact identified as Marlowe Ashwick — former Guild informant.",
		npcId: "marlowe",
		tags: ["arrival", "marlowe", "guild"],
		category: "case",
	},
	{
		id: "2",
		timestamp: Date.now() - 90000,
		content:
			"The door frame shows signs of forced entry. Someone has been here before me — and recently.",
		tags: ["evidence", "break-in"],
		category: "evidence",
	},
];

// ── Clues ──────────────────────────────────────────────
export const SEED_CLUES: Clue[] = [
	{
		id: "1",
		title: "The Broken Seal",
		description:
			"The letter's Guild seal was broken from the inside, not the outside.",
		linkedClues: [],
		npcId: "marlowe",
		tension: 60,
		discovered: true,
	},
	{
		id: "2",
		title: "Forced Entry",
		description:
			"Fresh scratches on the tavern door frame suggest a recent break-in.",
		linkedClues: ["1"],
		tension: 40,
		discovered: true,
	},
];

// ── Save slots ─────────────────────────────────────────
export const SEED_SAVE_SLOTS: SaveSlot[] = [
	{
		id: "1",
		timestamp: Date.now() - 3600000,
		location: "The Tavern",
		subLocation: "Common Room",
		trustSummary: { marlowe: 35 },
		playtime: 2400,
		label: "Autosave",
	},
];

// ── Active session ─────────────────────────────────────
export const SEED_SESSION: GameSession = {
	id: "session-1",
	createdAt: Date.now() - 7200000,
	worldSeed: "iron-oath-7742",
	background: "Former Constable",
	moralAlignment: 55,
};

// ── Locations (World page) ─────────────────────────────
export const LOCATIONS: MockLocation[] = [
	{
		id: "common-room",
		label: "Common Room",
		connections: ["cellar", "back-alley", "upstairs-room"],
		description:
			"The heart of the tavern. Smoke hangs low over scarred oak tables. The hearth crackles with dying embers, casting long shadows across the stone floor.",
		npcs: ["Marlowe Ashwick", "Elara Voss"],
		tension: "moderate",
	},
	{
		id: "cellar",
		label: "Cellar",
		connections: ["common-room"],
		description:
			"Damp stone arches frame rows of dusty casks. The air is thick with mildew and old secrets. Something scrapes in the dark beyond the last barrel.",
		npcs: [],
		tension: "low",
	},
	{
		id: "back-alley",
		label: "Back Alley",
		connections: ["common-room"],
		description:
			"Narrow and lightless. Puddles reflect nothing. The Guild marks on the wall are fresh — someone has been here recently.",
		npcs: ["Silas Crow"],
		tension: "high",
	},
	{
		id: "upstairs-room",
		label: "Upstairs Room",
		connections: ["common-room"],
		description:
			"A cramped chamber with a single window overlooking the alley. The bed hasn't been slept in, but the desk is covered in half-burned letters.",
		npcs: ["Wren Halford"],
		tension: "low",
	},
];

// ── Location descriptions (for LocationDisplay) ───────
export const LOCATION_DESCRIPTIONS: Record<string, string> = {
	"common-room":
		"Scarred oak tables, guttering candles, the low murmur of careful conversation. The barkeep polishes a glass that will never be clean.",
	cellar:
		"Damp stone arches drip with condensation. Barrels line the walls, and something skitters in the darkness beyond the torchlight.",
	"back-alley":
		"Cobblestones slick with rain. The tavern's back door creaks in the wind. A cat watches from atop the refuse pile.",
	"upstairs-room":
		"Creaking floorboards, a single candle on the nightstand. The window overlooks the alley below — a useful vantage point.",
};

// ── New-game backgrounds ───────────────────────────────
export const CHARACTER_BACKGROUNDS = [
	{
		id: "constable",
		label: "Former Constable",
		desc: "You once upheld the law. Now you question it.",
	},
	{
		id: "merchant",
		label: "Disgraced Merchant",
		desc: "Coin was your currency. Now it's secrets.",
	},
	{
		id: "scholar",
		label: "Wandering Scholar",
		desc: "Knowledge drew you here. Curiosity may be your undoing.",
	},
	{
		id: "thief",
		label: "Reformed Thief",
		desc: "Old habits linger like smoke in this place.",
	},
];

// ── NPC emotion labels ─────────────────────────────────
export const EMOTION_LABELS: Record<string, { label: string; color: string }> =
	{
		neutral: { label: "Composed", color: "text-muted-foreground" },
		suspicious: { label: "Suspicious", color: "text-destructive" },
		fearful: { label: "Fearful", color: "text-accent-foreground" },
		angry: { label: "Hostile", color: "text-destructive" },
		melancholic: { label: "Melancholic", color: "text-muted-foreground" },
		guarded: { label: "Guarded", color: "text-muted-foreground" },
		trusting: { label: "Trusting", color: "text-primary" },
		desperate: { label: "Desperate", color: "text-destructive" },
		hostile: { label: "Hostile", color: "text-destructive" },
		playful: { label: "Playful", color: "text-primary" },
	};

// ── Slash commands (PlayerInputDock) ───────────────────
export const SLASH_COMMANDS: Record<
	string,
	{
		desc: string;
		handler: (
			args: string,
			store: {
				currentLocation: string;
				subLocation: string;
				activeNPC: NPC | null;
			},
		) => string;
	}
> = {
	"/look": {
		desc: "Examine your surroundings",
		handler: (_, store) => {
			const loc = store.subLocation.replace(/-/g, " ");
			return `You survey the ${loc}. Shadows cling to every corner. The air is thick with smoke and unspoken tension.`;
		},
	},
	"/where": {
		desc: "Show current location",
		handler: (_, store) =>
			`You are in: ${store.currentLocation.replace(/-/g, " ")} — ${store.subLocation.replace(/-/g, " ")}`,
	},
	"/npcs": {
		desc: "List known NPCs",
		handler: (_, store) => {
			if (!store.activeNPC) return "No one of note is nearby.";
			return `Present: ${store.activeNPC.name} (Trust: ${store.activeNPC.trust}/${store.activeNPC.maxTrust})`;
		},
	},
	"/npc": {
		desc: "Inspect active NPC",
		handler: (_, store) => {
			const npc = store.activeNPC;
			if (!npc) return "No one is engaged in conversation.";
			return `${npc.name} — ${npc.title ?? "Unknown"}\nTrust: ${npc.trust}/${npc.maxTrust} | Mood: ${npc.emotionalState} | Secrets: ${npc.revealedSecrets}/${npc.revealedSecrets + npc.hiddenSecrets}`;
		},
	},
	"/help": {
		desc: "Show available commands",
		handler: () => {
			return (
				"Commands:\n" +
				Object.entries(SLASH_COMMANDS)
					.map(([cmd, { desc }]) => `  ${cmd} — ${desc}`)
					.join("\n")
			);
		},
	},
};
