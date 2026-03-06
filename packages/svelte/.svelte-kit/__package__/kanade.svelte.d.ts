export interface NowPlayingState {
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
export interface KanadeOptions {
    url?: string;
    autoConnect?: boolean;
    reconnectInterval?: number;
}
export declare function createKanade(options?: KanadeOptions): {
    readonly state: NowPlayingState;
    readonly connected: boolean;
    connect: () => void;
    disconnect: () => void;
    fetch: () => Promise<NowPlayingState>;
};
