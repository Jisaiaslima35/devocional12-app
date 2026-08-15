// audio-recorder.js — Botão de mic pequeno, integrado com backend via upload
// Estilo Mega Crystal: pequeno, ao lado do input
(function() {
  'use strict';
  if (window.__AUDIO_RECORDER_LOADED__) return;
  window.__AUDIO_RECORDER_LOADED__ = true;

  const btn = document.getElementById('btn-mic');
  const iconMic = document.getElementById('mic-icon');
  const iconStop = document.getElementById('mic-stop');
  const status = document.getElementById('mic-status');
  if (!btn) return;

  let mediaRecorder = null;
  let audioChunks = [];
  let stream = null;
  let state = 'idle';

  function setIdle() {
    state = 'idle';
    btn.classList.remove('recording', 'uploading');
    iconMic.style.display = '';
    iconStop.style.display = 'none';
    btn.disabled = false;
    if (status) { status.style.display = 'none'; }
  }
  function setRecording() {
    state = 'recording';
    btn.classList.add('recording');
    iconMic.style.display = 'none';
    iconStop.style.display = '';
    btn.disabled = false;
  }
  function setUploading() {
    state = 'uploading';
    btn.classList.remove('recording');
    btn.classList.add('uploading');
    iconMic.style.display = '';
    iconStop.style.display = 'none';
    btn.disabled = true;
  }

  async function startRecording() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
      });
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find(m => MediaRecorder.isTypeSupported(m)) || '';
      mediaRecorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      audioChunks = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = handleStop;
      mediaRecorder.start();
      setRecording();
    } catch (e) {
      console.error('[audio-rec] getUserMedia falhou:', e);
      alert('Não foi possível acessar o microfone. Verifique as permissões.');
      setIdle();
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  }

  async function handleStop() {
    setUploading();
    const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
    if (blob.size < 800) {
      alert('Áudio muito curto. Tenta de novo.');
      setIdle();
      return;
    }
    try {
      const fd = new FormData();
      fd.append('audio', blob, `rec-${Date.now()}.webm`);
      const username = window.__CHAT_CURRENT_USERNAME__ || 'Web-Ouvinte';
      const r = await fetch('/api/audio/upload', {
        method: 'POST',
        body: fd,
        headers: { 'x-user': username }
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      console.log('[audio-rec] upload OK');
    } catch (e) {
      console.error('[audio-rec] upload falhou:', e);
      alert('Erro no envio: ' + e.message);
    } finally {
      setIdle();
    }
  }

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (state === 'idle') startRecording();
    else if (state === 'recording') stopRecording();
  });

  setIdle();
})();