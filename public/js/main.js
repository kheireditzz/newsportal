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
  if (btnCopy) {
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

  const btnNative = document.getElementById('btnNativeShare');
  if (btnNative) {
    btnNative.addEventListener('click', async () => {
      const title = btnNative.dataset.shareTitle || document.title || 'Nusantara News';
      const url = btnNative.dataset.shareUrl || window.location.href;
      const snippet = btnNative.dataset.shareText || document.querySelector('.article-lead')?.textContent || '';
      const img = btnNative.dataset.shareImg || '';
      
      const fullText = snippet + (img ? '\n\n📸 Foto: ' + img : '');

      if (navigator.share) {
        try {
          await navigator.share({
            title: title,
            text: fullText,
            url: url
          });
        } catch (err) {
          if (err.name !== 'AbortError') {
            btnCopy?.click();
          }
        }
      } else {
        const fullClipboard = '*' + title + '*\n\n' + fullText + '\n\n🌐 ' + url;
        try {
          await navigator.clipboard.writeText(fullClipboard);
          showToast('Ringkasan berita lengkap berhasil disalin!');
        } catch (e) {
          btnCopy?.click();
        }
      }
    });
  }

  const btnCopySummary = document.getElementById('btnCopyFullSummary');
  if (btnCopySummary) {
    btnCopySummary.addEventListener('click', async () => {
      const textToCopy = btnCopySummary.dataset.clipboardText || '';
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(textToCopy);
        } else {
          const temp = document.createElement('textarea');
          temp.value = textToCopy;
          document.body.appendChild(temp);
          temp.select();
          document.execCommand('copy');
          document.body.removeChild(temp);
        }
        showToast('Berita lengkap (judul, isi, foto & link) berhasil disalin!');
      } catch (err) {
        showToast('Gagal menyalin teks');
      }
    });
  }

  // Support quick-share buttons on cards if present
  document.querySelectorAll('.card-share-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const title = btn.dataset.title || '';
      const url = btn.dataset.url ? (window.location.origin + btn.dataset.url) : window.location.href;
      const card = btn.closest('.card');
      const excerpt = card?.querySelector('.card-excerpt')?.textContent?.trim() || '';
      const fullPayload = '*' + title + '*\n\n' + excerpt + '\n\n🌐 Baca selengkapnya: ' + url;

      if (navigator.share) {
        try {
          await navigator.share({ title, text: excerpt, url });
        } catch (err) {}
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullPayload);
        showToast('Berita lengkap & link berhasil disalin!');
      }
    });
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

