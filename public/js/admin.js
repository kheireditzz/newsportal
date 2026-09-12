/* ==========================================================================
   Nusantara News — Admin Console JS
   Includes: mobile sidebar, image drops, confirm forms, slug auto-gen,
             Sortable list reorder (pointer-based) for all content tables.
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- Toast ---------- */
  function adminToast(msg, ok) {
    let toast = document.querySelector('.admin-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'admin-toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    const icon = ok
      ? '<span class="t-ok"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>'
      : '';
    toast.innerHTML = icon + '<span>' + msg + '</span>';
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toast.classList.remove('show'); }, ok ? 2200 : 3200);
  }

  /* ---------- Sidebar & mobile ---------- */
  function initSidebar() {
    const menu = document.querySelector('.admin-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (!menu || !sidebar) return;
    menu.addEventListener('click', function () {
      if (window.innerWidth <= 860) {
        sidebar.classList.toggle('open');
        let bd = document.querySelector('.sidebar-backdrop');
        if (!bd) {
          bd = document.createElement('div');
          bd.className = 'sidebar-backdrop';
          document.body.appendChild(bd);
        }
        const open = sidebar.classList.contains('open');
        bd.classList.toggle('visible', open);
        bd.onclick = function () { sidebar.classList.remove('open'); bd.classList.remove('visible'); };
      } else {
        const shell = document.querySelector('.admin-shell');
        if (shell) shell.classList.toggle('sidebar-collapsed');
      }
    });
  }

  /* ---------- Image drop preview ---------- */
  function initImageDrops() {
    document.querySelectorAll('.img-drop').forEach(function (drop) {
      const input = drop.querySelector('input[type=file]');
      const prev = drop.querySelector('.prev');
      if (!input) return;
      drop.addEventListener('click', function (e) {
        if (e.target.tagName !== 'INPUT') input.click();
      });
      input.addEventListener('change', function () {
        const f = input.files[0];
        if (!f) return;
        if (f.type.startsWith('image/') && prev) {
          const url = URL.createObjectURL(f);
          prev.style.background = 'url(' + url + ') center/cover no-repeat';
          prev.style.border = '0';
          prev.textContent = '';
          const form = drop.closest('form');
          const editBtn = form ? form.querySelector('[data-edit-image]') : null;
          if (editBtn) {
            editBtn.dataset.editImage = url;
            editBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/><path d="m15 5 4 4"/></svg> ✂️ Crop & Atur Ukuran';
            editBtn.classList.remove('btn-ghost');
            editBtn.classList.add('btn-primary');
          }
        } else if (prev) {
          prev.textContent = f.name;
        }
      });
    });
  }

  /* ---------- Confirm forms (custom modal, no browser confirm) ---------- */
  function initConfirmForms() {
    document.addEventListener('submit', function (e) {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;
      const msg = form.getAttribute('data-confirm');
      if (msg === null || msg === undefined) return;

      const firstCall = !form._confirmAsked;
      if (firstCall) {
        e.preventDefault();
        form._confirmAsked = true;
        showConfirmDialog(msg, function () {
          form._confirmAsked = false;
          form.submit();
        }, function () {
          form._confirmAsked = false;
        });
      }
    });
  }

  function showConfirmDialog(message, onOk, onCancel) {
    let modal = document.getElementById('adminConfirmModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'adminConfirmModal';
      modal.className = 'confirm-modal';
      modal.innerHTML =
        '<div class="confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle" aria-describedby="confirmMsg">' +
        '  <button type="button" class="confirm-close" aria-label="Tutup"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
        '  <div class="confirm-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>' +
        '  <h3 id="confirmTitle">Konfirmasi Tindakan</h3>' +
        '  <p id="confirmMsg" class="confirm-msg"></p>' +
        '  <div class="confirm-actions">' +
        '    <button type="button" class="btn btn-ghost" data-confirm-cancel>Batal</button>' +
        '    <button type="button" class="btn btn-danger" data-confirm-ok>Ya, Lanjutkan</button>' +
        '  </div>' +
        '</div>';
      document.body.appendChild(modal);
    }
    modal.querySelector('#confirmMsg').textContent = message;
    modal.classList.add('open');

    const okBtn = modal.querySelector('[data-confirm-ok]');
    const cancelBtn = modal.querySelector('[data-confirm-cancel]');
    const closeBtn = modal.querySelector('.confirm-close');

    function cleanup(ok) {
      modal.classList.remove('open');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      closeBtn.onclick = null;
      document.removeEventListener('keydown', keyHandler);
      modal.onclick = null;
      if (ok) { onOk && onOk(); }
    }

    function keyHandler(e) {
      if (e.key === 'Escape') cleanup(false);
      if (e.key === 'Enter') cleanup(true);
    }

    okBtn.onclick = function () { cleanup(true); };
    // Avoid double-submit: re-enable via onOk wrapper
    cancelBtn.onclick = function () { cleanup(false); if (onCancel) onCancel(); };
    closeBtn.onclick = function () { cleanup(false); if (onCancel) onCancel(); };
    modal.onclick = function (e) { if (e.target === modal) cleanup(false); };
    document.addEventListener('keydown', keyHandler);
    setTimeout(function () { okBtn.focus(); }, 60);
  }

  /* ---------- Slug autogen ---------- */
  function initAutoSlug() {
    const src = document.querySelector('[data-slug-source]');
    const dst = document.querySelector('[data-slug-target]');
    if (!src || !dst) return;
    function makeSlug(v) {
      return String(v).toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
    }
    src.addEventListener('input', function () {
      if (dst.dataset.touched === '1') return;
      dst.value = makeSlug(src.value);
    });
    dst.addEventListener('input', function () {
      dst.dataset.touched = '1';
    });
  }

  /* ========================================================================
     Sortable list — pointer-event drag & drop reorder
     ======================================================================== */
  function initSortables() {
    document.querySelectorAll('[data-sortable]').forEach(function (el) {
      if (el.dataset.sortableInit === '1') return;
      el.dataset.sortableInit = '1';
      makeSortable(el);
    });
  }

  function makeSortable(listEl) {
    const url = listEl.dataset.sortableUrl;
    if (!url) return;

    let items = Array.prototype.slice.call(listEl.querySelectorAll(':scope > .sortable-item'));
    let active = false;      // a drag is in progress
    let dragEl = null;
    let dragHandle = null;
    let ghost = null;
    let dropZone = null;     // element we'll insert before/after

    function onDragDone() {
      active = false;
      listEl.classList.remove('sorting');
      document.body.classList.remove('dragging-sort');
      if (ghost) { ghost.remove(); ghost = null; }
      items.forEach(function (it) { it.classList.remove('dragging', 'drag-before', 'drag-after'); });
    }

    function findInsertTarget(clientY) {
      let target = null;
      items.forEach(function (it) {
        if (it === dragEl) return;
        const r = it.getBoundingClientRect();
        if (clientY >= r.top && clientY <= r.bottom) {
          if (!target || clientY < target.r + (target.r - target.top) / 2) {
            target = { el: it, after: clientY > (r.top + r.bottom) / 2 };
          }
        }
      });
      // if pointer above first item
      if (!target && items.length) {
        const first = items[0] === dragEl ? items[1] : items[0];
        if (first) {
          const r = first.getBoundingClientRect();
          if (clientY < r.top) target = { el: first, after: false };
        }
        const last = items[items.length - 1] === dragEl ? items[items.length - 2] : items[items.length - 1];
        if (last && !target) {
          const r = last.getBoundingClientRect();
          if (clientY > r.bottom) target = { el: last, after: true };
        }
      }
      return target;
    }

    function buildGhost() {
      ghost = document.createElement('div');
      ghost.className = 'drag-copy';
      const thumb = dragEl.querySelector('img.thumb, .cell-title .thumb');
      const titleEl = dragEl.querySelector('b, .cell-title b, .sort-title');
      const row = document.createElement('div');
      row.className = 'dc-row';
      if (titleEl) {
        const t = document.createElement('div');
        t.className = 'dc-title';
        t.textContent = titleEl.textContent;
        row.appendChild(t);
      }
      ghost.appendChild(row);
      if (thumb) {
        const im = document.createElement('img');
        im.src = thumb.src;
        im.alt = '';
        im.style.cssText = 'width:50px;height:36px;object-fit:cover;border-radius:8px;order:-1';
        ghost.prepend(im);
      }
      document.body.appendChild(ghost);
    }

    function placeGhost(e) {
      if (!ghost) return;
      ghost.style.left = (e.clientX - 20) + 'px';
      ghost.style.top = (e.clientY - ghost.offsetHeight - 16) + 'px';
    }

    function onPointerMove(e) {
      if (!active) return;
      if (e.cancelable) e.preventDefault();
      placeGhost(e);

      items.forEach(function (it) { it.classList.remove('drag-before', 'drag-after'); });
      const t = findInsertTarget(e.clientY);
      if (t) {
        t.el.classList.add(t.after ? 'drag-after' : 'drag-before');
        dropZone = t;
      } else {
        dropZone = null;
      }
    }

    function onPointerUp() {
      if (!active) return;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      const from = items.indexOf(dragEl);
      let to = -1;
      if (dropZone) {
        const zi = items.indexOf(dropZone.el);
        to = dropZone.after ? zi + 1 : zi;
      }
      onDragDone();
      if (from >= 0 && to >= 0 && to !== from && to !== from + 1) {
        commitReorder(from, to);
      }
    }

    function commitReorder(from, to) {
      const moved = items[from];
      const reordered = items.slice();
      reordered.splice(from, 1);
      reordered.splice(to, 0, moved);
      const ids = reordered.map(function (it) { return Number(it.dataset.sortId); });

      // Reorder DOM to match
      reordered.forEach(function (it) {
        listEl.appendChild(it);
      });
      items = reordered;

      const footer = listEl.parentElement ? listEl.parentElement.querySelector('.sortable-footer') : null;
      listEl.classList.add('dirty');
      if (footer) footer.classList.add('dirty');

      // Optimistic save
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: ids })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.success) {
            listEl.classList.remove('dirty');
            if (footer) footer.classList.remove('dirty');
            adminToast('Urutan tersimpan', true);
          } else {
            listEl.classList.remove('dirty');
            if (footer) footer.classList.remove('dirty');
            adminToast('Gagal menyimpan urutan', false);
          }
        })
        .catch(function () {
          listEl.classList.remove('dirty');
          if (footer) footer.classList.remove('dirty');
          adminToast('Terjadi kesalahan saat menyimpan', false);
        });
    }

    function wireHandle(item) {
      const handle = item.querySelector('.drag-handle');
      if (!handle || handle.getAttribute('data-wired')) return;
      handle.setAttribute('data-wired', '1');
      handle.addEventListener('pointerdown', function (e) {
        if (e.button !== undefined && e.button !== 0) return;
        if (e.target.closest && e.target.closest('a, button, input, select, textarea')) {
          // still allow, but prevent default text selection
        }
        e.preventDefault();
        active = true;
        dragEl = item;
        dragHandle = handle;
        listEl.classList.add('sorting');
        document.body.classList.add('dragging-sort');
        item.classList.add('dragging');
        buildGhost();
        try { handle.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
        window.addEventListener('pointermove', onPointerMove, { passive: false });
        window.addEventListener('pointerup', onPointerUp);
      });
    }

    // reselect handles after DOM mutations
    function resync() {
      items = Array.prototype.slice.call(listEl.querySelectorAll(':scope > .sortable-item'));
    }

    const mo = new MutationObserver(function () {
      resync();
      items.forEach(wireHandle);
    });
    mo.observe(listEl, { childList: true });
    items.forEach(wireHandle);
  }

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    initSidebar();
    initImageDrops();
    initConfirmForms();
    initAutoSlug();
    initSortables();
  });
})();