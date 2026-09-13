const db = require('./src/db/database');

const author = db.prepare("SELECT id FROM users LIMIT 1").get();
const authorId = author ? author.id : 1;

const catInter = db.prepare("SELECT id FROM categories WHERE slug = 'internasional'").get()?.id || 2;
const catTech = db.prepare("SELECT id FROM categories WHERE slug = 'teknologi'").get()?.id || 4;
const catEkonomi = db.prepare("SELECT id FROM categories WHERE slug = 'ekonomi'").get()?.id || 3;
const catGlobal = db.prepare("SELECT id FROM categories WHERE slug = 'global-tech'").get()?.id || 7;

function upsertArticle(data) {
  const existing = db.prepare("SELECT id FROM articles WHERE slug = ?").get(data.slug);
  if (existing) {
    db.prepare(`
      UPDATE articles SET
        title = ?, excerpt = ?, content = ?, image = ?, category_id = ?, 
        status = 'published', featured = ?, views = ?, lang = ?, updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(data.title, data.excerpt, data.content, data.image, data.category_id, data.featured || 0, data.views || 1000, data.lang, existing.id);
    return existing.id;
  } else {
    const res = db.prepare(`
      INSERT INTO articles (
        title, slug, excerpt, content, image, category_id, author_id, 
        status, featured, views, lang, published_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))
    `).run(data.title, data.slug, data.excerpt, data.content, data.image, data.category_id, authorId, data.featured || 0, data.views || 1000, data.lang);
    return Number(res.lastInsertRowid);
  }
}

function linkPair(idA, idB) {
  db.prepare("UPDATE articles SET translation_id = ? WHERE id = ?").run(idB, idA);
  db.prepare("UPDATE articles SET translation_id = ? WHERE id = ?").run(idA, idB);
}

console.log('🌏 Publishing Asian & Global Viral News (Malaysia, Japan, Singapore, etc.)...');

// 1. JAPAN - Tokaido Shinkansen Maglev & Semiconductor Resurgence
const enJapanId = upsertArticle({
  title: 'Japan Accelerates Tokyo-Osaka Maglev Corridor and Next-Gen 2nm Foundry Deployment',
  slug: 'japan-accelerates-tokyo-osaka-maglev-nextgen-semiconductor-foundry-2026',
  excerpt: 'Superconducting magnetic levitation trains operating at 500 km/h combine with multi-billion dollar cleanroom chip manufacturing investments across Hokkaido and Kumamoto.',
  content: `<p><strong>TOKYO &amp; NAGOYA</strong> — Japan’s Ministry of Land, Infrastructure, Transport and Tourism, together with industrial heavyweights in Nagoya, has confirmed accelerated engineering phases for the Chuo Shinkansen superconducting maglev corridor connecting Tokyo to Osaka in just 67 minutes.</p>

<h2>Superconducting Maglev and Extreme Precision Transit</h2>
<p>Unlike conventional steel-wheel rail, the maglev fleet operates suspended 10 centimeters above electromagnetic guide channels, completely immune to derailment risks during seismic tremor events. The state-of-the-art guideway network is engineered to handle rigorous climate shifts while delivering near-silent transit at 505 km/h.</p>

<h2>The 2-Nanometer Foundry Resurgence in Kumamoto and Chitose</h2>
<p>Simultaneously, Japan's domestic semiconductor foundries have completed primary extreme ultraviolet (EUV) lithography trials. By pairing advanced domestic material supply chains with leading global chip architectures, Japanese fabricators are positioning themselves as critical suppliers of low-power AI accelerators worldwide.</p>`,
  image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&auto=format&fit=crop&q=80',
  category_id: catGlobal,
  featured: 1,
  views: 14800,
  lang: 'en'
});

const idJapanId = upsertArticle({
  title: 'Jepang Kebut Proyek Kereta Maglev Tokyo-Osaka 500 Km/Jam dan Pabrik Chip 2 Nanometer',
  slug: 'jepang-kebut-proyek-kereta-maglev-tokyo-osaka-dan-pabrik-chip-2nm',
  excerpt: 'Kereta levitasi magnetik superkonduktor siap pangkas waktu tempuh antarkota, didukung ekspansi manufaktur semikonduktor paling canggih di Asia Timur.',
  content: `<p><strong>TOKYO &amp; NAGOYA</strong> — Pemerintah Jepang bersama konsorsium perkeretaapian mengonfirmasi percepatan proyek jalur kereta cepat levitasi magnetik (Maglev) Chuo Shinkansen yang mampu melesat hingga 505 km/jam, memangkas perjalanan Tokyo-Osaka menjadi hanya 67 menit.</p>

<h2>Teknologi Levitasi Magnetik Tahan Gempa</h2>
<p>Kereta maglev melayang 10 sentimeter di atas lintasan elektromagnetik tanpa roda baja konvensional, menghasilkan perjalanan minim getaran sekaligus memiliki sistem keamanan otomatis saat mendeteksi getaran seismik.</p>

<h2>Kebangkitan Industri Semikonduktor Generasi Baru</h2>
<p>Bersamaan dengan proyek transportasi tersebut, pusat manufaktur mikrocip di Kumamoto dan Hokkaido telah merampungkan pengujian litografi 2 nanometer, memperkuat dominasi Jepang dalam rantai pasok cip kecerdasan buatan (AI) global.</p>`,
  image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&auto=format&fit=crop&q=80',
  category_id: catInter,
  featured: 1,
  views: 12100,
  lang: 'id'
});
linkPair(enJapanId, idJapanId);

