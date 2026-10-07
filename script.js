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

/* =====================================================
   RUANG CERITA (KONSULTANSI)
   Penyimpanan: Firebase Firestore (diakses dari script.js)

   LANGKAH SETUP: isi FIREBASE_CONFIG di bawah dengan
   konfigurasi web app dari Firebase Console
   (Project settings > Your apps > Web app). Konfigurasi ini
   AMAN berada di frontend; keamanan data diatur oleh
   Firestore Security Rules berikut (tempel di tab Rules):

   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /stories/{id} {
         allow read: if resource.data.status == 'approved';
         allow create: if request.resource.data.keys().hasOnly(['name','text','status','createdAt'])
           && request.resource.data.status == 'pending'
           && request.resource.data.name is string
           && request.resource.data.name.size() > 0 && request.resource.data.name.size() <= 60
           && request.resource.data.text is string
           && request.resource.data.text.size() > 0 && request.resource.data.text.size() <= 2000
           && request.resource.data.createdAt == request.time;
         allow update, delete: if false;
       }
       match /replies/{id} {
         allow read: if resource.data.status == 'approved';
         allow create: if request.resource.data.keys().hasOnly(['storyId','name','text','status','isTeam','createdAt'])
           && request.resource.data.status == 'pending'
           && request.resource.data.isTeam == false
           && request.resource.data.storyId is string
           && request.resource.data.name is string
           && request.resource.data.name.size() > 0 && request.resource.data.name.size() <= 60
           && request.resource.data.text is string
           && request.resource.data.text.size() > 0 && request.resource.data.text.size() <= 1000
           && request.resource.data.createdAt == request.time;
         allow update, delete: if false;
       }
     }
   }
   ===================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyAfSvbvEzlfTNRY4qbbw3VW3TIhweJ1UAA",
  authDomain: "depresive.firebaseapp.com",
  databaseURL: "https://depresive-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "depresive",
  storageBucket: "depresive.firebasestorage.app",
  messagingSenderId: "430803922436",
  appId: "1:430803922436:web:2d7b929d8fdd26964acf51",
};

(function storyRoom() {
  const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const form = document.getElementById('storyForm');
  const listEl = document.getElementById('storyList');
  if (!form || !listEl) return;

  const nameEl = document.getElementById('storyName');
  const textEl = document.getElementById('storyText');
  const consentEl = document.getElementById('storyConsent');
  const submitBtn = document.getElementById('storySubmit');
  const statusEl = document.getElementById('storyStatus');
  const successEl = document.getElementById('storySuccess');
  const countEl = document.getElementById('storyCount');
  const errName = document.getElementById('storyNameError');
  const errText = document.getElementById('storyTextError');
  const errConsent = document.getElementById('storyConsentError');

  const configured = !FIREBASE_CONFIG.apiKey.startsWith('ISI_');
  const stories = new Map();   // id -> {name, text, createdAt}
  const replies = new Map();   // storyId -> [{name, text, isTeam, createdAt}]
  const cards = new Map();     // id -> element
  let firstLoad = true;
  let db, fs;

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const ms = (t) => (t && t.toMillis ? t.toMillis() : 0);

  const setStatus = (msg, isError) => {
    statusEl.textContent = msg || '';
    statusEl.classList.toggle('error', !!isError);
  };

  const emptyMsg = (msg) => {
    cards.forEach((c) => c.remove());
    cards.clear();
    listEl.replaceChildren(el('p', 'story-empty', msg));
  };

  /* ---------- Tampilan ---------- */

  function renderReplies(storyId) {
    const card = cards.get(storyId);
    if (!card) return;
    const box = card.querySelector('.story-replies');
    const items = (replies.get(storyId) || []).slice().sort((a, b) =>
      (b.isTeam - a.isTeam) || (ms(a.createdAt) - ms(b.createdAt)));
    box.replaceChildren(...items.map((r) => {
      const d = el('div', 'reply' + (r.isTeam ? ' team' : ''));
      d.appendChild(el('p', 'reply-name', r.isTeam ? '💙 Tim Depressive Feelings' : r.name));
      d.appendChild(el('p', 'reply-text', r.text));
      return d;
    }));
    box.hidden = items.length === 0;
  }

  function buildCard(id, s) {
    const card = el('article', 'story-card');
    if (!firstLoad) {
      card.classList.add('is-new');
      setTimeout(() => card.classList.remove('is-new'), 4000);
    }
    const author = el('div', 'story-author');
    author.appendChild(el('span', 'dot', '💬'));
    author.appendChild(el('span', '', s.name));
    card.appendChild(author);
    card.appendChild(el('p', 'story-body', '“' + s.text + '”'));

    const box = el('div', 'story-replies');
    card.appendChild(box);

    const toggle = el('button', 'reply-toggle', 'Balas');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    card.appendChild(toggle);

    const rf = el('form', 'reply-form');
    rf.hidden = true;
    rf.noValidate = true;
    const n1 = `rn-${id}`, t1 = `rt-${id}`;
    rf.innerHTML = `
      <label for="${n1}">Nama / Nama Panggilan</label>
      <input type="text" id="${n1}" maxlength="60" placeholder="Masukkan nama atau nama panggilanmu..." autocomplete="nickname">
      <label for="${t1}">Balasanmu</label>
      <textarea id="${t1}" maxlength="1000" placeholder="Tuliskan balasan yang baik dan menguatkan..."></textarea>
      <button type="submit" class="btn primary">Kirim Balasan</button>
      <p class="reply-note" role="status" aria-live="polite"></p>`;
    card.appendChild(rf);

    toggle.addEventListener('click', () => {
      const open = rf.hidden;
      rf.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open) rf.querySelector('input').focus();
    });

    rf.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nm = rf.querySelector('input');
      const tx = rf.querySelector('textarea');
      const btn = rf.querySelector('button');
      const note = rf.querySelector('.reply-note');
      if (!nm.value.trim() || !tx.value.trim()) {
        note.textContent = 'Mohon isi nama dan balasanmu terlebih dahulu.';
        return;
      }
      btn.disabled = true;
      note.textContent = 'Mengirim balasan...';
      try {
        await fs.addDoc(fs.collection(db, 'replies'), {
          storyId: id,
          name: nm.value.trim(),
          text: tx.value.trim(),
          status: 'pending',
          isTeam: false,
          createdAt: fs.serverTimestamp()
        });
        tx.value = '';
        note.textContent = 'Terima kasih 🤍 Balasanmu akan diperiksa terlebih dahulu sebelum ditampilkan.';
      } catch (err) {
        note.textContent = 'Maaf, balasan gagal dikirim. Silakan coba lagi.';
      }
      btn.disabled = false;
    });

    cards.set(id, card);
    renderReplies(id);
    return card;
  }

  function renderStories() {
    if (stories.size === 0) {
      emptyMsg('Belum ada cerita yang ditampilkan. Kamu bisa menjadi yang pertama bercerita 🤍');
      return;
    }
    listEl.querySelector('.story-empty')?.remove();
    cards.forEach((c, id) => { if (!stories.has(id)) { c.remove(); cards.delete(id); } });
    const sorted = [...stories.entries()].sort((a, b) => ms(b[1].createdAt) - ms(a[1].createdAt));
    sorted.forEach(([id, s]) => {
      const card = cards.get(id) || buildCard(id, s);
      listEl.appendChild(card); // memindahkan node tanpa menghapus isi form balasan
    });
    firstLoad = false;
  }

  /* ---------- Validasi & kirim cerita ---------- */

  textEl.addEventListener('input', () => {
    countEl.textContent = `${textEl.value.length} / 2000`;
  });

  function validate() {
    let ok = true;
    errName.textContent = errText.textContent = errConsent.textContent = '';
    if (!nameEl.value.trim()) { errName.textContent = 'Mohon isi nama atau nama panggilanmu.'; ok = false; }
    if (!textEl.value.trim()) { errText.textContent = 'Mohon tuliskan ceritamu terlebih dahulu.'; ok = false; }
    if (!consentEl.checked) { errConsent.textContent = 'Mohon centang persetujuan untuk melanjutkan.'; ok = false; }
    if (!ok) (!nameEl.value.trim() ? nameEl : !textEl.value.trim() ? textEl : consentEl).focus();
    return ok;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    successEl.hidden = true;
    setStatus('');
    if (!validate()) return;
    if (!configured) {
      setStatus('Ruang Cerita belum aktif. Silakan coba lagi nanti.', true);
      return;
    }
    let last = 0;
    try { last = Number(localStorage.getItem('rc_last') || 0); } catch (_) {}
    if (Date.now() - last < 30000) {
      setStatus('Mohon tunggu sebentar sebelum mengirim cerita lagi.', true);
      return;
    }
    submitBtn.disabled = true;
    setStatus('Mengirim cerita...');
    try {
      await fs.addDoc(fs.collection(db, 'stories'), {
        name: nameEl.value.trim(),
        text: textEl.value.trim(),
        status: 'pending',
        createdAt: fs.serverTimestamp()
      });
      try { localStorage.setItem('rc_last', String(Date.now())); } catch (_) {}
      setStatus('Cerita berhasil dikirim 🤍');
      successEl.hidden = false;
      form.reset();
      countEl.textContent = '0 / 2000';
    } catch (err) {
      // Teks cerita sengaja tidak dihapus bila gagal
      setStatus('Maaf, cerita gagal dikirim. Silakan coba lagi.', true);
    }
    submitBtn.disabled = false;
  });

  /* ---------- Firebase (real-time) ---------- */

  if (!configured) {
    emptyMsg('Ruang Cerita akan segera dibuka. Terima kasih sudah menunggu 🤍');
    return;
  }

  (async () => {
    try {
      const [appMod, fsMod] = await Promise.all([
        import(FB + 'firebase-app.js'),
        import(FB + 'firebase-firestore.js')
      ]);
      fs = fsMod;
      db = fs.getFirestore(appMod.initializeApp(FIREBASE_CONFIG));

      fs.onSnapshot(fs.query(fs.collection(db, 'stories'), fs.where('status', '==', 'approved')), (snap) => {
        stories.clear();
        snap.forEach((d) => stories.set(d.id, d.data()));
        renderStories();
      }, () => emptyMsg('Maaf, cerita belum dapat dimuat. Silakan muat ulang halaman.'));

      fs.onSnapshot(fs.query(fs.collection(db, 'replies'), fs.where('status', '==', 'approved')), (snap) => {
        replies.clear();
        snap.forEach((d) => {
          const r = d.data();
          if (!replies.has(r.storyId)) replies.set(r.storyId, []);
          replies.get(r.storyId).push(r);
        });
        cards.forEach((_, id) => renderReplies(id));
      }, () => {});
    } catch (err) {
      emptyMsg('Maaf, cerita belum dapat dimuat. Silakan muat ulang halaman.');
    }
  })();
})();
