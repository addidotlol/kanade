const defaultState = {
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
export function createKanade(options) {
    const baseUrl = options?.url ?? "http://localhost:24124";
    const reconnectMs = options?.reconnectInterval ?? 5000;
    let state = $state({ ...defaultState });
    let connected = $state(false);
    let eventSource = null;
    let reconnectTimer = null;
    function handleEvent(event) {
        try {
            const data = JSON.parse(event.data);
            state = data;
        }
        catch {
            // Ignore malformed events
        }
    }
    function scheduleReconnect() {
        if (reconnectTimer)
            return;
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
        }, reconnectMs);
    }
    function connect() {
        disconnect();
        eventSource = new EventSource(`${baseUrl}/sse`);
        eventSource.addEventListener("state", handleEvent);
        eventSource.addEventListener("trackChange", handleEvent);
        eventSource.addEventListener("playbackState", handleEvent);
        eventSource.onopen = () => {
            connected = true;
        };
        eventSource.onerror = () => {
            connected = false;
            eventSource?.close();
            eventSource = null;
            scheduleReconnect();
        };
    }
    function disconnect() {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
        connected = false;
    }
    async function fetch() {
        const res = await globalThis.fetch(baseUrl);
        const data = await res.json();
        state = data;
        return data;
    }
    if (options?.autoConnect !== false) {
        connect();
    }
    return {
        get state() {
            return state;
        },
        get connected() {
            return connected;
        },
        connect,
        disconnect,
        fetch,
    };
}
