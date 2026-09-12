/* ==========================================================================
   Nusantara News — Frontend Main Script
   Features:
   - Theme Toggle (Dark / Light) with smooth transition
   - Reading Progress Bar & Interactive Reading Timer (Live Stopwatch + Remaining ETA)
   - Text-to-Speech Audio Article Reader (Web Speech API id-ID)
   - Focus / Zen Reading Mode
   - Font Resizer (A-, A, A+)
   - Floating Reading Companion Bar
   - Responsive Navigation & Search Panel
   - Slider Carousel & Lightbox Gallery
   ========================================================================== */

function showToast(msg, duration = 3000) {
  let toast = document.getElementById('siteToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'siteToast';
    toast.className = 'site-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

/* ---------- Theme Toggle ---------- */
function initTheme() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const getTheme = () => document.documentElement.getAttribute('data-theme') || 'light';
  
  btn.addEventListener('click', () => {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('nusantara_theme', next);
    } catch (e) {}
    showToast(next === 'dark' ? 'Mode Gelap diaktifkan' : 'Mode Terang diaktifkan', 2000);
  });
}

/* ---------- Top Reading Progress Bar ---------- */
function initReadingProgress() {
  const bar = document.getElementById('readingProgress');
  const articleBody = document.getElementById('articleBody');
  if (!bar) return;

  const update = () => {
    if (articleBody) {
      const rect = articleBody.getBoundingClientRect();
      const top = window.scrollY + rect.top;
      const height = rect.height;
      const winH = window.innerHeight;
      const scrolled = window.scrollY - top;
      const total = height - winH * 0.4;
      if (total <= 0) {
        bar.style.width = '0%';
        return;
      }
      const pct = Math.min(100, Math.max(0, (scrolled / total) * 100));
      bar.style.width = pct + '%';
    } else {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total <= 0) {
        bar.style.width = '0%';
        return;
      }
      const current = Math.min(100, Math.max(0, (window.scrollY / total) * 100));
      bar.style.width = current + '%';
    }
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ---------- Live Reading Timer & Companion ---------- */
function initReadingTimer() {
  const timerDigits = document.getElementById('liveReadingTimer');
  const timerRem = document.getElementById('readingTimeRemaining');
  const btnToggle = document.getElementById('btnToggleTimer');
  const frTimer = document.getElementById('frTimer');
  const frProgress = document.getElementById('frProgress');
  const articleBody = document.getElementById('articleBody');
  if (!timerDigits || !articleBody) return;

  let seconds = 0;
  let isRunning = true;
  let interval = null;

  // Calculate word count & base read time (200 wpm)
  const text = articleBody.innerText || '';
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const totalEstimatedMinutes = Math.max(1, Math.ceil(wordCount / 190));

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return pad(m) + ':' + pad(sec);
  }

  function tick() {
    if (!isRunning) return;
    seconds++;
    const formatted = formatTime(seconds);
    timerDigits.textContent = formatted;
    if (frTimer) frTimer.textContent = '⏱️ ' + formatted;

    // Update remaining estimate based on scroll progress
    updateProgressAndEta();
  }

  function updateProgressAndEta() {
    const rect = articleBody.getBoundingClientRect();
    const height = rect.height;
    const scrolled = Math.max(0, -rect.top);
    const progress = Math.min(1, Math.max(0, scrolled / Math.max(1, height - window.innerHeight * 0.5)));
    const pct = Math.round(progress * 100);

    if (frProgress) frProgress.textContent = pct + '% selesai';

    const remainingMin = Math.max(0, Math.ceil(totalEstimatedMinutes * (1 - progress)));
    if (timerRem) {
      if (pct >= 95) {
        timerRem.textContent = '· Selesai dibaca';
      } else {
        timerRem.textContent = '· Sisa: ~' + (remainingMin || 1) + ' mnt';
      }
    }
  }

  interval = setInterval(tick, 1000);

  if (btnToggle) {
    const iconPause = document.getElementById('timerIconPause');
    const iconPlay = document.getElementById('timerIconPlay');
    btnToggle.addEventListener('click', () => {
      isRunning = !isRunning;
      if (iconPause) iconPause.style.display = isRunning ? '' : 'none';
      if (iconPlay) iconPlay.style.display = isRunning ? 'none' : '';
      btnToggle.setAttribute('aria-label', isRunning ? 'Jeda Timer' : 'Lanjutkan Timer');
      showToast(isRunning ? 'Timer baca dilanjutkan' : 'Timer baca dijeda', 1500);
    });
  }

  window.addEventListener('scroll', updateProgressAndEta, { passive: true });
}

