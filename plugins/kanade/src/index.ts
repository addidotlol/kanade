import { ReactiveStore, Tracer, type LunaUnload } from "@luna/core";
import { ContentBase, MediaItem, PlayState, safeInterval } from "@luna/lib";

import { startServer, stopServer, updateState } from "./index.native";

export const { trace } = Tracer("[Kanade]");
export const unloads = new Set<LunaUnload>();

export const storage = await ReactiveStore.getPluginStorage("kanade", {
	port: 24124,
	enabled: true,
});

export { Settings } from "./Settings";

interface NowPlayingState {
	playing: boolean;
	title: string;
	artist: string;
	artists: string[];
	album: string;
	coverUrl: string;
	duration: number;
	currentTime: number;
	quality: string;
	trackId: number | null;
	url: string;
}

let currentMediaItem: MediaItem | undefined;

async function buildState(): Promise<NowPlayingState> {
	const state: NowPlayingState = {
		playing: PlayState.playing,
		title: "",
		artist: "",
		artists: [],
		album: "",
		coverUrl: "",
		duration: 0,
		currentTime: PlayState.currentTime,
		quality: "",
		trackId: null,
		url: "",
	};

	if (!currentMediaItem) return state;

	const [title, artist, artistNames, album, coverUrl] = await Promise.all([
		currentMediaItem.title(),
		currentMediaItem.artist(),
		ContentBase.artistNames(currentMediaItem.artists()),
		currentMediaItem.album(),
		currentMediaItem.coverUrl({ res: "1280" }),
	]);

	state.title = title ?? "";
	state.artist = artist?.name ?? "";
	state.artists = artistNames;
	state.album = await album?.title() ?? "";
	state.coverUrl = coverUrl ?? "";
	state.duration = currentMediaItem.duration ?? 0;
	state.quality = currentMediaItem.bestQuality?.name ?? "";
	state.trackId = currentMediaItem.id ?? null;
	state.url = currentMediaItem.url ?? "";

	return state;
}

async function pushState() {
	try {
		const state = await buildState();
		updateState(state);
	} catch (err) {
		trace.err.log("Failed to push state:", err);
	}
}

// Track changes
MediaItem.onMediaTransition(unloads, async (mediaItem) => {
	currentMediaItem = mediaItem;
	await pushState();
});

// Playback state changes (play/pause)
PlayState.onState(unloads, async () => {
	await pushState();
});

// Initialize from current playback context
try {
	const mediaItem = await MediaItem.fromPlaybackContext();
	if (mediaItem) {
		currentMediaItem = mediaItem;
		await pushState();
	}
} catch {
	// No active playback context on load
}

// Start server if enabled
if (storage.enabled) {
	startServer(storage.port);
	trace.msg.log(`Server started on port ${storage.port}`);
}

// Monitor settings changes
let lastPort = storage.port;
let lastEnabled = storage.enabled;
safeInterval(unloads, () => {
	if (storage.port !== lastPort || storage.enabled !== lastEnabled) {
		lastPort = storage.port;
		lastEnabled = storage.enabled;
		if (storage.enabled) {
			startServer(storage.port);
			trace.msg.log(`Server restarted on port ${storage.port}`);
		} else {
			stopServer();
			trace.msg.log("Server stopped");
		}
	}
}, 1000);

// Cleanup on unload
unloads.add(() => stopServer());
