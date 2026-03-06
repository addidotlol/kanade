# kanade

A [Luna / TidaLuna](https://github.com/Inrixia/TidaLuna) plugin that exposes what you're currently playing on Tidal over a local HTTP server with SSE. Built for stream overlays, Discord bots, desktop widgets, or anything else that wants to know what song is playing.

This was built for my [personal stream overlay](https://github.com/addidotlol/hanabi). 

## Install

In TidaLuna, add this plugin store URL:

```
https://github.com/addidotlol/kanade/releases/download/latest/store.json
```

Then enable "kanade" in your plugin list. On first load you'll get a trust dialog for the `http` module -- this is expected, the plugin needs it to run the local server.

## What it does

Once enabled, kanade runs an HTTP server on `localhost:24124` (configurable in settings) that serves your current playback state.

### Endpoints

`GET /` returns JSON:

```json
{
  "playing": true,
  "title": "Resonance",
  "artist": "Home",
  "artists": ["Home"],
  "album": "Odyssey",
  "coverUrl": "https://resources.tidal.com/images/.../1280x1280.jpg",
  "duration": 213,
  "currentTime": 42.5,
  "quality": "HiRes",
  "trackId": 12345678,
  "url": "https://tidal.com/browse/track/12345678"
}
```

`GET /sse` opens a Server-Sent Events stream. You get a `state` event immediately on connect, then `trackChange` or `playbackState` events as things change. Every event carries the full state object above.

`GET /cover` redirects (302) to the current album art URL.

All responses include `Access-Control-Allow-Origin: *`, so you can hit it from a browser.

## Svelte 5 client

If you're building something in Svelte, there's a client package:

```sh
npm install @addidotlol/kanade-svelte
```

```svelte
<script>
  import { createKanade } from '@addidotlol/kanade-svelte';

  const kanade = createKanade();
</script>

{#if kanade.state.playing}
  <img src={kanade.state.coverUrl} alt={kanade.state.album} />
  <p>{kanade.state.title} - {kanade.state.artist}</p>
{/if}
```

See [@addidotlol/kanade-svelte](./packages/svelte) for the full API.

## Development

```sh
pnpm install
pnpm run watch
```

This builds the plugin and serves it on `http://localhost:3000`. Add `http://localhost:3000/store.json` as a dev store in TidaLuna settings to load it.
