const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const db = require('./database');

const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'images');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const palettes = [
  ['#0f172a', '#2563eb', '#38bdf8'],
  ['#1e1b4b', '#7c3aed', '#c084fc'],
  ['#0c4a6e', '#0891b2', '#22d3ee'],
  ['#4c0519', '#e11d48', '#fb7185'],
  ['#14532d', '#16a34a', '#4ade80'],
  ['#78350f', '#f59e0b', '#fbbf24'],
  ['#3b0764', '#a21caf', '#e879f9'],
  ['#0f172a', '#334155', '#94a3b8']
];

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function makeCover(filename, label, tag, seed = 0) {
  const p = palettes[seed % palettes.length];
  const words = String(label).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > 26) { lines.push(cur.trim()); cur = w; }
    else cur += ' ' + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  const shown = lines.slice(0, 3);
  const tspans = shown.map((l, i) =>
    `<tspan x="60" dy="${i === 0 ? 0 : 62}">${esc(l)}</tspan>`
  ).join('');
  const startY = 360 - (shown.length - 1) * 31;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${p[0]}"/>
      <stop offset="0.55" stop-color="${p[1]}"/>
      <stop offset="1" stop-color="${p[2]}"/>
    </linearGradient>
    <radialGradient id="r" cx="0.8" cy="0.2" r="0.8">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.25"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#g)"/>
  <rect width="1200" height="675" fill="url(#r)"/>
  <g opacity="0.12" stroke="#ffffff" stroke-width="2" fill="none">
    <circle cx="1050" cy="120" r="180"/>
    <circle cx="1050" cy="120" r="120"/>
    <circle cx="120" cy="600" r="150"/>
  </g>
  <rect x="60" y="${startY - 78}" width="${tag.length * 16 + 44}" height="46" rx="23" fill="#ffffff" opacity="0.92"/>
  <text x="${60 + 22}" y="${startY - 46}" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="700" fill="${p[0]}">${esc(tag)}</text>
  <text x="60" y="${startY}" font-family="Segoe UI, Arial, sans-serif" font-size="58" font-weight="800" fill="#ffffff">${tspans}</text>
  <rect x="60" y="600" width="90" height="8" rx="4" fill="#ffffff"/>
