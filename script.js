const menu = document.querySelector('.menu');
const nav = document.querySelector('#nav');

menu.addEventListener('click', () => {
  nav.classList.toggle('open');

  const isOpen = nav.classList.contains('open');
  menu.setAttribute('aria-expanded', isOpen);
});

nav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    if (window.innerWidth <= 850) {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
    }
  });
});


/* =====================================================================
   RUANG CERITA (Konsultansi)
   Kode di atas (menu navbar) TIDAK diubah.
===================================================================== */
(() => {
  'use strict';

  /* ============ KONFIGURASI — WAJIB DIISI ============
     Ambil dari Supabase: Project Settings → API
     - Project URL        → SUPABASE_URL
     - anon / public key  → SUPABASE_ANON_KEY
     (anon key memang aman untuk frontend; JANGAN pernah memakai service_role key di sini)
  ====================================================== */
  const SUPABASE_URL = 'YOUR_SUPABASE_URL';          // contoh bentuk: https://xxxx.supabase.co
  const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

  const NAME_MAX = 50;
  const MESSAGE_MAX = 1500;
  const STORY_LIMIT = 30;

  const configured =
    !SUPABASE_URL.startsWith('YOUR_') && !SUPABASE_ANON_KEY.startsWith('YOUR_');

  const $ = (id) => document.getElementById(id);
  const form = $('storyForm');
  if (!form) return;

  const nameInput = $('storyName');
  const msgInput = $('storyMessage');
  const consent = $('storyConsent');
  const honeypot = $('storyWebsite');
  const counter = $('storyCounter');
  const submitBtn = $('storySubmit');
  const label = submitBtn.querySelector('.btn-label');
  const alertBox = $('storyAlert');
  const dialog = $('thanksDialog');
  const list = $('storyList');
  const emptyMsg = $('storyEmpty');

  const headers = () => ({
    apikey: SUPABASE_ANON_KEY,
    Authorization: 'Bearer ' + SUPABASE_ANON_KEY
  });

  /* ---------- Validasi ---------- */
  const rules = [
    {
      input: nameInput, error: $('storyNameError'),
      check: (v) => v.trim() === '' ? 'Silakan masukkan nama atau nama panggilanmu.' : ''
    },
    {
      input: msgInput, error: $('storyMessageError'),
      check: (v) => {
        if (v.trim() === '') return 'Silakan ceritakan apa yang sedang kamu rasakan.';
        if (v.length > MESSAGE_MAX) return 'Ceritamu terlalu panjang. Maksimal ' + MESSAGE_MAX + ' karakter.';
        return '';
      }
    },
    {
      input: consent, error: $('storyConsentError'),
      check: () => consent.checked ? '' : 'Kamu perlu menyetujui ketentuan sebelum mengirim cerita.'
    }
  ];

  function validateField(rule) {
    const msg = rule.check(rule.input.value);
    rule.error.textContent = msg;
    if (msg) rule.input.setAttribute('aria-invalid', 'true');
    else rule.input.removeAttribute('aria-invalid');
    return !msg;
  }

  function validateAll() {
    let firstBad = null;
    rules.forEach((r) => {
      if (!validateField(r) && !firstBad) firstBad = r.input;
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  // validasi ulang saat pengguna memperbaiki isian
  rules.forEach((r) => {
    const evt = r.input.type === 'checkbox' ? 'change' : 'input';
    r.input.addEventListener(evt, () => {
      if (r.input.getAttribute('aria-invalid') === 'true') validateField(r);
    });
  });

  msgInput.addEventListener('input', () => {
    const n = msgInput.value.length;
    counter.textContent = n + ' / ' + MESSAGE_MAX;
    counter.classList.toggle('near', n >= MESSAGE_MAX * 0.9);
  });

  /* ---------- Status tombol ---------- */
  let isSubmitting = false;

  function setLoading(on) {
    isSubmitting = on;
    submitBtn.disabled = on;
    submitBtn.classList.toggle('is-loading', on);
    submitBtn.setAttribute('aria-busy', on ? 'true' : 'false');
    label.textContent = on ? 'Mengirim...' : 'Kirim Cerita';
  }

  function showAlert(text) {
    alertBox.textContent = text;
    alertBox.hidden = false;
  }

  function hideAlert() {
    alertBox.hidden = true;
    alertBox.textContent = '';
  }

  /* ---------- Kirim ---------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    hideAlert();
    if (!validateAll()) return;

    // Bot mengisi honeypot → pura-pura sukses, tidak dikirim
    if (honeypot.value) {
      form.reset();
      dialog.showModal();
      return;
    }

    setLoading(true);
    try {
      if (!configured) throw new Error('Supabase belum dikonfigurasi di script.js');

      const res = await fetch(SUPABASE_URL + '/rest/v1/consultations', {
        method: 'POST',
        headers: {
          ...headers(),
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          name: nameInput.value.trim().slice(0, NAME_MAX),
          message: msgInput.value.trim()
        })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);

      // Sukses: kosongkan form tanpa reload halaman
      form.reset();
      counter.textContent = '0 / ' + MESSAGE_MAX;
      counter.classList.remove('near');
      rules.forEach((r) => { r.error.textContent = ''; r.input.removeAttribute('aria-invalid'); });
      dialog.showModal();
    } catch (err) {
      console.error('[Ruang Cerita]', err);
      // Isi form TIDAK dihapus agar bisa dicoba lagi
      showAlert('Maaf, cerita kamu belum berhasil dikirim. Silakan coba lagi beberapa saat.');
    } finally {
      setLoading(false);
    }
  });

  /* ---------- Modal ---------- */
  $('thanksClose').addEventListener('click', () => {
    dialog.close();
    submitBtn.focus();
  });
  // klik area gelap (backdrop) menutup modal
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  /* ---------- Cerita yang sudah approved ---------- */
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text; // textContent = aman dari XSS
    return n;
  }

  function renderStory(s) {
    const col = el('div', 'col-12 col-md-6 col-lg-4 reveal');
    const card = el('article', 'story-item');

    const q = el('span', 'quote-icon');
    const qi = el('i', 'bi bi-quote'); qi.setAttribute('aria-hidden', 'true');
    q.appendChild(qi);

    const h = el('h4');
    const hi = el('i', 'bi bi-heart-fill'); hi.setAttribute('aria-hidden', 'true');
    h.appendChild(hi);
    h.appendChild(document.createTextNode(' ' + s.name));

    card.append(q, h, el('p', '', s.message));
    col.appendChild(card);
    return col;
  }

  async function loadStories() {
    if (!configured) return; // belum dikonfigurasi → data dummy tetap tampil
    try {
      const url = SUPABASE_URL + '/rest/v1/approved_stories?select=name,message&limit=' + STORY_LIMIT;
      const res = await fetch(url, { headers: headers() });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const rows = await res.json();

      list.innerHTML = ''; // buang data dummy
      if (!rows.length) { emptyMsg.hidden = false; return; }
      rows.forEach((r) => list.appendChild(renderStory({ name: r.name, message: r.message })));
      observeReveal();
    } catch (err) {
      console.error('[Ruang Cerita] gagal memuat cerita', err);
      list.innerHTML = '';
      emptyMsg.textContent = 'Cerita belum dapat dimuat saat ini. Silakan kembali beberapa saat lagi.';
      emptyMsg.hidden = false;
    }
  }

  /* ---------- Animasi masuk ringan ---------- */
  let io = null;
  function observeReveal() {
    const items = document.querySelectorAll('#consultation .reveal:not(.in)');
    if (!('IntersectionObserver' in window)) { items.forEach((i) => i.classList.add('in')); return; }
    io = io || new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    items.forEach((i) => io.observe(i));
  }

  document.querySelectorAll(
    '#consultation .consult-info, #consultation .story-card, #consultation .consult-disclaimer, #consultation .stories-head, #consultation [data-dummy]'
  ).forEach((n) => n.classList.add('reveal'));
  observeReveal();

  loadStories();
})();