// 2. SINGAPORE - Financial AI, Green Maritime Ports & Tech Hub
const enSingaporeId = upsertArticle({
  title: 'Singapore Unveils Automated Tuas Mega-Port and Regional Sovereign AI Cloud Infrastructure',
  slug: 'singapore-automated-tuas-megaport-regional-sovereign-ai-cloud-2026',
  excerpt: 'The city-state operationalizes electrified container berths managed by artificial intelligence while expanding ultra-secure financial cloud zones for international enterprises.',
  content: `<p><strong>SINGAPORE</strong> — The Maritime and Port Authority of Singapore has officially commissioned additional automated deep-water berths at Tuas Port, cementing Singapore’s status as the world’s most technologically advanced maritime transshipment epicenter.</p>

<h2>Fully Autonomous Container Stacking and Digital Twinning</h2>
<p>Tuas Port leverages an integrated digital twin running on neural networks to schedule electric automated guided vehicles (AGVs) and double-trolley quay cranes. The system cuts ship turnaround delays by 35 percent and drastically curtails carbon emissions across busiest shipping straits.</p>

<h2>Southeast Asia’s Trusted Sovereign Financial Hub</h2>
<p>In tandem with port modernization, the Monetary Authority of Singapore has broadened its sovereign AI cloud regulations, allowing global financial institutions to train compliance models within zero-trust, privacy-shielded environments.</p>`,
  image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200&auto=format&fit=crop&q=80',
  category_id: catGlobal,
  featured: 1,
  views: 16200,
  lang: 'en'
});

const idSingaporeId = upsertArticle({
  title: 'Singapura Resmikan Pelabuhan Otomatis Tuas Terbesar dan Komputasi AI Finansial Global',
  slug: 'singapura-resmikan-pelabuhan-otomatis-tuas-dan-komputasi-ai-finansial-global',
  excerpt: 'Dermaga pintar serba otomatis berbasis kecerdasan buatan memperkuat posisi Singapura sebagai pusat maritim dan pusat teknologi finansial paling terpercaya.',
  content: `<p><strong>SINGAPURA</strong> — Otoritas Maritim dan Pelabuhan Singapura meresmikan perluasan dermaga laut dalam Tuas Port yang dioperasikan penuh menggunakan derek otomatis dan kendaraan tanpa pengemudi bertenaga listrik.</p>

<h2>Operasional Pelabuhan Nirawak Tercanggih</h2>
<p>Dengan bantuan sistem kecerdasan buatan yang memodelkan pergerakan kapal secara waktu nyata, waktu tunggu bongkar muat kapal kargo internasional berkurang hingga 35 persen dibandingkan pelabuhan konvensional.</p>

<h2>Pusat Inovasi Finansial Dunia</h2>
<p>Pemerintah Singapura juga meluncurkan kluster komputasi awan berkeamanan tinggi yang melayani transaksi perbankan dan analitik keuangan lintas negara bagi ribuan institusi keuangan global.</p>`,
  image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200&auto=format&fit=crop&q=80',
  category_id: catEkonomi,
  featured: 1,
  views: 13400,
  lang: 'id'
});
linkPair(enSingaporeId, idSingaporeId);

// 3. MALAYSIA - Johor-Singapore Special Economic Zone (JS-SEZ) & AI Data Center Boom
const enMalaysiaId = upsertArticle({
  title: 'Malaysia Emerges as Southeast Asia’s Premier AI Data Center Powerhouse in Johor Belt',
  slug: 'malaysia-emerges-premier-ai-datacenter-powerhouse-johor-belt-2026',
  excerpt: 'Over 3 gigawatts of green-powered hyperscale data clusters in Johor and Cyberjaya attract massive international capital from world tech conglomerates.',
  content: `<p><strong>KUALA LUMPUR &amp; JOHOR BAHRU</strong> — Driven by robust renewable energy reserves and rapid cross-border infrastructure initiatives with Singapore, Malaysia has transformed its southern corridor into Southeast Asia’s densest artificial intelligence data center cluster.</p>

<h2>The Johor-Singapore Special Economic Zone Dynamo</h2>
<p>The Johor-Singapore Special Economic Zone (JS-SEZ) has successfully harmonized logistics, digital talent mobility, and clean power distribution. Hyperscale operators from North America and Asia-Pacific have deployed cutting-edge liquid-cooled server racks capable of processing massive language models and real-time computer vision frameworks.</p>

<p>Malaysian federal ministries confirmed that solar farms and hydroelectric grid feeds provide over 60 percent of operational power, fulfilling stringent environmental governance benchmarks for global institutional investors.</p>`,
  image: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200&auto=format&fit=crop&q=80',
  category_id: catGlobal,
  featured: 1,
  views: 15300,
  lang: 'en'
});

