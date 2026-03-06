# @addidotlol/kanade-svelte

Svelte 5 client for [Kanade](https://github.com/addidotlol/kanade), a TidaLuna plugin that exposes what you're currently playing on Tidal over HTTP/SSE.

You'll need the Kanade plugin running on the same machine.

## Install

```sh
npm install @addidotlol/kanade-svelte
```

## Quick start

```svelte
<script>
  import { createKanade } from '@addidotlol/kanade-svelte';

  const kanade = createKanade();
</script>

{#if kanade.state.playing}
  <img src={kanade.state.coverUrl} alt={kanade.state.album} />
  <p>{kanade.state.title}</p>
  <p>{kanade.state.artist}</p>
{/if}
```

## API

### `createKanade(options?)`

Connects to the Kanade SSE endpoint and returns reactive state. Connects on creation unless you pass `autoConnect: false`.

```ts
const kanade = createKanade({
  url: 'http://localhost:24124', // default
  autoConnect: true,             // default
  reconnectInterval: 5000,       // ms, default
});
```

`kanade.state` is a reactive `NowPlayingState` that updates as tracks change. `kanade.connected` tells you if the SSE connection is alive.

You also get `connect()`, `disconnect()`, and `fetch()` (a one-shot REST call that also updates `state`).

### `NowPlayingState`

```ts
interface NowPlayingState {
  playing: boolean;
  title: string;
  artist: string;       // primary artist
  artists: string[];    // all artists
  album: string;
  coverUrl: string;     // 1280x1280 album art
  duration: number;     // seconds
  currentTime: number;  // seconds
  quality: string;      // "HiRes", "High", etc.
  trackId: number | null;
  url: string;          // tidal track URL
}
```

## SSE events

The client listens for three event types from the server:

- `state` -- sent immediately when you connect
- `trackChange` -- a new track started
- `playbackState` -- play/pause or progress tick

Every event carries the full state, so you don't need to merge partials.

## Using the HTTP API directly

You don't need this package if you're not using Svelte. The plugin exposes a plain HTTP server:

```sh
curl http://localhost:24124/        # JSON snapshot
curl -N http://localhost:24124/sse  # SSE stream
curl -L http://localhost:24124/cover # redirects to album art
```
