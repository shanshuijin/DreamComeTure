/* 今栖 NowNest — Service Worker
 *
 * v4 修复（对应"网站打开很原始/裸 HTML"的报告）：
 *  1. 预缓存补上 style.css 与 app.js。v2 的 APP_SHELL 只有 index.html，这两个文件
 *     一次都没被缓存过——页面能开（index.html 来自缓存），但样式和逻辑必须每次现拉；
 *     一旦拉取失败（弱网/断网/资源没上传），就正好是"页面打开了、但完全没有样式"的裸 HTML。
 *  2. 预缓存改为逐个 add 并各自 catch：某个文件 404 不再让整个 install 失败
 *     （不同部署点资源不一定齐全，比如网页版没有本地字体文件）。
 *  3. 永远不再 respondWith(undefined)：旧写法 `return cached || network` 在
 *     cached 为空且 fetch 失败时会返回 undefined，资源静默失败、无任何报错。
 *  4. 静态资源与页面都改成"缓存优先 + 后台更新"：打开速度不变，但内容能自愈，
 *     不会像旧版那样把某个 index.html 永久冻在缓存里（发布新版本记得改 CACHE_NAME）。
 */
const CACHE_NAME = 'now-nest-v4';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './letters.js',
  './manifest.webmanifest',
  './pwa-icon-192.png',
  './pwa-icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async (url) => {
      try {
        await cache.add(new Request(url, { cache: 'reload' }));
      } catch (err) {
        // 单个资源缺失不应让整个 SW 安装失败
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });

    const network = fetch(request).then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    });

    if (cached) {
      // 先给缓存（秒开），后台顺手更新，下次访问就是新的
      event.waitUntil(network.catch(() => {}));
      return cached;
    }

    try {
      return await network;
    } catch (err) {
      // 没有任何可用副本时，明确返回一个失败响应，而不是 undefined
      return new Response('resource unavailable offline', {
        status: 503,
        statusText: 'Offline',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
