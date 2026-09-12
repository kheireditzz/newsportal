const db = require('./src/db/database');

const additionalNews = [
  {
    title: 'Pesona Laut Pasir dan Kawah Bromo: Kunjungan Wisatawan Mancanegara Pecahkan Rekor Baru',
    category_id: 1, // Nasional
    featured: 1,
    image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7d/Mount_Bromo_at_sunrise%2C_showing_its_volcanoes_and_Mount_Semeru_%28background%29.jpg/1280px-Mount_Bromo_at_sunrise%2C_showing_its_volcanoes_and_Mount_Semeru_%28background%29.jpg',
    excerpt: 'Lanskap magis matahari terbit di atas kaldera Gunung Bromo dan Gunung Semeru kembali menarik puluhan ribu pelancong internasional pada musim liburan ini.',
    content: `<p><strong>PROBOLINGGO</strong> — Udara dingin menusuk tulang di ketinggian Penanjakan tak menyurutkan langkah ribuan pelancong yang bersiap menyambut fajar menyingsing di kawasan Taman Nasional Bromo Tengger Semeru (TNBTS). Saat kabut tipis perlahan terangkat, siluet megah kawah Gunung Bromo yang masih aktif berlatar belakang puncak Gunung Semeru yang menjulang anggun memicu decak kagum para wisatawan dari berbagai penjuru dunia.</p>

<p>Balai Besar TNBTS mencatat angka kunjungan pelancong mancanegara pada kuartal berjalan mengalami lonjakan signifikan hingga menembus rekor tertinggi pascapandemi, dengan dominasi wisatawan asal Eropa, Australia, dan Asia Timur.</p>

<h2>Dampak Positif terhadap Perekonomian Masyarakat Tengger</h2>
<p>Kepadatan arus wisatawan ini memberikan berkah langsung bagi komunitas masyarakat suku Tengger yang mendiami lereng gunung. Ratusan armada mobil jip sewaan, pemandu wisata lokal, persewaan kuda penyeberangan lautan pasir, hingga penginapan homestay di desa-desa sekitar tercatat beroperasi dengan tingkat okupansi penuh.</p>

<p>Pemerintah daerah bersama tokoh adat Tengger terus menjaga keseimbangan antara industri pariwisata dengan kelestarian tradisi sakral seperti upacara Yadnya Kasada yang disucikan oleh masyarakat lereng Bromo.</p>`
  },
  {
    title: 'Arus Ekspor Pelabuhan Tanjung Priok Tembus Rekor Kontainer Tertinggi Sepanjang Sejarah',
    category_id: 3, // Ekonomi
    featured: 0,
    image: 'https://upload.wikimedia.org/wikipedia/commons/6/62/Tanjung_priok2.jpg',
    excerpt: 'Aktivitas bongkar muat peti kemas di Pelabuhan Tanjung Priok Jakarta melonjak tajam seiring pesatnya permintaan produk manufaktur dan hasil bumi Indonesia.',
    content: `<p><strong>JAKARTA</strong> — Deretan derek raksasa (crane) di sepanjang dermaga Pelabuhan Tanjung Priok Jakarta Utara terus bergerak tanpa henti melayani arus bongkar muat kapal-kapal kargo samudera raksasa (mother vessel). Otoritas pelabuhan mengumumkan bahwa volume peti kemas yang ditangani pada bulan ini mencatatkan rekor tertinggi dalam sejarah logistik maritim nasional.</p>

<p>Modernisasi fasilitas pelabuhan melalui penerapan sistem terminal terintegrasi (TOS) dan otomatisasi gerbang bea cukai terbukti mampu memangkas waktu tunggu kapal (dwelling time) secara signifikan.</p>

<h2>Hilirisasi Memacu Nilai Ekspor</h2>
<p>Komoditas unggulan yang membanjiri dermaga ekspor antara lain produk hilirisasi logam, baterai kendaraan listrik, tekstil presisi tinggi, dan aneka hasil perkebunan seperti kopi dan kelapa sawit olahan. Efisiensi rantai pasok pelabuhan ini memperkokoh daya saing produk ekspor Indonesia di pasar global.</p>`
  },
  {
    title: 'Keberagaman dan Toleransi Bersemi Indah di Kawasan Bersejarah Istiqlal dan Katedral Jakarta',
    category_id: 1, // Nasional
    featured: 0,
    image: 'https://thumb.wikimedia.org/wikipedia/id/thumb/2/25/Masjid_Istiqlal_-_Panoramio.jpg/1280px-Masjid_Istiqlal_-_Panoramio.jpg',
    excerpt: 'Terowongan Silaturahmi yang menghubungkan Masjid Istiqlal dan Gereja Katedral Jakarta menjadi simbol harmoni toleransi dan kerukunan antarumat beragama di Indonesia.',
    content: `<p><strong>JAKARTA</strong> — Berdiri megah saling berhadapan di jantung ibu kota, Masjid Istiqlal dan Gereja Katedral Jakarta telah lama menjadi simbol persaudaraan sejati bangsa Indonesia. Keberadaan Terowongan Silaturahmi bawah tanah yang menghubungkan kedua rumah ibadah agung ini kini menjadi bukti nyata bagaimana harmoni dalam keberagaman terus dirawat dan dirayakan.</p>

<p>Saat hari-hari besar keagamaan tiba, pemandangan saling berbagi area parkir dan saling membantu pengamanan antara pengurus masjid dan gereja selalu menjadi teladan kerukunan yang dipuji oleh para pemimpin dunia yang berkunjung ke Indonesia.</p>

<h2>Arsitektur Bersejarah yang Penuh Makna</h2>
<p>Kedua bangunan ibadah ini juga merupakan mahakarya cagar budaya yang dilindungi negara. Wisatawan dari berbagai latar belakang budaya diperkenankan mengikuti tur berpemandu untuk mempelajari nilai-nilai toleransi, sejarah pergerakan bangsa, dan filosofi arsitektur yang melatarbelakangi pendirian kedua bangunan agung tersebut.</p>`
  },
  {
    title: 'Kopi Arabika Gayo Aceh Dominasi Pasar Kafe Dunia: Cita Rasa Khas Tanah Vulkanik Sumatra',
    category_id: 3, // Ekonomi
    featured: 0,
    image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3d/Kopi_Hitam_King_Gayo_Arabika.jpg/1280px-Kopi_Hitam_King_Gayo_Arabika.jpg',
    excerpt: 'Biji kopi arabika specialty asal dataran tinggi Gayo Aceh semakin diminati jaringan kedai kopi internasional di Amerika Serikat dan Eropa berkat aroma rempah alaminya.',
    content: `<p><strong>TAKENGON</strong> — Dataran tinggi Gayo di Aceh Tengah terus mengukuhkan reputasinya sebagai penghasil biji kopi arabika specialty terbaik di dunia. Ditanam di ketinggian lebih dari 1.200 meter di atas permukaan laut dengan tanah vulkanik subur dan naungan pohon pinus alami, biji kopi Gayo memiliki karakter rasa kompleks dengan keasaman seimbang dan aroma rempah (spicy) yang sangat khas.</p>

<p>Asosiasi eksportir kopi mencatat permintaan pengiriman green beans organik Gayo ke pasar Amerika Serikat, Jerman, dan Jepang mengalami peningkatan pesat seiring maraknya budaya konsumsi kopi artisan di kalangan generasi muda global.</p>

<h2>Kesejahteraan Petani dan Sertifikasi Fair Trade</h2>
<p>Sistem perdagangan berkeadilan (Fair Trade) dan sertifikasi organik internasional yang dikantongi koperasi-koperasi tani di Gayo menjamin bahwa nilai tambah penjualan dinikmati langsung oleh ribuan keluarga petani di pelosok dataran tinggi Aceh.</p>`
  },
  {
    title: 'Revitalisasi Kawasan Heritage Jalan Braga Bandung: Wisata Budaya, Kuliner, dan Seni Kreatif',
    category_id: 6, // Hiburan
    featured: 0,
    image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b7/Jl_Braga_Street_Sign_in_Bandung.jpg/1280px-Jl_Braga_Street_Sign_in_Bandung.jpg',
    excerpt: 'Kawasan legendaris Jalan Braga di Kota Bandung kian memikat pelancong berkat perpaduan bangunan art deco warisan kolonial dan geliat kafe kekinian.',
    content: `<p><strong>BANDUNG</strong> — Melangkah di sepanjang trotoar batu Jalan Braga menghadirkan sensasi nostalgia menyusuri zaman keemasan "Parijs van Java". Deretan bangunan berlanggam arsitektur Art Deco yang anggun kini bersanding harmonis dengan galeri lukisan seniman lokal, kedai toko roti legendaris, serta deretan kafe estetik yang ramai dikunjungi anak muda.</p>

<p>Pemberlakuan program Braga Bebas Kendaraan (Braga Free Vehicle) pada akhir pekan sukses mengubah koridor jalan bersejarah ini menjadi ruang publik terbuka yang ramah pejalan kaki, pemusik jalanan, dan pegiat seni pertunjukan.</p>

<p>Wisatawan diajak menyelami jejak sejarah kota kembang sembari menikmati secangkir kopi hangat dan hidangan kuliner khas Sunda di tengah sejuknya udara malam Kota Bandung.</p>`
  },
  {
    title: 'Eksplorasi Keindahan Senja dan Matahari Terbenam di Pantai Kuta Pulau Dewata Bali',
    category_id: 6, // Hiburan
    featured: 0,
    image: 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Pantai_Kuta_sejuta_cinta.jpg',
    excerpt: 'Garis pantai berpasir putih sepanjang 2,5 kilometer di Kuta Bali tetap menjadi magnet utama wisatawan dunia yang ingin menyaksikan panorama sunset paling legendaris.',
    content: `<p><strong>BADUNG</strong> — Langit senja berwarna jingga keemasan yang berpadu dengan deburan ombak laut selatan Bali menyajikan pemandangan tak terlupakan di Pantai Kuta. Setiap sore hari, ribuan pelancong dari berbagai negara memadati garis pantai untuk sekadar duduk santai di hamparan pasir, berselancar menunggangi ombak, atau mengabadikan momen matahari terbenam.</p>

<p>Penataan fasilitas pedestrian pantai, penambahan lampu penerangan estetis ramah lingkungan, serta peremajaan kios pedagang cenderamata oleh pemerintah daerah membuat kawasan wisata paling legendaris di Bali ini terasa semakin aman, nyaman, dan bersih.</p>

<p>Kehadiran wisatawan di Pantai Kuta turut menggerakkan sektor perhotelan, restoran, penyewaan papan selancar, serta jasa transportasi pariwisata di seluruh kawasan Kuta dan Seminyak.</p>`
  }
];

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

