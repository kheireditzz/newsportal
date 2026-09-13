const db = require('./src/db/database');

// Ensure author_id fallback
const author = db.prepare("SELECT id FROM users LIMIT 1").get();
const authorId = author ? author.id : 1;

// Category mappings
const catTech = db.prepare("SELECT id FROM categories WHERE slug = 'teknologi'").get()?.id || 4;
const catGlobal = db.prepare("SELECT id FROM categories WHERE slug = 'global-tech'").get()?.id || 7;
const catNasional = db.prepare("SELECT id FROM categories WHERE slug = 'nasional'").get()?.id || 1;
const catEkonomi = db.prepare("SELECT id FROM categories WHERE slug = 'ekonomi'").get()?.id || 3;
const catInter = db.prepare("SELECT id FROM categories WHERE slug = 'internasional'").get()?.id || 2;

// Helper to upsert article with lang & translation_id
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

console.log('🚀 Generating paired multilingual viral news...');

// Pair 1: Quantum Computing Breakthrough (Links to existing ID 43)
const enQuantum = db.prepare("SELECT id FROM articles WHERE slug = 'next-gen-quantum-ai-breakthrough-shakes-global-tech-industry-2026'").get();
const idQuantumId = upsertArticle({
  title: 'Terobosan AI Kuantum Generasi Baru Guncang Industri Teknologi Global: Analisis Mendalam',
  slug: 'terobosan-ai-kuantum-generasi-baru-guncang-industri-teknologi-global',
  excerpt: 'Konsorsium riset Silicon Valley dan Eropa mengumumkan lompatan komputasi kuantum fotonik yang mempercepat komputasi jaringan saraf tiruan hingga seribu kali lipat.',
  content: `<p><strong>LONDON &amp; SAN FRANCISCO</strong> — Industri teknologi global memasuki babak baru setelah konsorsium riset gabungan Silicon Valley dan akademisi Eropa mendemonstrasikan prosesor kuantum fotonik skala industri yang dioptimalkan langsung untuk model pemikiran multimodal kecerdasan buatan (AI).</p>

<h2>Lompatan Kecepatan Komputasi Fotonik</h2>
<p>Diumumkan dalam ajang Global Advanced Computing Summit di London, integrasi qubit fotonik berhasil menembus batasan dekoherensi suhu ruang tanpa membutuhkan pendingin kriogenik cair berkekuatan gigawatt. Arsitektur baru ini memproses kalkulasi tensor kompleks dengan efisiensi daya listrik sepuluh kali lebih hemat dibandingkan kluster GPU silikon konvensional.</p>

<p>Para pengamat industri menilai capaian ini sebagai tonggak penting bagi riset farmasi, pemodelan iklim presisi tinggi, dan simulasi material nano tanpa hambatan kecepatan kalkulasi tradisional.</p>

<h2>Dampak ke Pasar Finansial dan Rantai Pasok Global</h2>
<p>Bursa saham teknologi di New York, London, dan Tokyo merespons cepat dengan kenaikan volume transaksi di sektor semikonduktor generasi lanjut. Nusantara News terus memantau implementasi komersial arsitektur ini bagi ekosistem digital nasional dan global.</p>`,
  image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
  category_id: catTech,
  featured: 1,
  views: 5410,
  lang: 'id'
});

if (enQuantum) {
  linkPair(enQuantum.id, idQuantumId);
  console.log(`🔗 Linked Pair 1 (Quantum AI): EN(${enQuantum.id}) <-> ID(${idQuantumId})`);
}

