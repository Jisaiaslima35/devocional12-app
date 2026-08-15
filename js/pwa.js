// Devocional 12 — PWA bootstrap + Push subscription
// Carrega DEPOIS do DOM ready. Fica responsável por:
//   1. Registrar o service worker
//   2. Botão "🔔 Receber avisos" no header (criado dinamicamente)
//   3. Subscribe/unsubscribe no webpush-server
//   4. Listeners de PUSH_CLICK (vindos do SW)
(function () {
  'use strict';

  const WEBPUSH_BASE = 'https://webpush.automacaojs.us';
  const SW_PATH = '/sw.js';
  const BTN_ID = 'pwa-bell-btn';

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
    return out;
  }

  async function getVapidPublic() {
    const r = await fetch(WEBPUSH_BASE + '/vapid-public-key');
    const j = await r.json();
    return j.publicKey;
  }

  function ensureButton() {
    let btn = document.getElementById(BTN_ID);
    if (btn) return btn;
    btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.type = 'button';
    btn.className = 'pwa-bell';
    btn.setAttribute('aria-label', 'Receber avisos do Devocional 12');
    btn.innerHTML = '<span class="pwa-bell-ico">🔔</span><span class="pwa-bell-text">Receber avisos</span>';
    btn.addEventListener('click', onBellClick);

    // injeta no nav-menu (header direito). Se não tiver, injeta antes do player.
    const navMenu = document.querySelector('.nav-list') || document.querySelector('.topbar-inner') || document.body;
    if (navMenu.classList.contains('nav-list')) {
      const li = document.createElement('li');
      li.appendChild(btn);
      btn.classList.add('pwa-bell-nav');
      navMenu.appendChild(li);
    } else if (navMenu.classList.contains('topbar-inner')) {
      navMenu.appendChild(btn);
    } else {
      navMenu.appendChild(btn);
    }
    return btn;
  }

  async function refreshButtonState() {
    const btn = ensureButton();
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      btn.disabled = true;
      btn.title = 'Seu navegador não suporta notificações push';
      btn.classList.add('pwa-bell-unsupported');
      btn.querySelector('.pwa-bell-text').textContent = 'Push indisponível';
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      btn.classList.add('pwa-bell-active');
      btn.querySelector('.pwa-bell-text').textContent = 'Avisos ligados';
      btn.setAttribute('aria-label', 'Desativar avisos do Devocional 12');
      btn.title = 'Toque para parar de receber avisos';
    } else {
      btn.classList.remove('pwa-bell-active');
      btn.querySelector('.pwa-bell-text').textContent = 'Receber avisos';
      btn.setAttribute('aria-label', 'Receber avisos do Devocional 12');
      btn.title = 'Toque para receber avisos';
    }
  }

  async function onBellClick() {
    const btn = document.getElementById(BTN_ID);
    if (btn.disabled) return;
    try {
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          btn.title = 'Permissão negada — habilite nas configurações do navegador';
          return;
        }
      } else if (Notification.permission === 'denied') {
        alert('Você bloqueou as notificações. Habilite nas configurações do navegador.');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
        await fetch(WEBPUSH_BASE + '/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
      } else {
        const vapid = await getVapidPublic();
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid),
        });
        const resp = await fetch(WEBPUSH_BASE + '/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub),
        });
        if (!resp.ok) throw new Error('Falha ao registrar no servidor: ' + resp.status);
      }
      await refreshButtonState();
    } catch (err) {
      console.error('[PWA]', err);
      btn.title = 'Erro: ' + (err.message || err);
    }
  }

  async function init() {
    if (!('serviceWorker' in navigator)) return;
    try {
      await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PUSH_CLICK') {
          const el = document.getElementById('chat-input');
          if (el) el.focus({ preventScroll: false });
        }
      });
      await refreshButtonState();
    } catch (err) {
      console.warn('[PWA] SW registration falhou:', err.message);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();