/* ---------- Rotating Self-Promotion Ads (Patchwork, TikTok Profile, TikTok VT, Instagram) ---------- */
function initRotatingPromoBanners() {
  const banners = document.querySelectorAll('.promo-banner-card[data-rotating="true"]');
  if (!banners.length) return;

  const promoVariants = [
    {
      theme: 'tiktok',
      url: 'https://www.tiktok.com/@kestylein',
      badge: 'TIKTOK OFFICIAL · FOLLOW US',
      title: 'Ikuti @kestylein di TikTok untuk Konten Viral',
      desc: 'Dapatkan update video gaya hidup, rekomendasi produk tren, dan inspirasi harian terbaru langsung di feed Anda.',
      btnText: 'Follow @kestylein',
      iconSvg: '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>'
    },
    {
      theme: 'tiktok',
      url: 'https://vt.tiktok.com/ZSqurE4nS/',
      badge: 'VIDEO VIRAL PILIHAN · TIKTOK',
      title: 'Tonton Video Viral Paling Ramai di TikTok Sekarang',
      desc: 'Klik untuk menyaksikan tayangan eksklusif video viral pilihan @kestylein yang sedang ramai diperbincangkan netizen.',
      btnText: 'Tonton Video VT ↗',
      iconSvg: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
    },
    {
      theme: 'instagram',
      url: 'https://www.instagram.com/khairindtz?stkn=c2I4c2diYmYybGxh',
      badge: 'INSTAGRAM OFFICIAL · FOLLOW US',
      title: 'Terhubung dengan @khairindtz di Instagram',
      desc: 'Temukan cuplikan stories harian, portofolio visual, inspirasi konten kekinian, dan interaksi langsung bersama kami.',
      btnText: 'Follow Instagram ↗',
      iconSvg: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>'
    },
    {
      theme: 'tiktok',
      url: 'https://vt.tiktok.com/ZSqurn8XH/',
      badge: 'TRENDING TIKTOK · KONTEN PILIHAN',
      title: 'Saksikan Tayangan Viral Terbaru @kestylein',
      desc: 'Tonton konten seru dan rekomendasi eksklusif dengan ribuan interaksi dari penonton di seluruh Indonesia.',
      btnText: 'Putar di TikTok ↗',
      iconSvg: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
    },
    {
      theme: 'patchwork',
      url: 'https://patchwork.kheireditz.my.id/',
      badge: 'REKOMENDASI BELANJA VIRAL · PATCHWORK',
      title: 'Temukan Produk Viral TikTok & Shopee di Patchwork',
      desc: 'Kurasi produk trending terpercaya, diskon eksklusif, serta ulasan jujur untuk belanja hemat dan cerdas.',
      btnText: 'Buka Katalog Patchwork ↗',
      iconSvg: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>'
    }
  ];

  // Choose a random starting variant on load for natural rotation
  let currentIndex = Math.floor(Math.random() * promoVariants.length);

  function applyVariant(banner, item, animate = false) {
    const inner = banner.querySelector('.promo-banner-inner');
    const badgeEl = banner.querySelector('.promo-badge-text');
    const titleEl = banner.querySelector('.promo-banner-title');
    const descEl = banner.querySelector('.promo-banner-desc');
    const btnEl = banner.querySelector('.promo-banner-btn-text');
    const iconEl = banner.querySelector('.promo-banner-icon');

    const updateDom = () => {
      banner.href = item.url;
      banner.setAttribute('data-theme', item.theme);
      banner.setAttribute('title', item.title);
      if (badgeEl) badgeEl.textContent = item.badge;
      if (titleEl) titleEl.innerHTML = item.title;
      if (descEl) descEl.textContent = item.desc;
      if (btnEl) btnEl.textContent = item.btnText;
      if (iconEl) iconEl.innerHTML = item.iconSvg;
    };

    if (animate && inner) {
      inner.classList.add('is-switching');
      setTimeout(() => {
        updateDom();
        inner.classList.remove('is-switching');
      }, 250);
    } else {
      updateDom();
    }
  }

  banners.forEach(banner => {
    applyVariant(banner, promoVariants[currentIndex], false);
  });

  // Rotate smoothly every 9 seconds
  setInterval(() => {
    currentIndex = (currentIndex + 1) % promoVariants.length;
    banners.forEach(banner => {
      applyVariant(banner, promoVariants[currentIndex], true);
    });
  }, 9000);
}

/* ---------- Periodic Floating Social Popup (Muncul beberapa saat, hilang, lalu muncul lagi) ---------- */
function initPeriodicSocialPopup() {
  const popup = document.getElementById('floatingSocialPopup');
  const closeBtn = document.getElementById('fspClose');
  if (!popup) return;

  popup.style.display = 'block';

  let isDismissedByUser = false;
  let timerId = null;

  function showPopup() {
    if (isDismissedByUser) return;
    popup.classList.add('fsp-visible');

    // Tampil selama 7 detik, lalu menghilang otomatis agar tidak mengganggu pembaca
    timerId = setTimeout(() => {
      hidePopup(false);
    }, 7000);
  }

  function hidePopup(isManualClose = false) {
    popup.classList.remove('fsp-visible');
    clearTimeout(timerId);

    if (isManualClose) {
      // Jika pengguna menekan tombol silang, jeda lebih lama (30 detik) sebelum muncul lagi
      timerId = setTimeout(() => {
        isDismissedByUser = false;
        showPopup();
      }, 30000);
    } else {
      // Jika menghilang otomatis, jeda 12 detik lalu muncul lagi
      timerId = setTimeout(() => {
        showPopup();
      }, 12000);
    }
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isDismissedByUser = true;
      hidePopup(true);
    });
  }

  // Muncul pertama kali 3.5 detik setelah halaman dimuat
  setTimeout(() => {
    showPopup();
  }, 3500);
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
  initRotatingPromoBanners();
  initPeriodicSocialPopup();
});
