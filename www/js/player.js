// player.js — Player FULL-WIDTH NO TOPO + Menu hamburger
// Versão 3.0 — IDs diretos (não classes), sem autoplay, classes state-* no topbar.
(function () {
  'use strict';

  var STREAM = '/stream';  // AzuraCast self-hosted (migrado do Zeno.fm 06/08/2026)

  /* =======================================================
     1) MENU HAMBURGER — drawer lateral
     ======================================================= */
  var hamburger = document.getElementById('hamburger');
  var nav = document.getElementById('nav');
  var backdrop = document.getElementById('nav-backdrop');
  var navClose = document.getElementById('nav-close');

  function openNav() {
    if (!nav) return;
    nav.classList.add('open');
    if (hamburger) {
      hamburger.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
    }
    if (backdrop) backdrop.hidden = false;
    document.body.classList.add('nav-locked');
  }
  function closeNav() {
    if (!nav) return;
    nav.classList.remove('open');
    if (hamburger) {
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
    if (backdrop) backdrop.hidden = true;
    document.body.classList.remove('nav-locked');
  }
  if (hamburger) {
    hamburger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (nav && nav.classList.contains('open')) closeNav(); else openNav();
    });
  }
  if (navClose) navClose.addEventListener('click', closeNav);
  if (backdrop) backdrop.addEventListener('click', closeNav);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNav();
  });
  if (nav) {
    nav.addEventListener('click', function (e) {
      var link = e.target.closest ? e.target.closest('.nav-link') : null;
      if (!link) return;
      var action = link.getAttribute('data-action');
      if (action === 'play') {
        e.preventDefault();
        closeNav();
        // unmute + play
        var audio = document.getElementById('lp-audio');
        if (audio) audio.muted = false;
        togglePlay(true);
        return;
      }
      if (action === 'top') {
        e.preventDefault();
        closeNav();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      var href = link.getAttribute('href') || '';
      if (href.charAt(0) === '#' && href.length > 1) {
        var alvo = document.querySelector(href);
        if (alvo) {
          e.preventDefault();
          closeNav();
          var y = alvo.getBoundingClientRect().top + window.pageYOffset - 90;
          window.scrollTo({ top: y, behavior: 'smooth' });
          return;
        }
      }
      closeNav();
    });
  }

  /* =======================================================
     2) PLAYER FULL-WIDTH NO TOPO (topbar)
     ======================================================= */
  var audio = document.getElementById('lp-audio');
  var btnPlay = document.getElementById('lp-play');
  var btnMute = document.getElementById('lp-mute');
  var range = document.getElementById('lp-volume');
  var state = document.getElementById('lp-state');
  var dot = document.getElementById('lp-dot');
  var topbar = document.getElementById('topbar');

  if (!audio || !btnPlay) return;

  // IDs diretos (não classes) — não pega cache de CSS quebrado de extensão
  var icoPlay  = document.getElementById('lp-ico-play');
  var icoPause = document.getElementById('lp-ico-pause');
  var spinner  = document.getElementById('lp-spinner');
  var icoVol   = document.getElementById('lp-ico-vol');
  var icoMute  = document.getElementById('lp-ico-mute');

  // ---- Volume: restaura preferência
  var salvo = parseInt(localStorage.getItem('radio_vol') || '80', 10);
  if (isNaN(salvo) || salvo < 0 || salvo > 100) salvo = 80;
  audio.volume = salvo / 100;
  if (range) {
    range.value = salvo;
    pintarRange(salvo);
  }

  function pintarRange(v) {
    if (!range) return;
    range.style.background =
      'linear-gradient(90deg,#f6ad55 0%,#f6ad55 ' + v + '%,rgba(255,255,255,.25) ' + v + '%,rgba(255,255,255,.25) 100%)';
  }

  function setUI(modo) {
    if (icoPlay) icoPlay.hidden = modo !== 'pause';
    if (icoPause) icoPause.hidden = modo !== 'play';
    if (spinner) spinner.hidden = modo !== 'load';
    // belt-and-suspenders: classe no topbar pra CSS controlar também
    if (topbar) {
      topbar.classList.toggle('state-play', modo === 'play');
      topbar.classList.toggle('state-pause', modo === 'pause');
      topbar.classList.toggle('state-load', modo === 'load');
    }
    if (dot) dot.classList.toggle('off', modo !== 'play');
    if (state) {
      state.textContent =
        modo === 'play' ? 'AO VIVO' :
        modo === 'load' ? 'CONECTANDO' :
        'PAUSADO';
    }
    if (btnPlay) btnPlay.setAttribute('aria-label', modo === 'play' ? 'Pausar rádio' : 'Tocar rádio');
  }

  // Estado interno: evita reconexão em loop durante stalls do buffer
  var userWantsPlay = false;     // intenção do usuário (botão ou menu)
  var reconnectTimer = null;     // único timer, cancelável
  var reconnectAttempts = 0;

  function clearReconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function togglePlay(forcarPlay) {
    if (!audio.paused && !forcarPlay) {
      userWantsPlay = false;
      clearReconnect();
      audio.pause();
      setUI('pause');
      return;
    }
    userWantsPlay = true;
    clearReconnect();
    reconnectAttempts = 0;
    setUI('load');
    // Se o src sumiu ou mudou, restaura
    if (!audio.src || audio.src.indexOf('/stream') === -1) {
      audio.src = STREAM;
    }
    audio.load();
    var p = audio.play();
    if (p && p.catch) {
      p.catch(function () {
        // Autoplay bloqueado OU rede caída → fica em pause e mostra aviso
        userWantsPlay = false;
        setUI('pause');
        if (state) state.textContent = 'TOQUE ▶';
      });
    }
  }

  if (btnPlay) btnPlay.addEventListener('click', function () { togglePlay(false); });

  audio.addEventListener('playing', function () {
    reconnectAttempts = 0;
    clearReconnect();
    if (userWantsPlay) setUI('play');
  });
  audio.addEventListener('pause', function () {
    if (!userWantsPlay) setUI('pause');
    // não troca UI quando usuário quer play mas rede mid-flight pausa brevemente
  });
  audio.addEventListener('waiting', function () {
    // Buffering legítimo — mostra CONECTANDO mas NÃO reconecta
    if (userWantsPlay) setUI('load');
  });
  // >>> FIX DO PICADINHO: NÃO reconectar em 'stalled' nem 'ended' <<<
  // Esses eventos disparam DENTRO de uma transição normal do stream
  // (Zeno CDN faz swap AutoDJ↔relay, browser sinaliza buffer momentâneo).
  // Reconectar aí causa o loop que fatia o áudio em pedaços.
  audio.addEventListener('error', function () {
    if (!userWantsPlay) {
      setUI('pause');
      if (state) state.textContent = 'OFFLINE';
      return;
    }
    // Erro real + usuário quer play → tenta UMA reconexão com backoff
    clearReconnect();
    if (reconnectAttempts >= 5) {
      setUI('pause');
      if (state) state.textContent = 'OFFLINE';
      return;
    }
    reconnectAttempts++;
    var delay = Math.min(15000, 1500 * reconnectAttempts);
    setUI('load');
    reconnectTimer = setTimeout(function () {
      audio.load();
      var p = audio.play();
      if (p && p.catch) p.catch(function () {});
    }, delay);
  });

  // ---- Mudo
  if (btnMute) {
    btnMute.addEventListener('click', function () {
      audio.muted = !audio.muted;
      if (icoVol) icoVol.hidden = audio.muted;
      if (icoMute) icoMute.hidden = !audio.muted;
      btnMute.setAttribute('aria-label', audio.muted ? 'Ativar som' : 'Mudo');
    });
  }

  // ---- Slider de volume
  if (range) {
    range.addEventListener('input', function () {
      var v = parseInt(range.value, 10);
      audio.volume = v / 100;
      pintarRange(v);
      localStorage.setItem('radio_vol', String(v));
      if (v > 0 && audio.muted) {
        audio.muted = false;
        if (icoVol) icoVol.hidden = false;
        if (icoMute) icoMute.hidden = true;
      }
    });
  }

  setUI('pause');

  // Sem autoplay — usuário aperta play quando quiser (decisão do Isaías)

  // Expõe pro menu "AO VIVO"
  window.radioPlay = function () {
    audio.muted = false;
    if (icoVol) icoVol.hidden = false;
    if (icoMute) icoMute.hidden = true;
    togglePlay(true);
  };
})();
