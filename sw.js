// sw.js — deixa o English Smart instalável e abrindo mesmo com internet fraca.
// Estratégia "rede primeiro": sempre busca a versão nova; usa a cópia guardada só se estiver sem internet.
// Assim, toda atualização que você sobe no GitHub chega aos alunos na próxima visita.
const CACHE = 'english-smart-v2';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // só arquivos do próprio site (o banco, o Mercado Pago e as fontes passam direto)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    // a página em si é sempre conferida no servidor (ignora o cache de 10 min do GitHub Pages)
    fetch(req.mode === 'navigate' ? new Request(req, { cache: 'no-cache' }) : req).then((resp) => {
      if (resp.ok) { const copia = resp.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
      return resp;
    }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
  );
});

// ---------- Notificações (lembrete diário às 10h) ----------
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'English Smart', {
    body: d.body || 'Hora de praticar seu inglês! Sua lição de hoje está esperando.',
    icon: 'img/app-192.png',
    badge: 'img/notif-badge.png',
    tag: d.tag || 'lembrete-diario',
    renotify: true,
    lang: 'pt-BR',
    data: { url: d.url || './#/curso' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const alvo = new URL(e.notification.data?.url || './#/curso', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abas) => {
    const aba = abas.find((c) => c.url.startsWith(self.registration.scope));
    if (aba) return aba.focus().then((c) => (c && c.navigate ? c.navigate(alvo).catch(() => c) : c));
    return self.clients.openWindow(alvo);
  }));
});
