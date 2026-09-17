const CACHE_NAME = 'chessx-app-v2';
const OPTIONAL_DOWNLOAD = './ChessX-WebApp.zip';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './brand-knight.png',
  './favicon.png',
  './favicon.svg',
  './chess.min.js',
  './pieces.js',
  './engine.js',
  './stockfish-worker.js',
  './audio/move.wav',
  './audio/error.wav',
  './puzzle-library-example.json',
  './css/00-base.css',
  './css/10-topbar.css',
  './css/11-lesson-header.css',
  './css/12-layout.css',
  './css/13-sidebars.css',
  './css/14-drawing-tools.css',
  './css/15-position-editor.css',
  './css/16-bookmarks.css',
  './css/17-themes.css',
  './css/18-board.css',
  './css/19-puzzle-overlay.css',
  './css/20-move-list.css',
  './css/21-chess-clock.css',
  './css/22-teacher-notes.css',
  './css/23-modal-dead.css',
  './css/24-utils.css',
  './css/25-responsive.css',
  './css/26-right-sidebar.css',
  './css/27-left-sidebar-toggle.css',
  './css/28-position-setup-advanced.css',
  './css/30-puzzle-library.css',
  './css/31-puzzle-editor.css',
  './css/32-puzzle-authoring.css',
  './css/33-puzzle-editor-enhanced.css',
  './css/34-puzzle-inline-setup.css',
  './css/35-puzzle-editor-blue.css',
  './css/36-mode-setup.css',
  './css/37-mode-puzzle.css',
  './css/38-puzzle-editor-ui.css',
  './css/40-home-button.css',
  './css/41-front-page.css',
  './css/45-mode-normal.css',
  './css/46-checkmate.css',
  './css/47-fullscreen.css',
  './css/48-inspect-guard.css',
  './js/00-constants.js',
  './js/01-state.js',
  './js/02-dom.js',
  './js/03-utils.js',
  './js/04-protect.js',
  './js/10-board-render.js',
  './js/11-annotations-render.js',
  './js/12-board-interactions.js',
  './js/13-annotation-tools.js',
  './js/14-tool-selection.js',
  './js/15-position-setup.js',
  './js/16-move-list.js',
  './js/17-fen.js',
  './js/18-themes.js',
  './js/19-layouts.js',
  './js/20-puzzle-library-store.js',
  './js/21-puzzle-uid.js',
  './js/22-puzzle-library-ui.js',
  './js/23-puzzle-crud.js',
  './js/24-puzzle-editor-board.js',
  './js/25-puzzle-authoring.js',
  './js/26-engine.js',
  './js/27-autofit.js',
  './js/28-flip-reset.js',
  './js/29-chess-clock.js',
  './js/30-keyboard.js',
  './js/31-render-all.js',
  './js/32-event-bindings.js',
  './js/33-mode-picker.js',
  './js/35-checkmate.js',
  './js/36-persist.js',
  './js/90-boot.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL)
        // The hosted site also caches the downloadable bundle. The archive
        // intentionally does not contain itself, so this remains optional when
        // the app is opened from an extracted download.
        .then(() => cache.add(OPTIONAL_DOWNLOAD).catch(() => undefined)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (!response || !response.ok) throw new Error('navigation response unavailable');
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy)));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (!response || !response.ok) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      });
    })
  );
});