console.log('Appending additional viral news articles...');

const insertStmt = db.prepare(`
  INSERT INTO articles (
    title, slug, excerpt, content, image, category_id, author_id, status, featured, views, published_at, created_at, sort_order
  ) VALUES (?, ?, ?, ?, ?, ?, 1, 'published', ?, ?, datetime('now','localtime', ?), datetime('now','localtime', ?), ?)
`);

const startOrder = 20;
additionalNews.forEach((news, idx) => {
  const slug = slugify(news.title);
  const views = Math.floor(Math.random() * 2100) + 750;
  const timeOffset = `-${(idx + 10) * 2} hours`;
  insertStmt.run(
    news.title,
    slug,
    news.excerpt,
    news.content,
    news.image,
    news.category_id,
    news.featured,
    views,
    timeOffset,
    timeOffset,
    startOrder + idx
  );
});

// Add more viral videos from detikcom and national news
const insertVideo = db.prepare(`
  INSERT INTO videos (title, description, url, thumbnail, duration, category_id, status, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, 'published', ?)
`);

const moreVideos = [
  {
    title: 'Operasi SAR Hari ke-4 Pencarian Jurnalis Hilang di Selat Sunda',
    description: 'Liputan mendalam kapal penyelamat menyisir perairan sekitar Gunung Anak Krakatau menghadapi cuaca gelombang tinggi.',
    url: 'https://www.youtube.com/embed/PVOnU0B04c8',
    thumbnail: 'https://img.youtube.com/vi/PVOnU0B04c8/hqdefault.jpg',
    duration: '06:40',
    category_id: 1
  },
  {
    title: 'Persib Hadapi Persija di GBK Senayan Setelah 7 Tahun Dinanti Suporter',
    description: 'Sorotan rivalitas klasik sepak bola Indonesia yang kembali bergulir di stadion termegah tanah air.',
    url: 'https://www.youtube.com/embed/z_KvarLo3OE',
    thumbnail: 'https://img.youtube.com/vi/z_KvarLo3OE/hqdefault.jpg',
    duration: '05:15',
    category_id: 5
  },
  {
    title: 'Analisis Duel Taktikal Akbar di SUGBK: Adu Strategi Pelatih Kelas Dunia',
    description: 'Ulasan formasi pemain, statistik penguasaan bola, dan prediksi jalannya laga panas liga kasta tertinggi.',
    url: 'https://www.youtube.com/embed/utaLbOcSYLY',
    thumbnail: 'https://img.youtube.com/vi/utaLbOcSYLY/hqdefault.jpg',
    duration: '07:30',
    category_id: 5
  }
];

moreVideos.forEach((v, idx) => {
  insertVideo.run(v.title, v.description, v.url, v.thumbnail, v.duration, v.category_id, 10 + idx);
});

console.log('Successfully added more in-depth viral articles and news videos!');
