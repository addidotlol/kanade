import http from "node:http";

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

const defaultState: NowPlayingState = {
	playing: false,
	title: "",
	artist: "",
	artists: [],
	album: "",
	coverUrl: "",
	duration: 0,
	currentTime: 0,
	quality: "",
	trackId: null,
	url: "",
};

let currentState: NowPlayingState = { ...defaultState };
let server: http.Server | null = null;
const sseClients = new Set<http.ServerResponse>();
let keepaliveInterval: ReturnType<typeof setInterval> | null = null;
let tickInterval: ReturnType<typeof setInterval> | null = null;

const corsHeaders: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

function sendSSE(res: http.ServerResponse, event: string, data: NowPlayingState) {
	res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function broadcast(event: string, data: NowPlayingState) {
	for (const client of sseClients) {
		sendSSE(client, event, data);
	}
}

function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
	const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

	if (req.method === "OPTIONS") {
		res.writeHead(204, corsHeaders);
		res.end();
		return;
	}

	if (req.method !== "GET") {
		res.writeHead(405, corsHeaders);
		res.end();
		return;
	}

	switch (url.pathname) {
		case "/": {
			const body = JSON.stringify(currentState);
			res.writeHead(200, {
				...corsHeaders,
				"Content-Type": "application/json",
			});
			res.end(body);
			break;
		}

		case "/sse": {
			res.writeHead(200, {
				...corsHeaders,
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			});

			sendSSE(res, "state", currentState);
			sseClients.add(res);

			req.on("close", () => {
				sseClients.delete(res);
			});
			break;
		}

		case "/cover": {
			if (currentState.coverUrl) {
				res.writeHead(302, { ...corsHeaders, Location: currentState.coverUrl });
			} else {
				res.writeHead(404, corsHeaders);
			}
			res.end();
			break;
		}

		default: {
			res.writeHead(404, corsHeaders);
			res.end();
		}
	}
}

export function startServer(port: number) {
	stopServer();

	server = http.createServer(handleRequest);

	server.on("error", (err: NodeJS.ErrnoException) => {
		if (err.code === "EADDRINUSE") {
			console.error(`[Kanade] Port ${port} is already in use`);
		} else {
			console.error(`[Kanade] Server error:`, err);
		}
	});

	server.listen(port, () => {
		console.log(`[Kanade] Server listening on http://localhost:${port}`);
	});

	keepaliveInterval = setInterval(() => {
		for (const client of sseClients) {
			client.write(": keepalive\n\n");
		}
	}, 30_000);

	startTick();
}

function startTick() {
	stopTick();
	tickInterval = setInterval(() => {
		if (!currentState.playing) return;
		currentState = { ...currentState, currentTime: currentState.currentTime + 1 };
		broadcast("playbackState", currentState);
	}, 1000);
}

function stopTick() {
	if (tickInterval) {
		clearInterval(tickInterval);
		tickInterval = null;
	}
}

export function stopServer() {
	stopTick();
	if (keepaliveInterval) {
		clearInterval(keepaliveInterval);
		keepaliveInterval = null;
	}

	for (const client of sseClients) {
		client.end();
	}
	sseClients.clear();

	if (server) {
		server.close();
		server = null;
	}
}

export function updateState(state: NowPlayingState) {
	const prevTrackId = currentState.trackId;
	currentState = state;

	// Restart tick to resync with the renderer's real currentTime
	startTick();

	const event = state.trackId !== prevTrackId ? "trackChange" : "playbackState";
	broadcast(event, currentState);
}