// Pair 2: Universal Satellite Internet Grid (Links to existing ID 44)
const enSat = db.prepare("SELECT id FROM articles WHERE slug = 'global-tech-giants-universal-high-speed-satellite-grid-uk-us-2026'").get();
const idSatId = upsertArticle({
  title: 'Konsorsium Antariksa Global Luncurkan Jaringan Satelit Orbit Rendah Tercepat di AS dan Eropa',
  slug: 'konsorsium-antariksa-global-luncurkan-jaringan-satelit-orbit-rendah-tercepat',
  excerpt: 'Raksasa telekomunikasi dan produsen antariksa meresmikan konstelasi satelit laser lintas benua yang menghadirkan konektivitas gigabit langsung ke perangkat seluler.',
  content: `<p><strong>WASHINGTON &amp; BRUSSELS</strong> — Aliansi perusahaan teknologi dan kedirgantaraan internasional meresmikan peluncuran fase pertama konstelasi satelit orbit bumi rendah (LEO) yang terhubung menggunakan jaringan laser optik antarsatelit tanpa bergantung kabel serat optik bawah laut.</p>

<h2>Koneksi Gigabit Tanpa Piringan Antena Tambahan</h2>
<p>Keunggulan utama konstelasi generasi terbaru ini terletak pada modul pemancar pita frekuensi terpadu yang memungkinkan smartphone dan kendaraan cerdas terhubung langsung dengan kecepatan unduh mencapai 1 Gbps di area terpencil sekalipun.</p>

<p>Regulator telekomunikasi di Amerika Utara dan Uni Eropa telah memberikan persetujuan operasional penuh untuk uji coba publik triwulan ini, membuka babak baru pemerataan akses data berkecepatan tinggi di seluruh dunia.</p>`,
  image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
  category_id: catGlobal,
  featured: 1,
  views: 4210,
  lang: 'id'
});

if (enSat) {
  linkPair(enSat.id, idSatId);
  console.log(`🔗 Linked Pair 2 (Satellite Grid): EN(${enSat.id}) <-> ID(${idSatId})`);
}

// Pair 3: Whoosh High Speed Rail (Pair with ID 28)
const idWhoosh = db.prepare("SELECT id FROM articles WHERE slug = 'uji-coba-kereta-cepat-whoosh-koridor-lanjutan-tembus-kecepatan-350-kmjam-tanpa-kendala'").get();
const enWhooshId = upsertArticle({
  title: 'Whoosh Bullet Train Expansion Hits 350 Km/h Barrier in Flawless High-Speed Trial Run',
  slug: 'whoosh-bullet-train-expansion-hits-350-kmh-barrier-flawless-trial-run',
  excerpt: 'Southeast Asia’s pioneer high-speed rail corridor proves structural stability and vibration damping at top operating speeds during comprehensive multi-phase testing.',
  content: `<p><strong>BANDUNG &amp; JAKARTA</strong> — The Whoosh high-speed rail network in Indonesia achieved another operational benchmark during extended technical evaluations, clocking sustained velocities of 350 km/h across expanded track sectors without recorded mechanical deviation.</p>

<h2>Precision Engineering on Volcanic Topography</h2>
<p>Engineers recorded comprehensive telemetry along elevated viaducts and tunnel passages, noting that dynamic ballast stabilizers kept lateral vibrations well below strict international safety thresholds. The trial affirms the readiness of the corridor for heavy passenger rotations heading into seasonal travel peaks.</p>

<p>International rail transit authorities have highlighted the project as a benchmark for modern transport infrastructure across Southeast Asia, combining electrical efficiency with rapid intercity connectivity.</p>`,
  image: 'https://images.unsplash.com/photo-1532103054090-a33923a78320?w=1200&auto=format&fit=crop&q=80',
  category_id: catGlobal,
  featured: 1,
  views: 6890,
  lang: 'en'
});

if (idWhoosh) {
  linkPair(idWhoosh.id, enWhooshId);
  console.log(`🔗 Linked Pair 3 (Whoosh): ID(${idWhoosh.id}) <-> EN(${enWhooshId})`);
}

// Pair 4: Solid-State EV Battery Breakthrough (New Viral Pair)
const enBatteryId = upsertArticle({
  title: 'Solid-State Battery Revolution Unlocks 1,200 Km Range for Next-Generation Electric Vehicles',
  slug: 'solid-state-battery-revolution-unlocks-1200-km-ev-range',
  excerpt: 'Breakthrough ceramic-electrolyte cells charge in eight minutes and eliminate thermal runaway risks, clearing the hurdle for mass-market long-range electric mobility.',
  content: `<p><strong>STUTTGART &amp; TOKYO</strong> — Automotive battery researchers have formally verified a commercial-grade solid-state battery cell capable of powering mid-size electric passenger vehicles past 1,200 kilometers on a single charge.</p>

<h2>Eight-Minute High-Voltage Fast Charging</h2>
<p>By substituting flammable liquid electrolytes with flexible ceramic-polymer composites, the prototype cells operate safely up to 90 degrees Celsius without degradation. Laboratory stress tests indicate over 2,500 continuous charge cycles while retaining 92 percent of original energy density.</p>

<blockquote>
"This transition removes range anxiety from the EV equation while substantially reducing raw cobalt dependency," stated researchers during the technical reveal.
</blockquote>

<p>Automakers plan pilot integration on assembly lines starting early 2027, accelerating the global transition away from combustion drivetrains across North America, Europe, and Asia.</p>`,
  image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1200&auto=format&fit=crop&q=80',
  category_id: catGlobal,
  featured: 1,
  views: 8920,
  lang: 'en'
});

