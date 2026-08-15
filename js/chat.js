// chat.js — Socket.IO nativo para Devocional 12
// Estilo Mega Crystal: chat funcional, sem iframe
// Compativel com backend Bug D patch (06/08/2026): emite 'join-chat', escuta 'init-messages'
(function() {
  'use strict';
  if (window.__CHAT_LOADED__) return;
  window.__CHAT_LOADED__ = true;

  const messagesEl = document.getElementById('chat-messages');
  const inputEl = document.getElementById('chat-input');
  const sendBtn = document.getElementById('btn-send');
  const onlineCountEl = document.getElementById('online-count');
  if (!messagesEl || !inputEl) return;

  const socket = io({ transports: ['websocket', 'polling'] });
  window.__CHAT_SOCKET__ = socket;

  const username = 'Web-Ouvinte-' + Math.floor(Math.random() * 9999);
  window.__CHAT_CURRENT_USERNAME__ = username;

  socket.on('connect', () => {
    console.log('[chat-devocional12] conectado', socket.id);
    // Backend Devocional 12 aceita &#39;join&#39; E &#39;join-chat&#39; (Bug D patch)
    socket.emit('join-chat', username);
  });

  // Backend emite 'history' (compat) E 'init-messages' (Vite bundle original)
  const handleHistory = (msgs) => {
    messagesEl.innerHTML = '';
    (msgs || []).forEach(m => addMessage(m, false));
    scrollDown();
  };
  socket.on('history', handleHistory);
  socket.on('init-messages', handleHistory);

  socket.on('chat-message', (msg) => {
    addMessage(msg, true);
    scrollDown();
  });

  socket.on('chat-update', (msg) => {
    const el = document.querySelector(`[data-msg-id="${msg.id}"]`);
    if (el) {
      const textEl = el.querySelector('.msg-text');
      if (textEl) textEl.innerHTML = formatText(msg.text) + (msg.audioUrl ? ` <a href="${msg.audioUrl}" target="_blank" class="audio-link">🎵 ouvir</a>` : '');
    }
  });

  socket.on('online-count', (n) => {
    if (onlineCountEl) onlineCountEl.textContent = n;
  });

  function send() {
    const text = inputEl.value.trim();
    if (!text) return;
    socket.emit('send-message', { text, user: username });
    inputEl.value = '';
  }

  sendBtn?.addEventListener('click', send);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  function addMessage(msg, animate) {
    const div = document.createElement('div');
    div.className = 'msg' + (msg.isHermes ? ' msg-hermes' : ' msg-user') + (animate ? ' msg-enter' : '');
    div.setAttribute('data-msg-id', msg.id);

    const time = new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    div.innerHTML = `
      <div class="msg-avatar">${msg.isHermes ? '🎙️' : '👤'}</div>
      <div class="msg-body">
        <div class="msg-meta">
          <strong>${escapeHtml(msg.user || 'Anônimo')}</strong>
          <span class="msg-time">${time}</span>
        </div>
        <div class="msg-text">${formatText(msg.text)}${msg.audioUrl ? ` <a href="${msg.audioUrl}" target="_blank" class="audio-link">🎵 ouvir</a>` : ''}</div>
      </div>
    `;
    messagesEl.appendChild(div);
  }

  function scrollDown() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formatText(s) {
    return escapeHtml(s).replace(/\n/g, '<br>');
  }

  document.querySelectorAll('.ask-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const song = btn.getAttribute('data-song');
      if (inputEl) {
        inputEl.value = 'Toca ' + song;
        inputEl.focus();
        document.getElementById('chat-ao-vivo')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
})();