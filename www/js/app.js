// app.js — Mural de Oração, posts e utilitários
(function() {
  'use strict';

  // ---- Mural de Oração
  const oracaoForm = document.getElementById('oracao-form');
  const oracaoCards = document.getElementById('oracao-cards');

  function renderOracoes(list) {
    if (!oracaoCards) return;
    if (!list || list.length === 0) {
      oracaoCards.innerHTML = '<p style="text-align:center;color:#718096;padding:20px">Seja o primeiro a pedir oração! 🙏</p>';
      return;
    }
    oracaoCards.innerHTML = list.map(o => `
      <div class="oracao-card">
        <div class="oracao-card-header">
          <strong>🙏 ${escapeHtml(o.nome)}</strong>
          <small>${formatDate(o.data)}</small>
        </div>
        <p>${escapeHtml(o.pedido)}</p>
        <button class="orar-btn" data-id="${o.id}">🙏 Eu oro (${o.oraram || 0})</button>
      </div>
    `).join('');

    oracaoCards.querySelectorAll('.orar-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        fetch(`/api/oracoes/${id}/orar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }).then(() => loadOracoes()).catch(() => {});
      });
    });
  }

  function loadOracoes() {
    fetch('/api/oracoes').then(r => r.json()).then(renderOracoes).catch(() => {});
  }

  if (oracaoForm) {
    oracaoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nome = document.getElementById('oracao-nome').value.trim();
      const pedido = document.getElementById('oracao-pedido').value.trim();
      if (!nome || !pedido) return;
      fetch('/api/oracoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, pedido })
      }).then(r => r.json()).then(data => {
        if (data.sucesso) {
          oracaoForm.reset();
          loadOracoes();
        }
      });
    });
    loadOracoes();
  }

  // ---- Utilitários
  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function formatDate(d) {
    return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  // ---- Posts (legacy, mantém funcionando)
  const latestPosts = document.getElementById('latestPosts');
  const postGrid = document.getElementById('postGrid');

  if (latestPosts || postGrid) {
    fetch('./data/posts.json')
      .then(r => r.json())
      .then(posts => {
        posts.sort((a, b) => new Date(b.data) - new Date(a.data));
        if (latestPosts) {
          latestPosts.innerHTML = posts.slice(0, 3).map(p => `
            <div class="post-card">
              <img src="${p.imagem}" alt="${escapeHtml(p.titulo)}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1504052433629-a6ef81a54d30?w=400'">
              <div class="post-card-content">
                <span class="meta">${p.categoria} • ${formatDate(p.data)}</span>
                <h3>${escapeHtml(p.titulo)}</h3>
                <p>${escapeHtml(p.resumo).substring(0, 120)}...</p>
              </div>
            </div>
          `).join('');
        }
        if (postGrid) {
          postGrid.innerHTML = posts.map(p => `
            <div class="card">
              <h3>${escapeHtml(p.titulo)}</h3>
              <p class="meta">${formatDate(p.data)}</p>
              <p>${escapeHtml(p.resumo)}</p>
            </div>
          `).join('');
        }
      })
      .catch(err => console.error('posts:', err));
  }
})();