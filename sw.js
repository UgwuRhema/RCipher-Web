const CACHE = "rcipher-v2";
const ASSETS = [
	"./",
	"./index.html",
	"./static/style.css",
	"./static/app.js",
	"./manifest.json",
	"./static/icon-192.png",
	"./static/icon-512.png",
	"./static/icon-apple-touch.png",
];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener("fetch", (event) => {
	const request = event.request;
	if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
		return;
	}

	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request)
				.then((response) => {
					const copy = response.clone();
					caches.open(CACHE).then((cache) => cache.put("./index.html", copy));
					return response;
				})
				.catch(() => caches.match("./index.html"))
		);
		return;
	}

	event.respondWith(
		caches.match(request).then((cached) => {
			if (cached) {
				return cached;
			}
			return fetch(request).then((response) => {
				if (response.ok) {
					const copy = response.clone();
					caches.open(CACHE).then((cache) => cache.put(request, copy));
				}
				return response;
			});
		})
	);
});