const idBatteryId = upsertArticle({
  title: 'Revolusi Baterai Solid-State Hadirkan Jarak Tempuh 1.200 Km untuk Kendaraan Listrik Masa Depan',
  slug: 'revolusi-baterai-solid-state-hadirkan-jarak-tempuh-1200-km-kendaraan-listrik',
  excerpt: 'Inovasi elektrolit padat mampu mengisi daya penuh dalam waktu delapan menit tanpa risiko panas berlebih, menuntaskan kekhawatiran jarak tempuh mobil listrik.',
  content: `<p><strong>STUTTGART &amp; TOKYO</strong> — Peneliti industri otomotif berhasil memverifikasi sel baterai solid-state skala komersial yang mampu membawa kendaraan listrik menempuh jarak lebih dari 1.200 kilometer dalam satu kali pengisian daya.</p>

<h2>Pengisian Cepat Delapan Menit Tanpa Risiko Terbakar</h2>
<p>Menggantikan elektrolit cair yang mudah terbakar dengan komposit keramik-polimer lentur, sel purwarupa ini terbukti stabil hingga suhu 90 derajat Celsius. Uji coba laboratorium menunjukkan ketahanan lebih dari 2.500 siklus isi-ulang dengan retensi kapasitas di atas 92 persen.</p>

<p>Pabrikan mobil dunia menjadwalkan integrasi lini perakitan mulai awal 2027, mempercepat transisi energi bersih di sektor transportasi global secara masif.</p>`,
  image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1200&auto=format&fit=crop&q=80',
  category_id: catTech,
  featured: 1,
  views: 6140,
  lang: 'id'
});

linkPair(enBatteryId, idBatteryId);
console.log(`🔗 Linked Pair 4 (Solid-State Battery): EN(${enBatteryId}) <-> ID(${idBatteryId})`);

// Pair 5: Humanoid Robotics in Manufacturing (New Viral Pair)
const enRoboId = upsertArticle({
  title: 'Humanoid AI Robotics Achieve Autonomous Dexterity Milestone Across Advanced Smart Factories',
  slug: 'humanoid-ai-robotics-achieve-autonomous-dexterity-milestone-factories',
  excerpt: 'Bipedal robotic workforces equipped with real-time computer vision take over delicate logistics and precision assembly in automotive and electronics plants.',
  content: `<p><strong>DETROIT &amp; SEOUL</strong> — Next-generation humanoid robots driven by end-to-end neural vision models have commenced continuous 24-hour shifts inside advanced automotive manufacturing facilities, executing intricate wire harness installations with sub-millimeter precision.</p>

<h2>From Research Demos to Industrial Reality</h2>
<p>Unlike fixed robotic arms constrained to rigid caged tracks, these bipedal systems navigate dynamic warehouse environments autonomously, adapting to human co-workers and unexpected floor obstacles in real time.</p>

<p>Factory directors report a 40 percent drop in repetitive strain incidents alongside enhanced throughput consistency, marking a pivotal evolutionary step in global advanced manufacturing.</p>`,
  image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&auto=format&fit=crop&q=80',
  category_id: catGlobal,
  featured: 1,
  views: 9450,
  lang: 'en'
});

