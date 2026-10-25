// 旧サイトの Service Worker（キャッシュ 'sw-v1' を優先して返していた）を片付ける。
// ・自分のキャッシュ 'sw-v1' だけを消す（/odds/ など他の Service Worker のキャッシュには触らない）
// ・登録を解除し、開いているページを読み直させる → 以後はふつうにネットから最新を読む
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    await caches.delete('sw-v1');
    await self.registration.unregister();
    const wins = await self.clients.matchAll({type: 'window'});
    wins.forEach(w => w.navigate(w.url).catch(() => {}));
  })());
});