const idMalaysiaId = upsertArticle({
  title: 'Malaysia Menjelma Jadi Raksasa Pusat Data AI Terbesar Asia Tenggara di Koridor Johor',
  slug: 'malaysia-menjelma-jadi-raksasa-pusat-data-ai-terbesar-asia-tenggara-johor',
  excerpt: 'Investasi bernilai ratusan triliun rupiah di sektor pusat data hyperscale bertenaga energi hijau memacu pertumbuhan ekonomi digital kawasan selatan Malaysia.',
  content: `<p><strong>KUALA LUMPUR &amp; JOHOR BAHRU</strong> — Didukung ketersediaan energi terbarukan dan letak geografis strategis berdampingan dengan Singapura, koridor Johor kini menjadi magnet utama pembangunan pusat data kecerdasan buatan (AI) skala dunia.</p>

<h2>Kawasan Ekonomi Khusus Johor-Singapura</h2>
<p>Pengembangan Kawasan Ekonomi Khusus Johor-Singapura (JS-SEZ) mempermudah perizinan investasi dan mobilitas tenaga ahli digital internasional. Fasilitas komputasi awan yang dibangun menggunakan teknologi pendingin cairan ramah lingkungan yang hemat energi.</p>

<p>Kementerian Komunikasi dan Ekonomi Digital Malaysia memastikan pasokan listrik disokong pembangkit tenaga surya dan hidroelektrik untuk menjamin target nol emisi karbon tetap terjaga.</p>`,
  image: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200&auto=format&fit=crop&q=80',
  category_id: catInter,
  featured: 1,
  views: 11900,
  lang: 'id'
});
linkPair(enMalaysiaId, idMalaysiaId);

// 4. GLOBAL / US / EUROPE - Nuclear Fusion Energy Clean Power Landmark
const enFusionId = upsertArticle({
  title: 'Global Fusion Energy Milestone: Net Electricity Generation Achieved in Tokamak Reactor',
  slug: 'global-fusion-energy-milestone-net-electricity-generation-tokamak-2026',
  excerpt: 'Multinational physics consortium confirms continuous energy gain from magnetic confinement fusion, charting direct pathway to limitless clean electricity.',
  content: `<p><strong>OXFORD &amp; GENEVA</strong> — In an event that physicists have anticipated for generations, an international magnetic confinement fusion facility has officially delivered net positive electrical output into a municipal transmission grid over a sustained continuous test burn.</p>

<h2>Limitless Zero-Carbon Energy Without Radioactive Fuel Waste</h2>
<p>By confining deuterium and tritium plasma at temperatures exceeding 150 million degrees Celsius using high-temperature superconducting magnets, the reactor produced three times the electrical energy required to initiate the reaction. The sole exhaust output is non-toxic helium gas.</p>

<p>Commercial consortiums across the United States, Europe, and Asia are now finalizing construction blueprints for municipal fusion plants scheduled for rollout before the end of the decade.</p>`,
  image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
  category_id: catGlobal,
  featured: 1,
  views: 18900,
  lang: 'en'
});

const idFusionId = upsertArticle({
  title: 'Tonggak Sejarah Energi Fusi Nuklir Dunia: Reaktor Sukses Salurkan Listrik Bersih ke Jaringan',
  slug: 'tonggak-sejarah-energi-fusi-nuklir-dunia-reaktor-salurkan-listrik-bersih',
  excerpt: 'Ilmuwan fisika internasional buktikan reaktor fusi magnetik hasilkan surplus energi listrik bersih tanpa limbah radioaktif berbahaya.',
  content: `<p><strong>OXFORD &amp; JENEWA</strong> — Konsorsium riset fisika internasional mengukir sejarah baru setelah fasilitas reaktor fusi nuklir berhasil memproduksi surplus listrik bersih yang langsung disalurkan ke jaringan transmisi publik secara stabil.</p>

<h2>Energi Bintang di Dalam Laboratorium Bumi</h2>
<p>Mengurung plasma deuterium dan tritium pada suhu melampaui 150 juta derajat Celsius menggunakan magnet superkonduktor, reaktor ini menghasilkan energi tiga kali lipat lebih besar dibanding energi yang dibutuhkan untuk memicu reaksi.</p>

<p>Berbeda dengan fisi nuklir konvensional, reaktor fusi tidak menghasilkan limbah radioaktif berumur panjang dan tidak memiliki risiko pelelehan inti reaktor, menjadikannya solusi energi terbersih bagi peradaban masa depan.</p>`,
  image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
  category_id: catTech,
  featured: 1,
  views: 14200,
  lang: 'id'
});
linkPair(enFusionId, idFusionId);

console.log('✅ Semua berita internasional & Asia berhasil di-generate dan saling terhubung!');
