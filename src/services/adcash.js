const db = require('../db/database');
const { encrypt, decrypt } = require('../utils/crypto');

const ADSTERRA_BASE_URL = 'https://api3.adsterratools.com/publisher';

// In-memory cache storage (1 hour TTL)
let cache = {
  key: null,
  timestamp: 0,
  data: null
};

// Placements metadata cache
let placementsCache = {
  timestamp: 0,
  map: {}
};

/**
 * Get stored API Token (from DB or process.env)
 */
function getApiToken() {
  if (process.env.ADSTERRA_API_KEY) {
    return process.env.ADSTERRA_API_KEY.trim();
  }
  const row = db.prepare("SELECT value FROM settings WHERE key = 'adcash_api_token'").get();
  if (row && row.value) {
    return decrypt(row.value);
  }
  return '';
}

/**
 * Save API Token encrypted into database
 */
function saveApiToken(plainToken) {
  if (!plainToken) {
    db.prepare("DELETE FROM settings WHERE key = 'adcash_api_token'").run();
  } else {
    const encrypted = encrypt(plainToken.trim());
    db.prepare("INSERT INTO settings (key, value) VALUES ('adcash_api_token', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(encrypted);
  }
  // Invalidate caches
  cache = { key: null, timestamp: 0, data: null };
  placementsCache = { timestamp: 0, map: {} };
}

/**
 * Fetch Placements dictionary to map placement_id to title & domain
 */
async function getPlacementsMap(apiKey) {
  const now = Date.now();
  if (placementsCache.map && (now - placementsCache.timestamp < 3600000)) {
    return placementsCache.map;
  }

  try {
    const res = await fetch(`${ADSTERRA_BASE_URL}/placements.json`, {
      headers: {
        'Accept': 'application/json',
        'X-API-Key': apiKey
      }
    });
    if (res.ok) {
      const json = await res.json();
      const map = {};
      (json.items || []).forEach(p => {
        map[p.id] = {
          title: p.title || p.alias || `Placement #${p.id}`,
          alias: p.alias || '',
          domainId: p.domain_id,
          directUrl: p.direct_url || ''
        };
      });
      placementsCache = { timestamp: now, map };
      return map;
    }
  } catch (e) {
    console.warn('Gagal memuat daftar placement Adsterra:', e.message);
  }
  return placementsCache.map || {};
}

/**
 * Fetch stats from Adsterra Publisher Reporting API
 * @param {Object} options { period: 'today'|'week'|'month', forceRefresh: boolean }
 */
async function getReports(options = {}) {
  const apiKey = getApiToken();
  if (!apiKey) {
    return {
      configured: false,
      error: 'API Key belum dikonfigurasi. Silakan masukkan API Key Anda di form konfigurasi.',
      data: null
    };
  }

  const period = options.period || 'today';
  const forceRefresh = Boolean(options.forceRefresh);
  const cacheKey = `${period}`;
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  if (!forceRefresh && cache.key === cacheKey && (now - cache.timestamp < ONE_HOUR) && cache.data) {
    return {
      configured: true,
      cached: true,
      cacheTime: new Date(cache.timestamp),
      ...cache.data
    };
  }

  // Calculate start & finish date (YYYY-MM-DD)
  const today = new Date();
  const finishDate = today.toISOString().slice(0, 10);
  let startDate = finishDate;

  if (period === 'week') {
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    startDate = d.toISOString().slice(0, 10);
  } else if (period === 'month') {
    const d = new Date(today);
    d.setDate(d.getDate() - 30);
    startDate = d.toISOString().slice(0, 10);
  }

  try {
    const [dateStatsRes, placementStatsRes, placementsMap] = await Promise.all([
      fetch(`${ADSTERRA_BASE_URL}/stats.json?start_date=${startDate}&finish_date=${finishDate}&group_by=date`, {
        headers: {
          'Accept': 'application/json',
          'X-API-Key': apiKey
        }
      }),
      fetch(`${ADSTERRA_BASE_URL}/stats.json?start_date=${startDate}&finish_date=${finishDate}&group_by=placement`, {
        headers: {
          'Accept': 'application/json',
          'X-API-Key': apiKey
        }
      }).catch(() => null),
      getPlacementsMap(apiKey)
    ]);

    const dateJson = await dateStatsRes.json().catch(() => ({}));

    if (!dateStatsRes.ok) {
      const msg = dateJson.message || dateJson.error || (dateStatsRes.status === 401 ? 'API Key tidak valid atau tidak memiliki otorisasi (401).' : `Error API: Status ${dateStatsRes.status}`);
      throw new Error(msg);
    }

    const dateItems = Array.isArray(dateJson.items) ? dateJson.items : [];
    let placementItems = [];
    if (placementStatsRes && placementStatsRes.ok) {
      const pJson = await placementStatsRes.json().catch(() => ({}));
      placementItems = Array.isArray(pJson.items) ? pJson.items : [];
    }

    // Totals aggregation
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalRevenue = 0;

    dateItems.forEach(item => {
      totalImpressions += Number(item.impression || 0);
      totalClicks += Number(item.clicks || 0);
      totalRevenue += Number(item.revenue || 0);
    });

    const averageCtr = totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
    const averageCpm = totalImpressions > 0 ? parseFloat(((totalRevenue / totalImpressions) * 1000).toFixed(3)) : 0;

    // Build placement breakdown
    const formattedPlacements = placementItems.map(p => {
      const info = placementsMap[p.placement] || {};
      const imps = Number(p.impression || 0);
      const clks = Number(p.clicks || 0);
      const rev = Number(p.revenue || 0);
      const ctr = Number(p.ctr || (imps > 0 ? (clks / imps * 100) : 0));
      const cpm = Number(p.cpm || (imps > 0 ? (rev / imps * 1000) : 0));

      return {
        placementId: p.placement,
        title: info.title || `Zone #${p.placement}`,
        alias: info.alias || '',
        directUrl: info.directUrl || '',
        impressions: imps,
        clicks: clks,
        ctr: parseFloat(ctr.toFixed(2)),
        cpm: parseFloat(cpm.toFixed(3)),
        revenue: parseFloat(rev.toFixed(4))
      };
    }).sort((a, b) => b.impressions - a.impressions);

    const resultData = {
      period,
      startDate,
      endDate: finishDate,
      currency: 'USD',
      summary: {
        impressions: totalImpressions,
        clicks: totalClicks,
        ctr: averageCtr,
        cpm: averageCpm,
        revenue: parseFloat(totalRevenue.toFixed(4))
      },
      dailyRows: dateItems.map(d => ({
        date: d.date,
        impressions: Number(d.impression || 0),
        clicks: Number(d.clicks || 0),
        ctr: parseFloat(Number(d.ctr || 0).toFixed(2)),
        cpm: parseFloat(Number(d.cpm || 0).toFixed(3)),
        revenue: parseFloat(Number(d.revenue || 0).toFixed(4))
      })),
      placementRows: formattedPlacements,
      itemCount: dateJson.itemCount || dateItems.length,
      dbLastUpdateTime: dateJson.dbLastUpdateTime || ''
    };

    // Cache results
    cache = {
      key: cacheKey,
      timestamp: now,
      data: resultData
    };

    return {
      configured: true,
      cached: false,
      cacheTime: new Date(now),
      ...resultData
    };

  } catch (err) {
    console.error('Publisher Reporting API Error:', err.message);
    return {
      configured: true,
      error: err.message || 'Terjadi kendala saat menghubungi server Reporting API.',
      data: null
    };
  }
}

module.exports = {
  getApiToken,
  saveApiToken,
  getReports
};
