const db = require('./src/db/database');

const trendingNews = [
  {
    title: 'Program Beasiswa Nasional Dibuka untuk 100 Ribu Mahasiswa, Ini Syarat Lengkapnya',
    category_id: 1, // Nasional
    featured: 1,
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&auto=format&fit=crop&q=80',
    excerpt: 'Pemerintah resmi membuka pendaftaran beasiswa penuh bagi 100 ribu mahasiswa jenjang D3, S1, hingga S2. Bebas UKT dan dapat uang saku bulanan.',
    content: `<p><strong>JAKARTA</strong> — Kementerian Pendidikan secara resmi membuka pendaftaran Program Beasiswa Nasional untuk tahun akademik 2026. Dengan total alokasi penerima mencapai 100.000 mahasiswa dari perguruan tinggi negeri maupun swasta, program ini menjadi salah satu bantuan pendidikan terbesar yang pernah diselenggarakan di Indonesia.</p>

<h2>Fasilitas yang Didapatkan Mahasiswa</h2>
<p>Penerima beasiswa akan memperoleh sejumlah pembiayaan penting selama masa perkuliahan aktif:</p>
<ul>
  <li><strong>Pembebasan Uang Kuliah Tunggal (UKT):</strong> Seluruh biaya semester ditanggung penuh hingga lulus sesuai masa studi reguler.</li>
  <li><strong>Biaya Hidup Bulanan:</strong> Tunjangan akomodasi dan konsumsi yang ditransfer langsung ke rekening mahasiswa setiap bulan.</li>
  <li><strong>Bantuan Riset &amp; Skripsi:</strong> Dana insentif penelitian tugas akhir guna mendorong publikasi ilmiah berkualitas.</li>
  <li><strong>Pelatihan Soft Skills &amp; Magang Industri:</strong> Akses prioritas pada jejaring perusahaan BUMN dan multinasional terkemuka.</li>
</ul>

<h2>Persyaratan Administratif</h2>
<p>Bagi mahasiswa yang ingin mengajukan permohonan, dokumen dan kualifikasi yang perlu disiapkan antara lain:</p>
<ol>
  <li>Warga Negara Indonesia (WNI) berstatus mahasiswa aktif semester 2 hingga 6.</li>
  <li>IPK minimal 3.00 untuk jalur prestasi akademik, atau 2.75 untuk jalur afirmasi/ekonomi keluarga.</li>
  <li>Surat rekomendasi dari dosen pembimbing akademik atau ketua program studi.</li>
  <li>Esai bertema inovasi dan kontribusi sosial maksimal 700 kata.</li>
  <li>Surat pernyataan tidak sedang menerima beasiswa lain bersumber APBN/APBD.</li>
</ol>

<p>Pendaftaran dilakukan secara mandiri melalui laman resmi layanan beasiswa hingga 15 Oktober 2026 tanpa dipungut biaya apapun.</p>`
  },
  {
    title: 'Timnas Indonesia Tembus Babak Baru Kualifikasi Dunia, Ranking FIFA Melonjak Tajam',
    category_id: 5, // Olahraga
    featured: 1,
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&auto=format&fit=crop&q=80',
    excerpt: 'Kemenangan dramatis skuad Garuda sukses mengantarkan timnas melaju ke babak berikutnya sekaligus mendongkrak peringkat FIFA Indonesia ke posisi terbaik dalam satu dekade.',
    content: `<p><strong>JAKARTA</strong> — Gemuruh sorak penonton di Stadion Gelora Bung Karno membakar semangat Timnas Indonesia yang berhasil mengamankan kemenangan krusial dalam laga kualifikasi dunia tadi malam. Penampilan solid di lini pertahanan dan serangan balik cepat membuahkan hasil manis dengan skor akhir yang membanggakan.</p>

<h2>Lonjakan Peringkat FIFA</h2>
<p>Kemenangan berturut-turut dalam kalender resmi federasi membuat proyeksi poin Timnas Indonesia melesat tajam. Diperkirakan Indonesia akan melonjak hingga 8 peringkat dalam rilis resmi peringkat FIFA mendatang, mencatatkan capaian ranking tertinggi tim Merah Putih dalam kurun waktu sepuluh tahun terakhir.</p>

<blockquote>
"Kemenangan ini adalah buah kerja keras seluruh pemain, pelatih, serta doa puluhan juta suporter tanah air yang pantang menyerah mendukung kami," ujar kapten timnas dalam jumpa pers pascalaga.
</blockquote>

<h2>Jadwal Pertandingan Selanjutnya</h2>
<p>Pelatih kepala menegaskan bahwa evaluasi fisik dan taktikal langsung dimulai untuk menghadapi laga tandang pekan depan. Skuad Garuda dijadwalkan terbang membawa formasi pemain terbaik guna mempertahankan konsistensi permainan.</p>`
  },
  {
    title: 'Peluncuran Kereta Cepat Ruas Baru Mulai Diuji Coba, Pangkas Waktu Tempuh Antarprovinsi',
    category_id: 1, // Nasional
    featured: 1,
    image: 'https://images.unsplash.com/photo-1515165562839-978bbcf18277?w=1200&auto=format&fit=crop&q=80',
    excerpt: 'Uji coba jalur lanjutan moda transportasi kereta cepat modern berjalan sukses dengan kecepatan operasional hingga 350 km/jam, menghubungkan pusat kota secara efisien.',
    content: `<p><strong>BANDUNG</strong> — Konsorsium transportasi nasional resmi memulai fase uji coba dinamis pada lintasan rel kereta cepat modern generasi terbaru. Dalam serangkaian pengujian teknis yang diawasi otoritas keselamatan perkeretaapian internasional, rangkaian kereta mampu melaju mulus dengan kecepatan puncak 350 km per jam tanpa hambatan teknis berarti.</p>

<h2>Konektivitas dan Dampak Ekonomi</h2>
<p>Perluasan koridor ini diperkirakan mampu memangkas waktu perjalanan antarkota dari sebelumnya memakan waktu lebih dari 4 jam melalui jalan raya menjadi hanya sekitar 45 menit. Efisiensi mobilitas ini diyakini mempercepat pertumbuhan sentra ekonomi baru di kota-kota transit sekitar stasiun.</p>

<p>Fasilitas stasiun juga dirancang terintegrasi dengan moda transportasi umum perkotaan seperti LRT, bus rapid transit, serta stasiun pengisian kendaraan listrik.</p>

<p>Masyarakat umum direncanakan dapat menikmati uji coba publik terbatas pada akhir kuartal ini sebelum izin operasional komersial penuh diterbitkan pemerintah.</p>`
  },
  {
    title: 'Revolusi AI Generatif Indonesia: Startup Lokal Raih Pendanaan Seri B US$ 50 Juta',
    category_id: 4, // Teknologi
    featured: 1,
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    excerpt: 'Platform kecerdasan buatan berbasis Large Language Model lokal yang menguasai berbagai dialek Nusantara sukses menarik minat investor modal ventura global.',
    content: `<p><strong>JAKARTA</strong> — Perkembangan industri kecerdasan buatan (Artificial Intelligence) tanah air kian bersinar di kancah regional. Sebuah startup AI lokal yang fokus pada model bahasa terapan (LLM) khusus bahasa dan dialek daerah Nusantara resmi mengumumkan perolehan pendanaan Seri B senilai US$ 50 juta (sekitar Rp 800 miliar) yang dipimpin oleh konsorsium investor teknologi terkemuka Asia.</p>

<h2>Teknologi Khusus Konteks Nusantara</h2>
<p>Berbeda dengan model generik global, teknologi yang dikembangkan startup ini dilatih menggunakan korpus data lokal yang kaya, mencakup nuansa bahasa sehari-hari, istilah perbankan daerah, hingga sistem kepatuhan hukum Indonesia. Hal ini membuat akurasi pemrosesan bahasa alami (NLP) jauh lebih tinggi saat diaplikasikan di sektor perbankan, layanan pelanggan, dan e-commerce.</p>

<p>Dana segar ini akan dialokasikan untuk memperbesar kapasitas komputasi data center GPU lokal, riset model multimodal suara, serta rekrutmen ratusan insinyur AI muda Indonesia.</p>`
  },
  {
    title: 'Pasar Saham dan Rupiah Menguat Signifikan Ditopang Surplus Neraca Perdagangan',
    category_id: 3, // Ekonomi
    featured: 1,
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&auto=format&fit=crop&q=80',
    excerpt: 'Indeks Harga Saham Gabungan (IHSG) melaju positif dan nilai tukar rupiah menguat seiring derasnya arus modal asing dan tren surplus perdagangan ekspor.',
    content: `<p><strong>JAKARTA</strong> — Sentimen positif kembali mendominasi pasar keuangan domestik pada perdagangan akhir pekan. Indeks Harga Saham Gabungan (IHSG) ditutup menguat di zona hijau, sementara nilai tukar rupiah bergerak kokoh terhadap dolar Amerika Serikat menyusul rilis data neraca pembayaran yang melampaui ekspektasi analis.</p>

<h2>Faktor Pendorong Penguatan Pasar</h2>
<p>Kinerja ekspor komoditas hilirisasi bernilai tambah serta manufaktur otomotif menjadi kontributor utama surplus dagang yang konsisten. Bank Indonesia melaporkan cadangan devisa nasional tetap berada pada tingkat yang sangat memadai untuk menjaga stabilitas moneter dan menopang ketahanan sektor eksternal.</p>

<p>Para pelaku pasar memproyeksikan iklim investasi riil dan portofolio pasar modal Indonesia tetap menarik di mata investor global di tengah ketidakpastian makroekonomi kawasan barat.</p>`
  },
  {
    title: 'KTT Iklim Internasional Sepakati Dana Transisi Energi Terbarukan Triliunan Dolar',
    category_id: 2, // Internasional
    featured: 1,
    image: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=1200&auto=format&fit=crop&q=80',
    excerpt: 'Konferensi tingkat tinggi iklim global mencapai kesepakatan bersejarah dalam pengalihan subsidi energi fosil menuju percepatan pembangkit listrik tenaga surya dan angin.',
    content: `<p><strong>JENEWA</strong> — Para delegasi dari lebih 120 negara peserta KTT Iklim Global akhirnya menandatangani pakta kerja sama bersejarah mengenai pendanaan transisi energi bersih. Komitmen pendanaan yang dihimpun dari lembaga multilateral dan negara maju ini dialokasikan khusus untuk mempercepat pemensiunan dini pembangkit batubara dan pembangunan ladang turbin angin skala gigawatt di negara berkembang.</p>

<p>Langkah ini diambil setelah data pemantauan atmosfer menunjukkan laju kenaikan suhu global membutuhkan tindakan dekarbonisasi nyata dan terukur sebelum pergantian dekade.</p>`
  },
  {
    title: 'Sutradara Muda Indonesia Sabet Trofi Utama di Ajang Sinema Bergengsi Eropa',
    category_id: 6, // Hiburan
    featured: 0,
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80',
    excerpt: 'Film drama bertema kearifan lokal berhasil memukau dewan juri festival internasional dan membawa pulang penghargaan bergengsi Sutradara Terbaik.',
    content: `<p><strong>PARIS</strong> — Industri perfilman tanah air kembali mengukir prestasi gemilang di panggung sinema internasional. Karya terbaru garapan sineas muda Indonesia dinobatkan sebagai penerima penghargaan Best Director di salah satu festival film independen paling prestisius di Eropa.</p>

<p>Film berdurasi 118 menit tersebut mengangkat cerita relasi keluarga di kawasan pelosok pesisir Indonesia dengan sinematografi memukau serta penulisan skenario yang sangat menyentuh emosi penonton dari berbagai latar belakang budaya.</p>`
  },
  {
    title: 'Eksplorasi Antariksa: Teleskop Modern Tangkap Gambar Detil Galaksi Purba',
    category_id: 4, // Teknologi
    featured: 0,
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
    excerpt: 'Observatorium luar angkasa mengirimkan potret paling jernih dari struktur galaksi purba yang terbentuk sesaat setelah Big Bang.',
    content: `<p><strong>WASHINGTON</strong> — Komunitas astrofisika dunia menyambut gembira publikasi citra resolusi tinggi terbaru dari teleskop antariksa generasi muktahir. Gambar tersebut memperlihatkan kluster bintang di galaksi purba yang diperkirakan lahir hanya beberapa ratus juta tahun setelah peristiwa terbentuknya alam semesta.</p>

<p>Temuan ini memberi wawasan revolusioner mengenai pembentukan lubang hitam raksasa purba dan komposisi materi gelap yang menyusun fondasi kosmos.</p>`
  },
  {
    title: 'Kejuaraan Bulu Tangkis Dunia: Ganda Putra Rebut Gelar Juara Lewat Pertarungan Sengit',
    category_id: 5, // Olahraga
    featured: 0,
    image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=1200&auto=format&fit=crop&q=80',
    excerpt: 'Ganda putra andalan Indonesia berhasil mengunci gelar juara turnamen bergengsi setelah menundukkan pasangan peringkat satu dunia lewat duel rubber set.',
    content: `<p><strong>BIRMINGHAM</strong> — Pertarungan kelas dunia tersaji di partai final kejuaraan bulu tangkis bergengsi. Pasangan ganda putra Indonesia menunjukkan ketangguhan mental luar biasa saat bangkit dari ketertinggalan di set pertama untuk akhirnya mengunci kemenangan dramatis pada set penentuan dengan skor 22-20.</p>

<p>Kemenangan ini sekaligus mengukuhkan dominasi pasangan muda ini sebagai salah satu kandidat terkuat peraih medali emas pesta olahraga dunia mendatang.</p>`
  },
  {
    title: 'Transformasi UMKM: Strategi Pemasaran Digital Dongkrak Penjualan Produk Kreatif Lokal',
    category_id: 3, // Ekonomi
    featured: 0,
    image: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=1200&auto=format&fit=crop&q=80',
    excerpt: 'Pelaku usaha mikro dan kecil binaan di berbagai daerah mencatat lonjakan pesanan ekspor hingga 300% setelah beralih memanfaatkan ekosistem pemasaran live streaming.',
    content: `<p><strong>YOGYAKARTA</strong> — Era digitalisasi terbukti memberikan peluang akselerasi bisnis bagi para perajin dan pemilik usaha kreatif tradisional. Melalui pemanfaatan konten video interaktif dan penjualan siaran langsung di kanal marketplace, puluhan kelompok perajin kini mampu memasarkan produk kerajinan tangan langsung ke konsumen mancanegara tanpa rantai perantara yang panjang.</p>

<p>Pemerintah daerah bersama asosiasi perbankan terus memperluas fasilitasi sertifikasi halal dan standardisasi kemasan ekspor demi menjaga kesinambungan momentum pertumbuhan pasar UMKM.</p>`
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

console.log('Clearing old sample articles and inserting viral real-world articles...');

db.exec('DELETE FROM articles');

const insertStmt = db.prepare(`
  INSERT INTO articles (
    title, slug, excerpt, content, image, category_id, author_id, status, featured, views, published_at, created_at, sort_order
  ) VALUES (?, ?, ?, ?, ?, ?, 1, 'published', ?, ?, datetime('now','localtime', ?), datetime('now','localtime', ?), ?)
`);

trendingNews.forEach((news, idx) => {
  const slug = slugify(news.title);
  const views = Math.floor(Math.random() * 2400) + 650;
  const timeOffset = `-${idx * 2} hours`;
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
    idx + 1
  );
});

// Update Slides to match real viral topics with HD Photography:
db.exec('DELETE FROM slides');
const insertSlide = db.prepare(`
  INSERT INTO slides (title, subtitle, image, link, badge, sort_order, active, show_image)
  VALUES (?, ?, ?, ?, ?, ?, 1, 1)
`);

const realSlides = [
  {
    title: 'Program Beasiswa Nasional 2026',
    subtitle: 'Alokasi 100 ribu kuota beasiswa bebas UKT dan tunjangan hidup bagi mahasiswa berprestasi.',
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1400&auto=format&fit=crop&q=80',
    link: '/berita/program-beasiswa-nasional-dibuka-untuk-100-ribu-mahasiswa-ini-syarat-lengkapnya',
    badge: 'Nasional'
  },
  {
    title: 'Kebangkitan Sepak Bola Nasional',
    subtitle: 'Ranking FIFA timnas melonjak tajam setelah menembus fase krusial kualifikasi dunia.',
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1400&auto=format&fit=crop&q=80',
    link: '/berita/timnas-indonesia-tembus-babak-baru-kualifikasi-dunia-ranking-fifa-melonjak-tajam',
    badge: 'Olahraga'
  },
  {
    title: 'Konektivitas Cepat Antarprovinsi',
    subtitle: 'Kereta modern kecepatan 350 km/jam sukses rampungkan uji coba lintasan baru.',
    image: 'https://images.unsplash.com/photo-1515165562839-978bbcf18277?w=1400&auto=format&fit=crop&q=80',
    link: '/berita/peluncuran-kereta-cepat-ruas-baru-mulai-diuji-coba-pangkas-waktu-tempuh-antarprovinsi',
    badge: 'Nasional'
  },
  {
    title: 'Inovasi AI Asli Nusantara',
    subtitle: 'Startup pengembang kecerdasan buatan berbasis budaya lokal raih pendanaan internasional.',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1400&auto=format&fit=crop&q=80',
    link: '/berita/revolusi-ai-generatif-indonesia-startup-lokal-raih-pendanaan-seri-b-us-50-juta',
    badge: 'Teknologi'
  }
];

realSlides.forEach((s, idx) => {
  insertSlide.run(s.title, s.subtitle, s.image, s.link, s.badge, idx + 1);
});

// Update Photos with real high-resolution photography:
db.exec('DELETE FROM photos');
const insertPhoto = db.prepare(`
  INSERT INTO photos (title, caption, image, album, status, sort_order)
  VALUES (?, ?, ?, ?, 'published', ?)
`);

const realPhotos = [
  {
    title: 'Semangat Ribuan Suporter di GBK',
    caption: 'Koreografi spektakuler suporter saat mengawal laga kualifikasi dunia di Senayan.',
    image: 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=1200&auto=format&fit=crop&q=80',
    album: 'Peristiwa'
  },
  {
    title: 'Pesona Lanskap Senja Jakarta',
    caption: 'Panorama gemerlap lampu cakrawala ibu kota menjelang malam hari.',
    image: 'https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=1200&auto=format&fit=crop&q=80',
    album: 'Keindahan'
  },
  {
    title: 'Aktivitas Petani di Lembah Pegunungan',
    caption: 'Tradisi bertani terasering lestari di lereng bukit Nusantara.',
    image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200&auto=format&fit=crop&q=80',
    album: 'Keindahan'
  },
  {
    title: 'Diskusi Mahasiswa Masa Depan',
    caption: 'Antusiasme mahasiswa penerima beasiswa dalam sesi kolaborasi riset.',
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&auto=format&fit=crop&q=80',
    album: 'Peristiwa'
  },
  {
    title: 'Festival Seni Budaya Tradisional',
    caption: 'Pentas busana adat nusantara yang memukau wisatawan mancanegara.',
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&auto=format&fit=crop&q=80',
    album: 'Peristiwa'
  }
];

realPhotos.forEach((p, idx) => {
  insertPhoto.run(p.title, p.caption, p.image, p.album, idx + 1);
});

// Update Videos with real thumbnails and topics:
db.exec('DELETE FROM videos');
const insertVideo = db.prepare(`
  INSERT INTO videos (title, description, url, thumbnail, duration, category_id, status, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, 'published', ?)
`);

const realVideos = [
  {
    title: 'Sorotan Gol dan Drama Penalti Laga Kualifikasi Timnas',
    description: 'Rangkuman momen-momen krusial dan penyelamatan gemilang di babak adu penalti.',
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
    duration: '08:45',
    category_id: 5
  },
  {
    title: 'Panduan Lengkap Pendaftaran Beasiswa 100 Ribu Mahasiswa',
    description: 'Langkah demi langkah pembuatan akun, pengunggahan berkas, dan tips lolos seleksi wawancara.',
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
    duration: '14:20',
    category_id: 1
  },
  {
    title: 'Uji Coba Kereta Cepat 350 Km/Jam: Sensasi dan Fasilitas di Dalam Gerbong',
    description: 'Liputan jurnalis menjajal kenyamanan kursi, kabin senyap, dan kestabilan laju kereta.',
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1515165562839-978bbcf18277?w=800&auto=format&fit=crop&q=80',
    duration: '11:15',
    category_id: 1
  },
  {
    title: 'Demo Kecerdasan Buatan Asli Buatan Insinyur Lokal',
    description: 'Melihat kemampuan model bahasa memproses dialek bahasa daerah dengan akurasi tinggi.',
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    duration: '09:30',
    category_id: 4
  }
];

realVideos.forEach((v, idx) => {
  insertVideo.run(v.title, v.description, v.url, v.thumbnail, v.duration, v.category_id, idx + 1);
});

console.log('Database successfully updated with viral news and real photography!');