/* ---------- Text-to-Speech Audio Article Reader ---------- */
function initAudioReader() {
  const btn = document.getElementById('btnAudioReader');
  const label = document.getElementById('audioReaderLabel');
  const waves = document.getElementById('audioEqualizer');
  const frBtn = document.getElementById('frAudioBtn');
  const articleBody = document.getElementById('articleBody');
  if (!btn || !articleBody) return;

  if (!('speechSynthesis' in window)) {
    btn.style.display = 'none';
    if (frBtn) frBtn.style.display = 'none';
    return;
  }

  let utterance = null;
  let isSpeaking = false;
  let isPaused = false;

  function setPlayingUI(playing) {
    if (label) label.textContent = playing ? 'Jeda' : 'Dengarkan';
    if (waves) waves.style.display = playing ? 'inline-flex' : 'none';
    btn.classList.toggle('active', playing);
    if (frBtn) frBtn.classList.toggle('active', playing);
  }

  function toggleSpeech() {
    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      isPaused = true;
      setPlayingUI(false);
      if (label) label.textContent = 'Lanjutkan';
      showToast('Pembacaan berita dijeda', 1800);
      return;
    }

    if (isSpeaking && isPaused) {
      window.speechSynthesis.resume();
      isPaused = false;
      setPlayingUI(true);
      showToast('Melanjutkan pembacaan...', 1800);
      return;
    }

    // Start fresh
    window.speechSynthesis.cancel();
    const title = document.querySelector('.article-title') ? document.querySelector('.article-title').innerText : '';
    const bodyText = articleBody.innerText || '';
    const fullText = (title ? title + '. ' : '') + bodyText;

    utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick best Indonesian voice if present
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('ID'));
    if (idVoice) utterance.voice = idVoice;

    utterance.onstart = () => {
      isSpeaking = true;
      isPaused = false;
      setPlayingUI(true);
      showToast('Memulai audio pembaca berita...', 2200);
    };

    utterance.onend = () => {
      isSpeaking = false;
      isPaused = false;
      setPlayingUI(false);
      showToast('Selesai membaca artikel.', 2000);
    };

    utterance.onerror = () => {
      isSpeaking = false;
      isPaused = false;
      setPlayingUI(false);
    };

    window.speechSynthesis.speak(utterance);
  }

  btn.addEventListener('click', toggleSpeech);
  if (frBtn) frBtn.addEventListener('click', toggleSpeech);

  window.addEventListener('beforeunload', () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  });
}

/* ---------- Focus / Zen Reading Mode ---------- */
function initFocusMode() {
  const btn = document.getElementById('btnFocusMode');
  if (!btn) return;

  let active = false;
  let exitBanner = null;

  function toggleFocus() {
    active = !active;
    document.body.classList.toggle('zen-focus-mode', active);
    btn.classList.toggle('active', active);

    if (active) {
      if (!exitBanner) {
        exitBanner = document.createElement('div');
        exitBanner.className = 'zen-exit-banner';
        exitBanner.innerHTML = '<span>Mode Fokus Aktif</span><button type="button" id="btnExitFocus">Keluar (Esc)</button>';
        document.body.appendChild(exitBanner);
        exitBanner.querySelector('#btnExitFocus').addEventListener('click', toggleFocus);
      }
      exitBanner.style.display = 'flex';
      showToast('Mode Fokus diaktifkan. Tekan Esc untuk keluar.', 2500);
    } else if (exitBanner) {
      exitBanner.style.display = 'none';
    }
  }

  btn.addEventListener('click', toggleFocus);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && active) {
      toggleFocus();
    }
  });
}

