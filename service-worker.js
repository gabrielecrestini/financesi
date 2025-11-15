const CACHE_NAME = 'cryptotoolkit-v2'; // [MODIFICA] Da v1 a v2
const urlsToCache = [
    'toolkit.html',
    'toolkit-style.css',
    'toolkit-script.js',
    'manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/webfonts/fa-solid-900.woff2',
    // Aggiungi qui le tue icone PWA se le hai già caricate
    // 'assets/images/icon-192.png',
    // 'assets/images/icon-512.png'
];

// 1. Installazione: Apri la nuova cache e aggiungi i file
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache v2 aperta');
                return cache.addAll(urlsToCache);
            })
    );
});

// 2. Fetch: Cerca nella cache prima di andare in rete
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response; // Trovato in cache
                }
                return fetch(event.request); // Non in cache, vai in rete
            }
        )
    );
});

// 3. Attivazione: Pulisce le vecchie cache (la v1)
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME]; // Solo la v2 è sicura
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Se la cache non è 'cryptotoolkit-v2', eliminala
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Eliminazione vecchia cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});