const idRoboId = upsertArticle({
  title: 'Robot Humanoid Berbasis AI Capai Rekor Otonom Penuh di Pabrik Modern Dunia',
  slug: 'robot-humanoid-berbasis-ai-capai-rekor-otonom-penuh-pabrik-modern-dunia',
  excerpt: 'Tenaga robotik bipedal dengan penglihatan komputer mutakhir mulai mengambil alih perakitan komponen presisi tinggi di industri otomotif dan semikonduktor global.',
  content: `<p><strong>DETROIT &amp; SEOUL</strong> — Robot humanoid generasi terbaru yang digerakkan oleh model visi saraf tiruan telah memulai operasional penuh 24 jam di pabrik perakitan otomotif mutakhir, menangani pemasangan kabel presisi tinggi secara mandiri.</p>

<h2>Navigasi Mandiri di Lingkungan Pabrik Kompleks</h2>
<p>Berbeda dengan lengan robot stasioner, robot berkaki dua ini mampu bermanuver di lingkungan dinamis bersama pekerja manusia tanpa memerlukan penanda khusus di lantai pabrik.</p>

<p>Manajemen pabrik mencatat peningkatan efisiensi perakitan hingga 40 persen sekaligus menghilangkan risiko cedera kerja pada tugas-tugas repetitif berat.</p>`,
  image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&auto=format&fit=crop&q=80',
  category_id: catTech,
  featured: 1,
  views: 7820,
  lang: 'id'
});

linkPair(enRoboId, idRoboId);
console.log(`🔗 Linked Pair 5 (Humanoid AI): EN(${enRoboId}) <-> ID(${idRoboId})`);

// Pair 6: Nusantara Smart Green Metropolis (New Viral Pair)
const enNusantaraId = upsertArticle({
  title: 'Nusantara Smart Capital: Inside Southeast Asia’s 100% Renewable Green Metropolis',
  slug: 'nusantara-smart-capital-inside-southeast-asias-green-metropolis',
  excerpt: 'How Indonesia’s planned rainforest capital combines solar microgrids, autonomous transit corridors, and circular bio-architecture into a living climate resilience model.',
  content: `<p><strong>NUSANTARA</strong> — Rising within the tropical landscape of East Kalimantan, Indonesia’s new administrative capital, Nusantara (IKN), is drawing worldwide attention as an operational blueprint for net-zero urbanization in the 21st century.</p>

<h2>Forest City Framework Powered by Microgrids</h2>
<p>Over 70 percent of Nusantara’s master plan is preserved as indigenous rainforest canopy and bio-diverse botanical corridors. Electric autonomous shuttles, intelligent water reclamation networks, and localized solar storage arrays ensure municipal carbon neutrality.</p>

<p>International urban planning delegations have praised Nusantara’s sponge-city architecture, which harnesses natural wetlands to regulate monsoon stormwater while maintaining cooler microclimates across residential and commercial sectors.</p>`,
  image: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=1200&auto=format&fit=crop&q=80',
  category_id: catGlobal,
  featured: 1,
  views: 11200,
  lang: 'en'
});

const idNusantaraId = upsertArticle({
  title: 'Ibu Kota Nusantara: Mengintip Kota Cerdas Berbasis 100 Persen Energi Terbarukan Pertama di Asia Tenggara',
  slug: 'ibu-kota-nusantara-mengintip-kota-cerdas-berbasis-energi-terbarukan',
  excerpt: 'Konsep kota hutan tropis Nusantara memadukan jaringan listrik tenaga surya, transportasi otonom, dan arsitektur ramah lingkungan sebagai percontohan ketahanan iklim dunia.',
  content: `<p><strong>NUSANTARA</strong> — Tumbuh di tengah bentang alam Kalimantan Timur, Ibu Kota Nusantara (IKN) memikat sorotan dunia sebagai model metropolitan cerdas berkelanjutan yang menyeimbangkan kemajuan teknologi dengan kelestarian alam tropis.</p>

<h2>Konsep Kota Spons dan Netralitas Karbon</h2>
<p>Lebih dari 70 persen area Nusantara didedikasikan untuk ruang terbuka hijau dan koridor satwa liar. Armada transportasi massal bertenaga listrik tanpa awak serta instalasi panel surya skala kawasan memastikan efisiensi konsumsi energi terbarukan secara mandiri.</p>

<p>Delegasi tata kota internasional mengapresiasi sistem drainase alami berbasis konsep spons yang mampu mengelola limpasan air hujan ekstrem sekaligus menjaga suhu mikro perkotaan tetap sejuk dan asri.</p>`,
  image: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=1200&auto=format&fit=crop&q=80',
  category_id: catNasional,
  featured: 1,
  views: 12500,
  lang: 'id'
});

linkPair(enNusantaraId, idNusantaraId);
console.log(`🔗 Linked Pair 6 (Nusantara Metropolis): EN(${enNusantaraId}) <-> ID(${idNusantaraId})`);

console.log('✅ All viral multilingual pairs generated and linked successfully!');