/* ---------- Floating Reader Companion Bar ---------- */
function initFloatingReaderBar() {
  const bar = document.getElementById('floatingReaderBar');
  const topBtn = document.getElementById('frTopBtn');
  const header = document.querySelector('.article-header');
  if (!bar || !header) return;

  const onScroll = () => {
    const rect = header.getBoundingClientRect();
    if (rect.bottom < 0 && window.scrollY > 300) {
      bar.classList.add('visible');
    } else {
      bar.classList.remove('visible');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  if (topBtn) {
    topBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

/* ---------- Back To Top ---------- */
function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;
  const onScroll = () => {
    if (window.scrollY > 380) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  onScroll();
}

/* ---------- Font Resizer ---------- */
function initFontResizer() {
  const body = document.getElementById('articleBody');
  const btnDec = document.getElementById('fontDec');
  const btnReset = document.getElementById('fontReset');
  const btnInc = document.getElementById('fontInc');
  if (!body || !btnDec) return;

  const sizes = [15, 17, 19, 21, 23];
  let curIdx = 2; // default 19px (scales with 85% zoom)

  const apply = (idx) => {
    curIdx = Math.max(0, Math.min(sizes.length - 1, idx));
    body.style.fontSize = sizes[curIdx] + 'px';
    [btnDec, btnReset, btnInc].forEach(b => b.classList.remove('active'));
    if (curIdx === 2 && btnReset) btnReset.classList.add('active');
    else if (curIdx > 2 && btnInc) btnInc.classList.add('active');
    else if (curIdx < 2 && btnDec) btnDec.classList.add('active');
  };

  btnDec.addEventListener('click', () => apply(curIdx - 1));
  if (btnReset) btnReset.addEventListener('click', () => apply(2));
  btnInc.addEventListener('click', () => apply(curIdx + 1));
  apply(curIdx);
}

/* ---------- Social Share Buttons ---------- */
function initShareButtons() {
  const btnCopy = document.getElementById('btnCopyLink');
  if (!btnCopy) return;
  btnCopy.addEventListener('click', async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const temp = document.createElement('input');
        temp.value = url;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }
      showToast('Tautan artikel berhasil disalin!');
    } catch (err) {
      showToast('Gagal menyalin tautan');
    }
  });
}

/* ---------- Slider Carousel ---------- */
function initSlider(root) {
  const slides = root.querySelectorAll('.slide');
  const dotsWrap = root.querySelector('.slider-dots');
  if (!slides.length) return;
  let idx = 0, timer;

  if (dotsWrap && !dotsWrap.children.length) {
    slides.forEach((_, i) => {
      const b = document.createElement('button');
      b.setAttribute('aria-label', 'Slide ' + (i + 1));
      b.addEventListener('click', () => go(i));
      dotsWrap.appendChild(b);
    });
  }

  function go(n) {
    idx = (n + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle('active', i === idx));
    if (dotsWrap) [...dotsWrap.children].forEach((d, i) => d.classList.toggle('active', i === idx));
    restart();
  }
  function next() { go(idx + 1); }
  function restart() { clearInterval(timer); timer = setInterval(next, 6000); }

  const prev = root.querySelector('.slider-nav.prev');
  const nxt = root.querySelector('.slider-nav.next');
  if (prev) prev.addEventListener('click', () => go(idx - 1));
  if (nxt) nxt.addEventListener('click', next);

  let x0 = null;
  root.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 45) (dx < 0 ? next() : go(idx - 1));
    x0 = null;
  }, { passive: true });

  go(0);
}

/* ---------- Mobile Menu & Search Panel ---------- */
function initMenu() {
  const t = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  if (t && nav) t.addEventListener('click', () => nav.classList.toggle('open'));

  const st = document.querySelector('.search-toggle');
  const panel = document.querySelector('.search-panel');
  if (st && panel) {
    st.addEventListener('click', () => {
      panel.classList.add('open');
      const i = panel.querySelector('input');
      if (i) i.focus();
    });
    panel.addEventListener('click', e => { if (e.target === panel) panel.classList.remove('open'); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') panel.classList.remove('open'); });
  }
}

/* ---------- Photo Gallery & Lightbox ---------- */
function initGallery() {
  const filters = document.querySelectorAll('.gallery-filters button');
  const grid = document.querySelector('.gallery-grid.filtered');
  if (filters.length && grid) {
    filters.forEach(btn => btn.addEventListener('click', () => {
      filters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const album = btn.dataset.album;
      grid.querySelectorAll('.g-item').forEach(item => {
        item.classList.toggle('hide', album !== 'all' && item.dataset.album !== album);
      });
    }));
  }

  const lb = document.querySelector('.lightbox');
  if (!lb) return;
  const lbImg = lb.querySelector('img');
  const lbCap = lb.querySelector('.lb-cap');
  document.querySelectorAll('.g-item').forEach(item => {
    item.addEventListener('click', () => {
      lbImg.src = item.dataset.full || item.querySelector('img').src;
      lbCap.textContent = item.dataset.caption || '';
      lb.classList.add('open');
    });
  });
  lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lb-close')) lb.classList.remove('open'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') lb.classList.remove('open'); });
}

/* ---------- Video Lightbox Modal ---------- */
function initVideoModal() {
  const cards = document.querySelectorAll('[data-video]');
  if (!cards.length) return;
  const modal = document.createElement('div');
  modal.className = 'lightbox';
  modal.innerHTML = '<button class="lb-close">&times;</button><div style="width:min(900px,92vw);aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden"><iframe style="width:100%;height:100%;border:0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe></div>';
  document.body.appendChild(modal);
  const iframe = modal.querySelector('iframe');
  cards.forEach(c => c.addEventListener('click', e => {
    e.preventDefault();
    iframe.src = c.dataset.video + '?autoplay=1';
    modal.classList.add('open');
  }));
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.classList.contains('lb-close')) {
      modal.classList.remove('open');
      iframe.src = '';
    }
  });
}

/* ---------- DOM Ready Bootstrap ---------- */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-slider]').forEach(initSlider);
  initMenu();
  initGallery();
  initVideoModal();
  initTheme();
  initReadingProgress();
  initReadingTimer();
  initAudioReader();
  initFocusMode();
  initFloatingReaderBar();
  initBackToTop();
  initFontResizer();
  initShareButtons();
});
