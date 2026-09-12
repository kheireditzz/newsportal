/* ==========================================================================
   Nusantara News — Media Editor
   - Precision Image Cropping (8 handles, Rule of Thirds grid, aspect ratios)
   - Dimension & Resolution Control (HD presets, custom width/height, format & quality)
   - Image Adjustments (Brightness, contrast, saturation, rotate, flip)
   - Video Thumbnail Capture (local video frames + auto-time capture)
   - YouTube / TikTok Auto Thumbnail + Title
   ========================================================================== */

(function () {
  'use strict';

  const NS = window.NusantaraMedia = window.NusantaraMedia || {};

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* Model state for current editor instance */
  const state = {
    editor: null,
    img: null,            // original Image
    tool: 'crop',         // 'crop' | 'size' | 'adjust' | 'video'
    crop: null,           // {x,y,w,h} in processed-image px (after rot/flip)
    rot: 0,
    flipH: false,
    flipV: false,
    bright: 100,
    contrast: 100,
    sat: 100,
    aspect: '16/9',       // '16/9', '4/3', '1/1', etc, '' = free
    sizePreset: '1200x675', // '1200x675', '800x450', 'original', 'custom', etc.
    targetW: 1200,        // export target width px
    targetH: 675,         // export target height px
    lockRatio: true,      // lock aspect ratio in custom size inputs
    format: 'image/webp', // 'image/webp' | 'image/jpeg' | 'image/png'
    quality: 85,          // 40 - 100
    video: null,          // HTMLVideoElement for local capture
    videoUrl: null,
    captureInterval: null,
    frames: [],           // captured frame dataUrls
    selectedFrame: null,
    busy: false
  };

  function resetState() {
    Object.assign(state, {
      img: null,
      tool: 'crop',
      crop: null,
      rot: 0,
      flipH: false,
      flipV: false,
      bright: 100,
      contrast: 100,
      sat: 100,
      aspect: '16/9',
      sizePreset: '1200x675',
      targetW: 1200,
      targetH: 675,
      lockRatio: true,
      format: 'image/webp',
      quality: 85,
      video: null,
      videoUrl: null,
      captureInterval: null,
      frames: [],
      selectedFrame: null,
      busy: false
    });
  }

  const canvasPool = [];
  function tempCanvas(w, h) {
    const c = canvasPool.pop() || document.createElement('canvas');
    c.width = Math.max(1, w);
    c.height = Math.max(1, h);
    return c;
  }
  function releaseCanvas(c) { if (c) canvasPool.push(c); }

  // Processed (rot/flip applied) dimensions of current image
  function processedDims() {
    const img = state.img;
    if (!img) return { w: 0, h: 0 };
    const nat = img.naturalWidth || img.width;
    const nath = img.naturalHeight || img.height;
    const rotated90 = ((state.rot % 360) + 360) % 360 % 180 === 90;
    return rotated90 ? { w: nath, h: nat } : { w: nat, h: nath };
  }

  // Draw the source image with rotation + flips onto a fresh canvas (full res).
  function renderBaseCanvas() {
    const img = state.img;
    if (!img) return null;
    const { w, h } = processedDims();
    if (!w || !h) return null;
    const nat = img.naturalWidth || img.width;
    const nath = img.naturalHeight || img.height;
    const c = tempCanvas(w, h);
    const ctx = c.getContext('2d');
    const cx = w / 2, cy = h / 2;
    ctx.translate(cx, cy);
    ctx.rotate(state.rot * Math.PI / 180);
    ctx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);
    ctx.drawImage(img, -nat / 2, -nath / 2, nat, nath);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return c;
  }

  /* ---------- open / close ---------- */
  function openEditor(editor, src, sourceForm) {
    if (!editor) return;
    state.editor = editor;
    state.sourceForm = sourceForm || (editor ? editor.closest('form') : null);
    const modal = editor.querySelector('.media-editor-backdrop');
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    bindControls(editor);
    initCropDrag();

    if (src) {
      const sf = state.sourceForm;
      resetState();
      state.editor = editor;
      state.sourceForm = sf;
      loadImage(src);
    } else {
      state.img = null;
      state.crop = null;
      drawPreview();
    }
    setTool('crop');
    syncUI();
  }

  function closeEditor() {
    const editor = state.editor;
    if (editor) {
      const modal = editor.querySelector('.media-editor-backdrop');
      if (modal) modal.classList.remove('open');
      document.body.style.overflow = '';
      stopCapture();
      state.editor = null;
    }
  }

  function setTool(t) {
    state.tool = t;
    const editor = state.editor;
    if (!editor) return;
    editor.querySelectorAll('[data-tool]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tool === t);
    });
    editor.querySelectorAll('[data-tool-panel]').forEach(function (p) {
      p.style.display = p.dataset.toolPanel === t ? '' : 'none';
    });
    updateSizeReadouts();
  }

  /* ---------- image loading ---------- */
  function loadImage(src) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      state.img = img;
      const { w, h } = processedDims();
      // default: use natural full image without forced preset stretching
      state.aspect = '';
      state.sizePreset = 'original';
      state.targetW = 0;
      state.targetH = 0;
      resetCrop();
      drawPreview();
      syncUI();
    };
    img.onerror = function () {
      toast('Gagal memuat gambar', false);
    };
    img.src = src;
  }

  function resetCrop() {
    const { w, h } = processedDims();
    if (!w || !h) { state.crop = null; return; }
    state.crop = { x: 0, y: 0, w: w, h: h };
    if (state.aspect) applyAspectToCrop();
    updateSizeReadouts();
  }

  function getCanvasBox() {
    return state.editor ? state.editor.querySelector('.media-canvas-box') : null;
  }
  function getPreviewCanvas() {
    const cb = getCanvasBox();
    return cb ? cb.querySelector('canvas[data-preview-canvas]') : null;
  }
  function getCropOverlay() {
    const cb = getCanvasBox();
    return cb ? cb.querySelector('.media-crop-overlay') : null;
  }
  function getEmptyMsg() {
    const cb = getCanvasBox();
    return cb ? cb.querySelector('.media-canvas-empty') : null;
  }

  // Fit a canvas element into the container preserving aspect ratio.
  function fitCanvasToBox(canvas) {
    const box = getCanvasBox();
    if (!box || !canvas) return;
    const boxRect = box.getBoundingClientRect();
    const availW = Math.max(120, boxRect.width - 28);
    const availH = Math.max(120, boxRect.height - 28);
    const scale = Math.min(availW / canvas.width, availH / canvas.height);
    canvas.style.width = Math.round(canvas.width * scale) + 'px';
    canvas.style.height = Math.round(canvas.height * scale) + 'px';
    canvas.style.maxWidth = availW + 'px';
    canvas.style.maxHeight = availH + 'px';
  }

  // Renders preview: base canvas + filters + live crop overlay.
  function drawPreview() {
    const canvas = getPreviewCanvas();
    if (!canvas) return;
    if (!state.img) {
      canvas.width = 0; canvas.height = 0;
      const ov = getCropOverlay(); if (ov) ov.style.display = 'none';
      const em = getEmptyMsg(); if (em) em.style.display = '';
      return;
    }
    const base = renderBaseCanvas();
    if (!base) return;
    const ctx = canvas.getContext('2d');
    canvas.width = base.width;
    canvas.height = base.height;
    ctx.filter = 'brightness(' + state.bright / 100 + ') contrast(' + state.contrast / 100 + ') saturate(' + state.sat / 100 + ')';
    ctx.drawImage(base, 0, 0);
    ctx.filter = 'none';
    releaseCanvas(base);
    fitCanvasToBox(canvas);

    const em = getEmptyMsg(); if (em) em.style.display = 'none';
    const ov = getCropOverlay();
    if (ov && state.crop) {
      const canvasRect = canvas.getBoundingClientRect();
      const scale = canvasRect.width / canvas.width;
      ov.style.cssText = '';
      ov.style.cssText =
        'top:' + (state.crop.y * scale) + 'px;' +
        'left:' + (state.crop.x * scale) + 'px;' +
        'width:' + (state.crop.w * scale) + 'px;' +
        'height:' + (state.crop.h * scale) + 'px;' +
        'display:block;';

      const badge = ov.querySelector('[data-crop-badge]');
      if (badge) {
        badge.textContent = Math.round(state.crop.w) + ' × ' + Math.round(state.crop.h) + ' px';
      }
    } else if (ov) {
      ov.style.display = 'none';
    }

    updateSizeReadouts();
  }

  // Convert a client (pointer) coordinate inside the canvas box to processed-image px.
  function clientToImage(clientX, clientY) {
    const canvas = getPreviewCanvas();
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    const scaleX = canvas.width / r.width;
    const scaleY = canvas.height / r.height;
    return { x: (clientX - r.left) * scaleX, y: (clientY - r.top) * scaleY };
  }

  /* ---------- crop aspect & ratios ---------- */
  function aspectRatio() {
    if (!state.aspect) return null;
    const parts = state.aspect.split('/');
    if (parts.length !== 2) return null;
    const num = Number(parts[0]);
    const den = Number(parts[1]);
    return den ? num / den : null;
  }

  function applyAspectToCrop() {
    const { w: nat, h: nath } = processedDims();
    if (!nat || !nath) return;
    let c = Object.assign({}, state.crop || { x: 0, y: 0, w: nat, h: nath });

    const ar = aspectRatio();
    if (ar) {
      let w = c.w;
      let h = w / ar;
      if (h > nath) { h = nath; w = h * ar; }
      if (w > nat) { w = nat; h = w / ar; }
      c.x = c.x + c.w / 2 - w / 2;
      c.y = c.y + c.h / 2 - h / 2;
      c.x = clamp(c.x, 0, nat - w);
      c.y = clamp(c.y, 0, nath - h);
      c.w = w;
      c.h = h;
    }
    state.crop = c;
    drawPreview();
  }

  /* ---------- update size readouts and info cards ---------- */
  function updateSizeReadouts() {
    const editor = state.editor;
    if (!editor || !state.img) return;
    const { w: natW, h: natH } = processedDims();
    const c = state.crop || { w: natW, h: natH };

    const cropW = Math.round(c.w);
    const cropH = Math.round(c.h);

    let finalW = cropW;
    let finalH = cropH;
    if (state.sizePreset !== 'original' && state.targetW && state.targetH) {
      finalW = Math.round(state.targetW);
      finalH = Math.round(state.targetH);
    }

    const cropReadout = editor.querySelector('[data-crop-readout]');
    if (cropReadout) cropReadout.textContent = cropW + ' × ' + cropH + ' px';

    const ratioReadout = editor.querySelector('[data-crop-ratio-readout]');
    if (ratioReadout) {
      ratioReadout.textContent = state.aspect ? state.aspect : 'Bebas';
    }

    const infoNat = editor.querySelector('[data-info-original]');
    if (infoNat) infoNat.textContent = natW + ' × ' + natH + ' px';

    const infoCrop = editor.querySelector('[data-info-crop]');
    if (infoCrop) infoCrop.textContent = cropW + ' × ' + cropH + ' px';

    const infoTarget = editor.querySelector('[data-info-target]');
    if (infoTarget) infoTarget.textContent = finalW + ' × ' + finalH + ' px';

    // Summary in modal footer
    const summary = editor.querySelector('[data-export-summary]');
    if (summary) {
      const fmtName = state.format === 'image/webp' ? 'WebP' : state.format === 'image/jpeg' ? 'JPEG' : 'PNG';
      summary.textContent = 'Output: ' + finalW + ' × ' + finalH + ' px (' + fmtName + ' ' + state.quality + '%)';
    }

    // Input fields for custom size
    const dimW = editor.querySelector('[data-dim-w]');
    const dimH = editor.querySelector('[data-dim-h]');
    if (dimW && document.activeElement !== dimW) dimW.value = finalW;
    if (dimH && document.activeElement !== dimH) dimH.value = finalH;
  }

  /* ---------- 8-handle Crop Dragging ---------- */
  function initCropDrag() {
    const editor = state.editor;
    if (!editor) return;
    const box = editor.querySelector('.media-canvas-box');
    if (!box || box.dataset.cropBound === '1') return;
    box.dataset.cropBound = '1';

    let mode = null; // 'move' | 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se' | 'create'
    let anchor = null;
    let origCrop = null;

    box.addEventListener('pointerdown', function (e) {
      if (!state.img || !state.crop) return;
      const overlay = getCropOverlay();
      const target = e.target;
      const handle = target.closest && target.closest('.handle');

      const p = clientToImage(e.clientX, e.clientY);
      if (!p) return;
      const c = state.crop;
      const inside = p.x >= c.x - 6 && p.x <= c.x + c.w + 6 && p.y >= c.y - 6 && p.y <= c.y + c.h + 6;

      if (!inside && !handle) {
        mode = 'create';
        origCrop = { x: p.x, y: p.y, w: 0, h: 0 };
        state.crop = origCrop;
        if (overlay) overlay.style.display = 'block';
      } else if (handle) {
        const classes = handle.classList;
        if (classes.contains('nw')) mode = 'nw';
        else if (classes.contains('ne')) mode = 'ne';
        else if (classes.contains('sw')) mode = 'sw';
        else if (classes.contains('se')) mode = 'se';
        else if (classes.contains('n')) mode = 'n';
        else if (classes.contains('s')) mode = 's';
        else if (classes.contains('w')) mode = 'w';
        else if (classes.contains('e')) mode = 'e';
        origCrop = Object.assign({}, state.crop);
        anchor = { x: e.clientX, y: e.clientY };
      } else {
        mode = 'move';
        origCrop = Object.assign({}, state.crop);
        anchor = { x: e.clientX, y: e.clientY };
      }
      e.preventDefault();

      function onMove(ev) {
        const { w: nat, h: nath } = processedDims();
        if (!nat || !nath) return;
        const c = Object.assign({}, origCrop);
        const pp = clientToImage(ev.clientX, ev.clientY);
        if (!pp) return;
        const ar = aspectRatio();

        if (mode === 'move' && anchor) {
          c.x = clamp(origCrop.x + (pp.x - p.x), 0, nat - origCrop.w);
          c.y = clamp(origCrop.y + (pp.y - p.y), 0, nath - origCrop.h);
        } else if (mode === 'create') {
          c.x = Math.min(origCrop.x, pp.x);
          c.y = Math.min(origCrop.y, pp.y);
          c.w = Math.abs(pp.x - origCrop.x);
          c.h = Math.abs(pp.y - origCrop.y);
          if (ar) {
            const maxW = nat - c.x, maxH = nath - c.y;
            if (c.w / c.h > ar) c.w = c.h * ar; else c.h = c.w / ar;
            c.w = Math.min(c.w, maxW);
            c.h = c.w / ar;
            if (c.h > maxH) { c.h = maxH; c.w = c.h * ar; }
          }
        } else {
          // Edge & Corner handles
          if (mode === 'n') {
            c.y = pp.y;
            c.h = (origCrop.y + origCrop.h) - c.y;
            if (ar) {
              c.w = c.h * ar;
              c.x = origCrop.x + (origCrop.w - c.w) / 2;
            }
          } else if (mode === 's') {
            c.h = pp.y - origCrop.y;
            if (ar) {
              c.w = c.h * ar;
              c.x = origCrop.x + (origCrop.w - c.w) / 2;
            }
          } else if (mode === 'w') {
            c.x = pp.x;
            c.w = (origCrop.x + origCrop.w) - c.x;
            if (ar) {
              c.h = c.w / ar;
              c.y = origCrop.y + (origCrop.h - c.h) / 2;
            }
          } else if (mode === 'e') {
            c.w = pp.x - origCrop.x;
            if (ar) {
              c.h = c.w / ar;
              c.y = origCrop.y + (origCrop.h - c.h) / 2;
            }
          } else {
            // Corners: nw, ne, sw, se
            if (mode === 'nw' || mode === 'ne') {
              c.y = pp.y;
              c.h = (origCrop.y + origCrop.h) - c.y;
            }
            if (mode === 'sw' || mode === 'se') {
              c.h = pp.y - origCrop.y;
            }
            if (mode === 'nw' || mode === 'sw') {
              c.x = pp.x;
              c.w = (origCrop.x + origCrop.w) - c.x;
            }
            if (mode === 'ne' || mode === 'se') {
              c.w = pp.x - origCrop.x;
            }
            if (ar) {
              if (mode === 'nw' || mode === 'ne') {
                let h = Math.abs(c.h) || 1;
                let w = h * ar;
                if (w > nat) { w = nat; h = w / ar; }
                c.w = Math.abs(w);
                c.h = h;
                if (mode === 'nw') c.y = (origCrop.y + origCrop.h) - h;
              } else {
                let h = Math.abs(c.h) || 1;
                let w = h * ar;
                if (w > nat) { w = nat; h = w / ar; }
                c.w = Math.abs(w);
                c.h = h;
              }
              if (mode === 'nw' || mode === 'sw') c.x = (origCrop.x + origCrop.w) - Math.abs(c.w);
            }
          }
        }

        // Clamp values
        c.w = Math.max(16, Math.min(c.w, nat));
        c.h = Math.max(16, Math.min(c.h, nath));
        c.x = clamp(c.x, 0, nat - c.w);
        c.y = clamp(c.y, 0, nath - c.h);
        state.crop = c;
        drawPreview();
      }

      function onUp() {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        anchor = null;
      }
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
  }

  /* ---------- Render processed + resized image to canvas ---------- */
  function renderProcessedImage() {
    return new Promise(function (resolve, reject) {
      const img = state.img;
      if (!img) { reject(new Error('Gambar belum dipilih')); return; }
      const base = renderBaseCanvas();
      if (!base) { reject(new Error('Gagal merender gambar')); return; }

      const c = Object.assign({}, state.crop || { x: 0, y: 0, w: base.width, h: base.height });
      c.w = clamp(c.w, 16, base.width);
      c.h = clamp(c.h, 16, base.height);
      c.x = clamp(c.x, 0, base.width - c.w);
      c.y = clamp(c.y, 0, base.height - c.h);

      let targetW = Math.round(c.w);
      let targetH = Math.round(c.h);

      if (state.sizePreset !== 'original' && state.targetW && state.targetH) {
        targetW = Math.max(16, Math.min(4096, Math.round(state.targetW)));
        targetH = Math.max(16, Math.min(4096, Math.round(state.targetH)));
      }

      const out = document.createElement('canvas');
      out.width = targetW;
      out.height = targetH;
      const octx = out.getContext('2d');
      octx.filter = 'brightness(' + state.bright / 100 + ') contrast(' + state.contrast / 100 + ') saturate(' + state.sat / 100 + ')';
      octx.imageSmoothingEnabled = true;
      octx.imageSmoothingQuality = 'high';
      octx.drawImage(
        base,
        Math.round(c.x), Math.round(c.y), Math.round(c.w), Math.round(c.h),
        0, 0, targetW, targetH
      );
      octx.filter = 'none';
      releaseCanvas(base);

      const mime = state.format || 'image/webp';
      const q = Math.max(0.4, Math.min(1.0, (state.quality || 85) / 100));
      resolve(out.toDataURL(mime, q));
    });
  }

  /* ---------- apply & insert ---------- */
  function applyCrop() {
    if (state.busy || !state.editor) return;
    if (!state.img) { toast('Pilih gambar terlebih dahulu', false); return; }
    if (!state.crop || state.crop.w < 16 || state.crop.h < 16) { toast('Area crop minimal 16px', false); return; }
    state.busy = true;
    const btn = state.editor.querySelector('[data-media-apply]');
    if (btn) btn.disabled = true;
    toast('Memproses crop & ukuran gambar...', true);

    renderProcessedImage()
      .then(function (dataUrl) {
        return fetch('/api/media/crop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: dataUrl })
        }).then(function (r) {
          if (!r.ok) {
            return r.json().catch(function () { return { error: 'HTTP ' + r.status + ' ' + r.statusText }; });
          }
          return r.json();
        });
      })
      .then(function (data) {
        state.busy = false;
        if (btn) btn.disabled = false;
        if (data && data.success && data.path) {
          insertMedia(data.path);
          const exportW = (state.sizePreset !== 'original' && state.targetW) ? state.targetW : Math.round(state.crop.w);
          const exportH = (state.sizePreset !== 'original' && state.targetH) ? state.targetH : Math.round(state.crop.h);
          toast('Gambar berhasil dicrop & disimpan (' + exportW + '×' + exportH + ' px)', true);
          closeEditor();

          // update drop preview in form
          const form = getTargetForm();
          if (form) {
            const dropPrev = form.querySelector('.img-drop .prev');
            if (dropPrev) {
              dropPrev.style.background = 'url(/uploads/' + data.path + ') center/cover no-repeat';
              dropPrev.style.border = '0';
              dropPrev.textContent = '';
            }
            // Remove required constraint from raw file inputs now that crop_image is set
            form.querySelectorAll('input[type=file]').forEach(function (inp) {
              inp.removeAttribute('required');
              try { inp.value = ''; } catch (e) {}
            });
          }
        } else {
          toast((data && data.error) || 'Gagal menyimpan gambar', false);
        }
      })
      .catch(function (err) {
        state.busy = false;
        if (btn) btn.disabled = false;
        console.error('applyCrop error:', err);
        toast('Terjadi kesalahan saat memproses gambar: ' + (err.message || err), false);
      });
  }

  function getTargetForm() {
    if (state.sourceForm && state.sourceForm.isConnected) return state.sourceForm;
    if (state.editor) {
      const parentForm = state.editor.closest('form');
      if (parentForm) return parentForm;
    }
    return document.querySelector('form');
  }

  // Inserts a saved upload path (e.g. "images/xxx.webp") into form hidden field
  function insertMedia(mediaPath) {
    const form = getTargetForm();
    if (!form) return;

    // Set hidden crop_image
    let hidden = form.querySelector('input[name="crop_image"]');
    if (!hidden) {
      hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'crop_image';
      form.appendChild(hidden);
    }
    hidden.value = mediaPath;

    // Set image_url or thumbnail_url if present so user sees the text field update as well
    const urlInput = form.querySelector('input[name="image_url"], input[name="thumbnail_url"]');
    if (urlInput) {
      urlInput.value = mediaPath;
    }

    // Clear and un-require any file inputs in this form so browser validation succeeds
    form.querySelectorAll('input[type=file]').forEach(function (inp) {
      inp.removeAttribute('required');
      try { inp.value = ''; } catch (e) {}
    });
  }

  function toast(msg, ok) {
    let t = document.querySelector('.admin-toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'admin-toast';
      document.body.appendChild(t);
    }
    t.innerHTML = (ok ? '<span class="t-ok">✓</span>' : '') + '<span>' + esc(msg) + '</span>';
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(function () { t.classList.remove('show'); }, ok ? 2400 : 3400);
  }

  /* ---------- Controls binding ---------- */
  function bindControls(editor) {
    if (!editor || editor.dataset.mediaBound === '1') return;
    editor.dataset.mediaBound = '1';

    // close
    editor.querySelectorAll('[data-media-close]').forEach(function (b) {
      b.addEventListener('click', closeEditor);
    });

    // tool buttons
    editor.querySelectorAll('[data-tool]').forEach(function (b) {
      b.addEventListener('click', function () { setTool(b.dataset.tool); syncUI(); });
    });

    // aspect presets (in crop tab)
    editor.querySelectorAll('[data-aspect]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.aspect = b.dataset.aspect;
        editor.querySelectorAll('[data-aspect]').forEach(function (x) { x.classList.toggle('active', x === b); });
        if (state.img) {
          applyAspectToCrop();
          if (state.aspect) {
            const ar = aspectRatio();
            if (ar && state.targetW) {
              state.targetH = Math.round(state.targetW / ar);
            }
          }
        }
        syncUI();
      });
    });

    // crop quick actions: center & full
    const btnCenter = editor.querySelector('[data-crop-action="center"]');
    if (btnCenter) {
      btnCenter.addEventListener('click', function () {
        if (!state.img || !state.crop) return;
        const { w, h } = processedDims();
        state.crop.x = clamp(Math.round((w - state.crop.w) / 2), 0, w - state.crop.w);
        state.crop.y = clamp(Math.round((h - state.crop.h) / 2), 0, h - state.crop.h);
        drawPreview();
      });
    }
    const btnFull = editor.querySelector('[data-crop-action="full"]');
    if (btnFull) {
      btnFull.addEventListener('click', function () {
        if (!state.img) return;
        resetCrop();
        drawPreview();
      });
    }

    // size presets (in size tab)
    editor.querySelectorAll('[data-size-preset]').forEach(function (b) {
      b.addEventListener('click', function () {
        const preset = b.dataset.sizePreset;
        state.sizePreset = preset;
        editor.querySelectorAll('[data-size-preset]').forEach(function (x) { x.classList.toggle('active', x === b); });

        if (preset === '1200x675') {
          state.targetW = 1200; state.targetH = 675; state.aspect = '16/9';
        } else if (preset === '800x450') {
          state.targetW = 800; state.targetH = 450; state.aspect = '16/9';
        } else if (preset === '1080x1080') {
          state.targetW = 1080; state.targetH = 1080; state.aspect = '1/1';
        } else if (preset === '600x400') {
          state.targetW = 600; state.targetH = 400; state.aspect = '3/2';
        } else if (preset === '1080x1920') {
          state.targetW = 1080; state.targetH = 1920; state.aspect = '9/16';
        } else if (preset === '1600x600') {
          state.targetW = 1600; state.targetH = 600; state.aspect = '21/9';
        } else if (preset === 'original') {
          state.targetW = 0; state.targetH = 0;
        }

        // Highlight matching aspect in crop tab
        editor.querySelectorAll('[data-aspect]').forEach(function (x) {
          x.classList.toggle('active', x.dataset.aspect === state.aspect);
        });

        if (state.img && state.aspect) applyAspectToCrop();
        syncUI();
      });
    });

    // custom size inputs: width & height
    const inputW = editor.querySelector('[data-dim-w]');
    const inputH = editor.querySelector('[data-dim-h]');
    const btnLock = editor.querySelector('[data-lock-ratio]');

    if (btnLock) {
      btnLock.addEventListener('click', function () {
        state.lockRatio = !state.lockRatio;
        btnLock.classList.toggle('active', state.lockRatio);
      });
    }

    if (inputW) {
      inputW.addEventListener('input', function () {
        const val = parseInt(inputW.value, 10);
        if (!val || val < 16) return;
        state.targetW = val;
        state.sizePreset = 'custom';
        editor.querySelectorAll('[data-size-preset]').forEach(function (x) { x.classList.remove('active'); });
        if (state.lockRatio && state.crop && state.crop.h) {
          const ar = state.crop.w / state.crop.h;
          state.targetH = Math.round(val / ar);
          if (inputH) inputH.value = state.targetH;
        }
        updateSizeReadouts();
      });
    }

    if (inputH) {
      inputH.addEventListener('input', function () {
        const val = parseInt(inputH.value, 10);
        if (!val || val < 16) return;
        state.targetH = val;
        state.sizePreset = 'custom';
        editor.querySelectorAll('[data-size-preset]').forEach(function (x) { x.classList.remove('active'); });
        if (state.lockRatio && state.crop && state.crop.w) {
          const ar = state.crop.w / state.crop.h;
          state.targetW = Math.round(val * ar);
          if (inputW) inputW.value = state.targetW;
        }
        updateSizeReadouts();
      });
    }

    // "Terapkan Dimensi ke Crop" button
    const btnApplyDim = editor.querySelector('[data-apply-custom-size]');
    if (btnApplyDim) {
      btnApplyDim.addEventListener('click', function () {
        if (!state.targetW || !state.targetH) return;
        state.aspect = state.targetW + '/' + state.targetH;
        applyAspectToCrop();
        toast('Area crop disesuaikan dengan proporsi ' + state.targetW + '×' + state.targetH, true);
      });
    }

    // format selector
    const formatSel = editor.querySelector('[data-format-select]');
    if (formatSel) {
      formatSel.addEventListener('change', function () {
        state.format = formatSel.value;
        updateSizeReadouts();
      });
    }

    // quality slider
    const qualRange = editor.querySelector('[data-quality-range]');
    const qualOut = editor.querySelector('[data-quality-out]');
    if (qualRange) {
      qualRange.addEventListener('input', function () {
        state.quality = Number(qualRange.value);
        if (qualOut) qualOut.textContent = state.quality + '%';
        updateSizeReadouts();
      });
    }

    // adjustment sliders
    [
      ['bright', function () { return state.bright; }, function (v) { state.bright = v; }],
      ['contrast', function () { return state.contrast; }, function (v) { state.contrast = v; }],
      ['sat', function () { return state.sat; }, function (v) { state.sat = v; }]
    ].forEach(function (cfg) {
      const input = editor.querySelector('[data-adjust="' + cfg[0] + '"]');
      if (input) {
        input.value = cfg[1]();
        input.addEventListener('input', function () {
          cfg[2](Number(input.value));
          const out = editor.querySelector('[data-adjust-out="' + cfg[0] + '"]');
          if (out) out.textContent = input.value;
          drawPreview();
        });
      }
    });

    // rotate & flip
    editor.querySelectorAll('[data-rotate]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.rot = (state.rot + Number(b.dataset.rotate)) % 360;
        if (state.rot < 0) state.rot += 360;
        resetCrop();
        drawPreview();
      });
    });
    editor.querySelectorAll('[data-flip]').forEach(function (b) {
      b.addEventListener('click', function () {
        const f = b.dataset.flip;
        if (f === 'h') state.flipH = !state.flipH;
        else state.flipV = !state.flipV;
        drawPreview();
      });
    });

    // apply crop
    editor.querySelectorAll('[data-media-apply]').forEach(function (b) {
      b.addEventListener('click', applyCrop);
    });

    // upload into editor (replace source)
    const zone = editor.querySelector('.media-upload-zone [data-upload-image]');
    if (zone) {
      zone.addEventListener('change', function () {
        const f = zone.files[0];
        if (!f) return;
        if (!f.type.startsWith('image/')) { toast('Pilih file gambar', false); zone.value = ''; return; }
        const reader = new FileReader();
        reader.onload = function (ev) { loadImage(ev.target.result); };
        reader.readAsDataURL(f);
        zone.value = '';
      });
    }

    // ---- video frame capture ----
    const videoInput = editor.querySelector('[data-video-input]');
    const videoEl = editor.querySelector('[data-video-el]');
    const frameGrid = editor.querySelector('[data-frame-grid]');
    const timeSlider = editor.querySelector('[data-video-time]');
    const captureBtn = editor.querySelector('[data-video-capture]');
    const selPreview = editor.querySelector('[data-video-selected-preview]');

    if (videoInput && videoEl) {
      videoInput.addEventListener('change', function () {
        const f = videoInput.files[0];
        if (!f) return;
        if (!f.type.startsWith('video/')) { toast('Pilih file video', false); videoInput.value = ''; return; }
        const url = URL.createObjectURL(f);
        videoEl.src = url;
        videoEl.style.display = 'block';
        videoEl.load();
        state.video = videoEl;
        state.frames = [];
        state.selectedFrame = null;
        state.videoUrl = url;
        videoEl.onloadedmetadata = function () {
          if (timeSlider) {
            timeSlider.max = Math.floor(videoEl.duration || 0);
            timeSlider.value = Math.min(1, Math.floor((videoEl.duration || 0) / 2));
          }
          autoFrameGrabs();
        };
        toast('Video dimuat — pilih frame thumbnail', true);
      });

      if (timeSlider) {
        timeSlider.addEventListener('input', function () {
          const t = Number(timeSlider.value);
          if (videoEl && videoEl.duration) videoEl.currentTime = t;
          drawSelectedPreview();
        });
      }
      if (captureBtn) {
        captureBtn.addEventListener('click', function () {
          captureFrameToGrid();
        });
      }
      videoEl.addEventListener('seeked', function () { drawSelectedPreview(); });
      videoEl.addEventListener('timeupdate', function () {
        if (timeSlider && !state._scrubbing) timeSlider.value = Math.min(timeSlider.max, videoEl.currentTime);
        drawSelectedPreview();
      });
    }

    if (frameGrid) {
      frameGrid.addEventListener('click', function (e) {
        const im = e.target.closest('img[data-frame]');
        if (!im) return;
        state.selectedFrame = im.dataset.frame;
        editor.querySelectorAll('[data-frame]').forEach(function (f) { f.classList.toggle('selected', f === im); });
        drawSelectedPreview();
      });
      if (selPreview) {
        selPreview.addEventListener('click', function () { if (state.selectedFrame) useVideoFrameAsImage(); });
      }
      const useBtn = editor.querySelector('[data-use-video-frame]');
      if (useBtn) useBtn.addEventListener('click', function () { if (state.selectedFrame) useVideoFrameAsImage(); });
    }
  }

  function drawSelectedPreview() {
    const editor = state.editor;
    if (!editor) return;
    const vid = state.video;
    const canvas = editor.querySelector('[data-frame-preview-canvas]');
    const selPreview = editor.querySelector('[data-video-selected-preview]');
    if (!vid || !canvas || !selPreview) return;
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');
    try {
      ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
      selPreview.innerHTML = '';
      const im = document.createElement('img');
      im.src = canvas.toDataURL('image/webp', 0.85);
      im.style.cssText = 'width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;';
      selPreview.appendChild(im);
    } catch (e) { /* ignore */ }
  }

  function autoFrameGrabs() {
    const editor = state.editor;
    const vid = state.video;
    const frameGrid = editor.querySelector('[data-frame-grid]');
    if (!vid || !frameGrid) return;

    function grabAt(second) {
      return new Promise(function (resolve) {
        const c = document.createElement('canvas');
        c.width = 160; c.height = 90;
        const ctx = c.getContext('2d');
        const prevT = vid.currentTime;
        vid.currentTime = second;
        vid.onseeked = function () {
          try { ctx.drawImage(vid, 0, 0, c.width, c.height); } catch (e) {}
          const u = c.toDataURL('image/webp', 0.8);
          vid.currentTime = prevT;
          vid.onseeked = null;
          resolve(u);
        };
      });
    }

    const dur = vid.duration || 5;
    const points = [dur * 0.15, dur * 0.35, dur * 0.5, dur * 0.7, dur * 0.85];
    frameGrid.innerHTML = '';
    let p = Promise.resolve();
    points.forEach(function (sec, idx) {
      p = p.then(function () {
        return grabAt(sec).then(function (dataUrl) {
          const img = document.createElement('img');
          img.src = dataUrl;
          img.dataset.frame = dataUrl;
          if (idx === 2) {
            img.classList.add('selected');
            state.selectedFrame = dataUrl;
            drawSelectedPreview();
          }
          img.addEventListener('click', function () {
            state.selectedFrame = dataUrl;
            frameGrid.querySelectorAll('img').forEach(function (x) { x.classList.toggle('selected', x === img); });
            drawSelectedPreview();
          });
          frameGrid.appendChild(img);
        });
      });
    });
  }

  function captureFrameToGrid() {
    const editor = state.editor;
    const vid = state.video;
    const frameGrid = editor.querySelector('[data-frame-grid]');
    if (!vid || !frameGrid) return;
    const c = document.createElement('canvas');
    c.width = 160; c.height = 90;
    const ctx = c.getContext('2d');
    try { ctx.drawImage(vid, 0, 0, c.width, c.height); } catch (e) { return; }
    const url = c.toDataURL('image/webp', 0.85);
    const im = document.createElement('img');
    im.src = url;
    im.dataset.frame = url;
    im.addEventListener('click', function () {
      state.selectedFrame = url;
      frameGrid.querySelectorAll('img').forEach(function (x) { x.classList.toggle('selected', x === im); });
      useVideoFrameAsImage();
    });
    frameGrid.appendChild(im);
    state.selectedFrame = url;
    frameGrid.querySelectorAll('img').forEach(function (x) { x.classList.toggle('selected', x === im); });
    toast('Frame ditangkap', true);
  }

  function useVideoFrameAsImage() {
    const url = state.selectedFrame;
    if (!url) return;
    state.busy = true;
    const editor = state.editor;
    const applyBtn = editor.querySelector('[data-media-apply]');
    if (applyBtn) applyBtn.disabled = true;
    toast('Mengambil thumbnail video...', true);
    fetch('/api/media/crop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl: url })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.busy = false;
        if (applyBtn) applyBtn.disabled = false;
        if (data && data.success) {
          stopCapture();
          insertMedia(data.path);
          toast('Thumbnail video tersimpan', true);
          closeEditor();
          const form = getTargetForm();
          if (form) {
            const drop = form.querySelector('.img-drop .prev');
            if (drop) {
              drop.style.background = 'url(/uploads/' + data.path + ') center/cover no-repeat';
              drop.style.border = '0';
              drop.textContent = '';
            }
          }
        } else {
          toast('Gagal menyimpan thumbnail', false);
        }
      })
      .catch(function () { state.busy = false; if (applyBtn) applyBtn.disabled = false; toast('Kesalahan jaringan', false); });
  }

  function stopCapture() {
    if (state.captureInterval) { clearInterval(state.captureInterval); state.captureInterval = null; }
    if (state.videoUrl) { URL.revokeObjectURL(state.videoUrl); state.videoUrl = null; }
  }

  function syncUI() {
    const editor = state.editor;
    if (!editor) return;
    ['bright', 'contrast', 'sat'].forEach(function (k) {
      const input = editor.querySelector('[data-adjust="' + k + '"]');
      if (input) input.value = state[k];
      const out = editor.querySelector('[data-adjust-out="' + k + '"]');
      if (out) out.textContent = state[k];
    });

    // Sync aspect ratio buttons in crop tab
    editor.querySelectorAll('[data-aspect]').forEach(function (btn) {
      btn.classList.toggle('active', (btn.dataset.aspect || '') === (state.aspect || ''));
    });

    // Sync size preset buttons in size tab
    editor.querySelectorAll('[data-size-preset]').forEach(function (btn) {
      btn.classList.toggle('active', (btn.dataset.sizePreset || '') === (state.sizePreset || ''));
    });

    updateSizeReadouts();
  }

  /* ---------- global hook: open from any "edit image" element ---------- */
  function handleEditImageClick(target) {
    const btn = target.closest('[data-edit-image]');
    if (!btn) return;
    const form = btn.closest('form');
    const editor = (form && form.querySelector('[data-media-editor]')) ||
                   btn.closest('[data-media-editor]') ||
                   document.querySelector('[data-media-editor]');
    if (!editor) return;

    const dropInput = form ? form.querySelector('.img-drop input[type=file]') : null;
    let src = btn.dataset.editImage;
    if (!src && dropInput && dropInput.files && dropInput.files[0]) {
      src = URL.createObjectURL(dropInput.files[0]);
    } else if (!src && (btn.dataset.preview || '')) {
      src = btn.dataset.preview;
    }

    if (!src && dropInput) {
      dropInput.click();
      return;
    }

    openEditor(editor, src, form);
  }

  document.addEventListener('click', function (e) {
    handleEditImageClick(e.target);
  });

  /* ========================================================================
     Video Thumbnail Source Picker (YouTube / TikTok / Local frame)
     ======================================================================== */
  const VP = NS.videoPicker = {
    bind() {
      document.querySelectorAll('[data-video-picker]').forEach(function (picker) {
        if (picker.dataset.vpBound === '1') return;
        picker.dataset.vpBound = '1';
        VP.initPicker(picker);
      });
    },

    initPicker(picker) {
      const urlInput = picker.querySelector('[data-vp-url]');
      const fetchBtn = picker.querySelector('[data-vp-fetch]');
      const previewBox = picker.querySelector('[data-vp-preview]');
      const hideIfNoUrl = picker.querySelectorAll('[data-vp-requires-url]');
      const thumbInput = picker.querySelector('[data-vp-thumb]');
      if (!urlInput || !fetchBtn) return;

      const showNothing = function () {
        if (previewBox) previewBox.innerHTML = '';
      };

      function setHide(show) {
        hideIfNoUrl.forEach(function (el) { el.style.display = show ? '' : 'none'; });
      }

      function renderThumb(thumbPath, meta) {
        if (!previewBox) return;
        previewBox.innerHTML = '';
        const row = document.createElement('div');
        row.className = 'vt-result';
        const img = document.createElement('img');
        img.src = thumbPath.indexOf('/uploads/') === -1 ? '/uploads/' + thumbPath : thumbPath;
        img.alt = 'Thumbnail video';
        row.appendChild(img);
        const srcBox = document.createElement('div');
        srcBox.className = 'vt-source';
        const plat = meta.type === 'youtube' ? 'YouTube' : meta.type === 'tiktok' ? 'TikTok' : 'Video';
        srcBox.innerHTML = '<b>' + esc(plat) + ' · thumbnail otomatis</b>' +
          '<span style="font-size:11.5px;color:var(--a-muted)">Klik simpan untuk menggunakan gambar ini, atau pilih frame lain di atas.</span>';
        row.appendChild(srcBox);
        previewBox.appendChild(row);

        if (thumbInput) {
          thumbInput.value = thumbPath;
          insertCropOnly(thumbPath);
        }
      }

      function insertCropOnly(path) {
        const form = picker.closest('form');
        if (!form) return;
        let hidden = form.querySelector('input[name="crop_image"]');
        if (!hidden) {
          hidden = document.createElement('input');
          hidden.type = 'hidden';
          hidden.name = 'crop_image';
          form.appendChild(hidden);
        }
        hidden.value = path;
      }

      fetchBtn.addEventListener('click', function () {
        const urlVal = urlInput.value.trim();
        setHide(false);
        showNothing();
        if (!urlVal) {
          toast('Masukkan link YouTube / TikTok terlebih dahulu', false);
          setHide(true);
          return;
        }
        fetchBtn.disabled = true;
        const original = fetchBtn.innerHTML;
        fetchBtn.innerHTML = '<span class="vt-meta-spin"></span> Memeriksa...';

        fetch('/api/video/meta?url=' + encodeURIComponent(urlVal))
          .then(function (r) { return r.json(); })
          .then(function (data) {
            fetchBtn.disabled = false;
            fetchBtn.innerHTML = original;
            if (!data || !data.success) {
              toast(data && data.error ? data.error : 'Video tidak dikenali. Coba link YouTube/TikTok.', false);
              setHide(true);
              return;
            }
            return fetch('/api/video/thumb', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: urlVal })
            })
              .then(function (r2) { return r2.json(); })
              .then(function (td) {
                if (!td.success) {
                  toast(td.error || 'Thumbnail tidak tersedia', false);
                  setHide(true);
                  return;
                }
                renderThumb(td.thumb, td.meta);
                const titleInput = picker.closest('form') ? picker.closest('form').querySelector('input[name="title"]') : null;
                if (titleInput && !titleInput.value.trim() && data.title) {
                  titleInput.value = data.title;
                  toast('Judul terisi otomatis', true);
                }
                setHide(false);
              });
          })
          .catch(function () {
            fetchBtn.disabled = false;
            fetchBtn.innerHTML = original;
            toast('Kesalahan jaringan saat cek video', false);
            setHide(true);
          });
      });

      urlInput.addEventListener('input', function () { setHide(!urlInput.value.trim()); });
      setHide(!urlInput.value.trim());
    }
  };

  document.addEventListener('DOMContentLoaded', function () { VP.bind(); });

  /* ================= Public API ================= */
  NS.toast = toast;
  NS.open = openEditor;
  NS.close = closeEditor;
  NS.useVideoFrame = useVideoFrameAsImage;
  NS.loadImage = loadImage;
  NS.resetState = resetState;
  NS.videoPicker = VP;
})();