</svg>`;
  fs.writeFileSync(path.join(uploadsDir, filename), svg);
  return 'images/' + filename;
}

const categories = [
  ['Nasional', 'nasional', 'Berita dalam negeri terkini', '#2563eb'],
  ['Internasional', 'internasional', 'Kabar dunia mancanegara', '#7c3aed'],
  ['Ekonomi', 'ekonomi', 'Bisnis, pasar, dan keuangan', '#16a34a'],
  ['Teknologi', 'teknologi', 'Inovasi dan gadget terbaru', '#0891b2'],
  ['Olahraga', 'olahraga', 'Sepak bola hingga bulu tangkis', '#f59e0b'],
  ['Hiburan', 'hiburan', 'Film, musik, dan selebriti', '#e11d48']
];

const articles = [
  ['Pemerintah Luncurkan Program Digitalisasi Desa Tahap Kedua', 'nasional', 1, 1],
  ['Pertumbuhan Ekonomi Kuartal Ini Tembus 5,2 Persen', 'ekonomi', 1, 1],
  ['Startup Lokal Kembangkan AI Berbahasa Indonesia', 'teknologi', 1, 1],
  ['Timnas Melaju ke Semifinal Setelah Drama Adu Penalti', 'olahraga', 1, 1],
  ['KTT ASEAN Sepakati Kerja Sama Energi Hijau', 'internasional', 1, 0],
  ['Film Indonesia Raih Penghargaan di Festival Internasional', 'hiburan', 1, 0],
  ['Harga Pangan Stabil Jelang Ramadan', 'ekonomi', 0, 0],
  ['Peluncuran Satelit Komunikasi Generasi Baru Berhasil', 'teknologi', 0, 0],
  ['Infrastruktur Tol Trans Jawa Tambah Ruas Baru', 'nasional', 0, 0],
  ['Liga Champions: Kejutan Besar di Babak Perempat Final', 'olahraga', 0, 0],
  ['Perubahan Iklim Ancam Kota Pesisir Dunia', 'internasional', 0, 0],
  ['Konser Amal Musisi Tanah Air Kumpulkan Donasi Rekor', 'hiburan', 0, 0],
  ['UMKM Digital Naik Signifikan Sepanjang Tahun', 'ekonomi', 0, 1],
  ['Peneliti Temukan Metode Baru Penyimpanan Energi', 'teknologi', 0, 0],
  ['Program Beasiswa Nasional Dibuka untuk 100 Ribu Mahasiswa', 'nasional', 0, 0],
  ['Atlet Muda Pecahkan Rekor Nasional di Kejuaraan Asia', 'olahraga', 0, 0]
];

const body = (title, cat) => `
<p>Perkembangan terbaru terkait <strong>${esc(title)}</strong> menjadi perhatian publik luas. Sejumlah pihak menyambut baik langkah ini dan berharap dampaknya dapat dirasakan secara merata oleh masyarakat di berbagai daerah.</p>
<h2>Latar Belakang</h2>
<p>Isu ini mencuat setelah rangkaian pembahasan panjang yang melibatkan berbagai pemangku kepentingan. Pemerintah bersama mitra terkait menyatakan komitmennya untuk memastikan setiap tahapan berjalan transparan dan akuntabel.</p>
<blockquote>Kami memastikan proses ini berjalan terbuka dan melibatkan partisipasi masyarakat seluas-luasnya.</blockquote>
<p>Pengamat menilai langkah ini berpotensi memberikan efek berganda positif, khususnya pada sektor ${esc(cat.toLowerCase())} yang selama ini menjadi tulang punggung perekonomian.</p>
<h2>Dampak ke Depan</h2>
<p>Ke depan, sejumlah indikator akan dipantau secara berkala. Masyarakat diimbau untuk turut mengawal agar tujuan bersama dapat tercapai tepat waktu dan tepat sasaran.</p>
<p>Redaksi akan terus memperbarui perkembangan berita ini dari sumber-sumber terpercaya.</p>
`;

const videos = [
  ['Liputan Khusus: Jejak Digitalisasi di Pelosok Negeri', '12:45', 'nasional'],
  ['Wawancara Eksklusif Menteri Ekonomi', '08:20', 'ekonomi'],
  ['Demo Produk Gadget Terbaru 2026', '15:10', 'teknologi'],
  ['Highlight Pertandingan Final Piala Nasional', '06:32', 'olahraga'],
  ['Behind The Scene Film Box Office Terbaru', '10:05', 'hiburan'],
  ['Laporan Khusus dari Forum Ekonomi Dunia', '18:48', 'internasional']
];

const photos = [
  'Suasana Upacara Peringatan Hari Kemerdekaan',
  'Pemandangan Kota di Pagi Hari',
  'Aksi Demonstran Menuntut Perdamaian',
  'Petani Menanam Padi di Sawah Terasering',
  'Kemeriahan Pesta Rakyat Akhir Tahun'
];

const slides = [
  ['Transformasi Digital Indonesia', 'Program nasional percepatan ekonomi digital menuju 2030', 'nasional'],
  ['Energi Hijau Masa Depan', 'Komitmen transisi energi bersih untuk generasi mendatang', 'internasional'],
  ['Inovasi Teknologi Lokal', 'Startup dalam negeri bersaing di panggung global', 'teknologi'],
  ['Semangat Olahraga Bangsa', 'Prestasi atlet mengharumkan nama negara', 'olahraga']
];

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  if (userCount > 0) {
    console.log('Database sudah berisi data. Seed dilewati. Hapus data/news.db untuk mengulang.');
    return;
  }

  const insertUser = db.prepare('INSERT INTO users (name,email,password,role,avatar) VALUES (?,?,?,?,?)');
  const adminRes = insertUser.run('Administrator', 'admin@news.id', bcrypt.hashSync('admin123', 10), 'admin', null);
  const adminId = Number(adminRes.lastInsertRowid);
  insertUser.run('Budi Redaksi', 'editor@news.id', bcrypt.hashSync('editor123', 10), 'editor', null);

  const insertCat = db.prepare('INSERT INTO categories (name,slug,description,color) VALUES (?,?,?,?)');
  const catIds = {};
  categories.forEach((c, i) => {
    const r = insertCat.run(c[0], c[1], c[2], c[3]);
    catIds[c[1]] = Number(r.lastInsertRowid);
    makeCover(`cat-${c[1]}.svg`, c[0], 'KATEGORI', i);
  });

  const insertArticle = db.prepare(`INSERT INTO articles
    (title,slug,excerpt,content,image,category_id,author_id,status,featured,views,published_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now','localtime',?))`);

  articles.forEach((a, i) => {
    const [title, cat, published, featured] = a;
    const slug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
    const excerpt = `${title} — simak rangkuman lengkap dan analisis mendalam hanya di Nusantara News.`;
    const image = makeCover(`art-${i + 1}.svg`, title, categories.find(c => c[1] === cat)[0].toUpperCase(), i);
    insertArticle.run(
      title, slug, excerpt, body(title, cat), image, catIds[cat], adminId,
      published ? 'published' : 'draft', featured, Math.floor(Math.random() * 900) + 120,
      `-${i + 1} hours`
    );
  });

  const insertVideo = db.prepare('INSERT INTO videos (title,description,url,thumbnail,duration,category_id) VALUES (?,?,?,?,?,?)');
  videos.forEach((v, i) => {
    const [title, duration, cat] = v;
    const thumb = makeCover(`vid-${i + 1}.svg`, title, 'VIDEO', i + 2);
    insertVideo.run(title, `Video ${title} menghadirkan liputan mendalam dan narasumber terpercaya.`,
      'https://www.youtube.com/embed/dQw4w9WgXcQ', thumb, duration, catIds[cat]);
  });

  const insertPhoto = db.prepare('INSERT INTO photos (title,caption,image,album) VALUES (?,?,?,?)');
  photos.forEach((p, i) => {
    const img = makeCover(`photo-${i + 1}.svg`, p, 'GALERI', i + 5);
    insertPhoto.run(p, `Dokumentasi: ${p}`, img, i % 2 === 0 ? 'Peristiwa' : 'Keindahan');
  });

  const insertSlide = db.prepare('INSERT INTO slides (title,subtitle,image,link,badge,sort_order) VALUES (?,?,?,?,?,?)');
  slides.forEach((s, i) => {
    const img = makeCover(`slide-${i + 1}.svg`, s[0], 'UTAMA', i);
    const cat = categories.find(c => c[1] === s[2])[0];
    insertSlide.run(s[0], s[1], img, `/kategori/${s[2]}`, cat, i);
  });

  const insertSetting = db.prepare('INSERT INTO settings (key,value) VALUES (?,?)');
  const settings = {
    site_name: 'Nusantara News',
    tagline: 'Tepercaya, Tajam, dan Berimbang',
    description: 'Portal berita yang menyajikan informasi terkini, akurat, dan mendalam dari dalam dan luar negeri.',
    email: 'redaksi@news.id',
    phone: '+62 21 1234 5678',
    address: 'Jl. Merdeka No. 45, Jakarta Pusat, Indonesia',
    facebook: '#', instagram: '#', twitter: '#', youtube: '#'
  };
  Object.entries(settings).forEach(([k, v]) => insertSetting.run(k, v));

  console.log('Seed selesai!');
  console.log('Admin  : admin@news.id / admin123');
  console.log('Editor : editor@news.id / editor123');
}

seed();
