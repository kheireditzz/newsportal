const db = require('./src/db/database');

// 1. Pastikan kategori "Global Viral" & "Tech News" (English) tersedia
const insertCat = db.prepare(`
  INSERT INTO categories (name, slug, description, color) 
  VALUES (?, ?, ?, ?)
  ON CONFLICT(slug) DO UPDATE SET 
    name=excluded.name, 
    description=excluded.description, 
    color=excluded.color
`);

insertCat.run('Global Tech & Viral', 'global-tech', 'Breaking global technology, AI revolution, and viral worldwide news', '#0ea5e9');

const catRow = db.prepare("SELECT id FROM categories WHERE slug = 'global-tech'").get();
const categoryId = catRow ? catRow.id : 4; // fallback ke teknologi

// 2. Berita Berbahasa Inggris Kualitas Internasional (SEO Tier 1 US/UK Ready)
const englishArticles = [
  {
    title: 'Next-Gen Quantum AI Breakthrough Shakes Global Tech Industry: What You Need to Know',
    slug: 'next-gen-quantum-ai-breakthrough-shakes-global-tech-industry-2026',
    category_id: categoryId,
    featured: 1,
    views: 4892,
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    excerpt: 'Silicon Valley research consortium announces monumental quantum computing milestone capable of processing deep neural networks 1,000x faster than modern silicon chips.',
    content: `<p><strong>LONDON &amp; SAN FRANCISCO</strong> — In what technology analysts are describing as an unprecedented leap forward for artificial intelligence, an international consortium of quantum researchers and leading Silicon Valley enterprises has officially demonstrated a scalable fault-tolerant quantum processor optimized specifically for multimodal AI reasoning architectures.</p>

<h2>A Dramatic Leap in Computational Speed</h2>
<p>The breakthrough, unveiled earlier today during the Global Advanced Computing Summit in London, details how photonic qubit integration overcomes traditional decoherence thresholds at ambient room temperatures. Unlike classical server clusters requiring megawatts of electricity, the newly revealed hardware architecture executes ultra-dense tensor calculations with near-zero latency.</p>

<blockquote>
"This is not just an incremental step in semiconductor fabrication; it is an entirely fresh computing paradigm that unlocks real-time molecular modeling, climate forecasting, and automated scientific synthesis," stated the lead quantum architect during the keynote presentation.
</blockquote>

<h2>Global Market Impact and Tier 1 Industry Reaction</h2>
<p>Major markets responded immediately to the announcement across US and European exchanges. Technology indices saw significant trading volume as enterprise leaders in clean energy, biotechnology, and autonomous infrastructure began evaluating migration roadmaps towards quantum-ready microarchitectures.</p>

<p>Industry insiders emphasize that developers and digital publishers worldwide should prepare for an era where automated algorithmic discovery will outpace legacy computing boundaries. Nusantara News will continue providing live updates as technical specifications and commercial licensing guidelines are published this week.</p>`
  },
  {
    title: 'Global Tech Giants Announce Universal High-Speed Satellite Grid Across Europe and US',
    slug: 'global-tech-giants-universal-high-speed-satellite-grid-uk-us-2026',
    category_id: categoryId,
    featured: 1,
    views: 3120,
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
    excerpt: 'Next-generation low-earth orbit telecommunication network promises ultra-low latency internet access for urban and rural corridors across North America and the United Kingdom.',
    content: `<p><strong>WASHINGTON &amp; LONDON</strong> — Telecommunication giants and aerospace pioneers have formalized an unprecedented international pact to launch a synchronized mesh satellite constellation designed to deliver gigabit-tier internet connectivity to every corner of the United Kingdom, North America, and continental Europe.</p>

<h2>Democratizing High-Speed Bandwidth</h2>
<p>The multinational initiative aims to bridge existing digital divides by leveraging laser-interlinked orbital satellites. Devices will be capable of connecting directly to the satellite relay without bulky terrestrial receiver dishes, heralding a breakthrough for smart transportation, remote telework, and mobile communications.</p>

<p>Commercial deployment is slated to begin phased rollout later this quarter, backed by prominent European aerospace agencies and US federal communications regulators.</p>`
  }
];

const insertArticle = db.prepare(`
  INSERT INTO articles (title, slug, excerpt, content, image, category_id, author_id, status, featured, views, published_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, 1, 'published', ?, ?, datetime('now','localtime'), datetime('now','localtime'))
  ON CONFLICT(slug) DO UPDATE SET
    title=excluded.title,
    excerpt=excluded.excerpt,
    content=excluded.content,
    image=excluded.image,
    category_id=excluded.category_id,
    featured=excluded.featured,
    status='published',
    updated_at=datetime('now','localtime')
`);

for (const a of englishArticles) {
  insertArticle.run(a.title, a.slug, a.excerpt, a.content, a.image, a.category_id, a.featured, a.views);
  console.log('✅ Berhasil publish berita internasional:', a.title);
}

console.log('🎉 Selesai! Berita global berbahasa Inggris siap tembus traffic luar negeri.');
