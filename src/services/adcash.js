const db = require('../db/database');
const { encrypt, decrypt } = require('../utils/crypto');

const ADSTERRA_BASE_URL = 'https://api3.adsterratools.com/publisher';
const ADCASH_BASE_URL = 'https://adcash.myadcash.com/api/v2';

// In-memory cache storage (1 hour TTL per provider)
const caches = {
  adsterra: { key: null, timestamp: 0, data: null },
  adcash: { key: null, timestamp: 0, data: null }
};

// Adcash JWT bearer token cache (valid 15 minutes, buffer 2 minutes)
let adcashBearerCache = {
  token: null,
  expiresAt: 0
};

// Adsterra placements metadata cache
let placementsCache = {
  timestamp: 0,
  map: {}
};

/**
 * Get stored API Token (from DB or process.env)
 * @param {'adsterra'|'adcash'} provider
 */
function getApiToken(provider = 'adsterra') {
  if (provider === 'adsterra') {
    if (process.env.ADSTERRA_API_KEY) {
      return process.env.ADSTERRA_API_KEY.trim();
    }
    const row = db.prepare("SELECT value FROM settings WHERE key = 'adcash_api_token'").get();
    if (row && row.value) return decrypt(row.value);
    return '';
  }

  if (provider === 'adcash') {
    if (process.env.ADCASH_API_KEY) {
      return process.env.ADCASH_API_KEY.trim();
    }
    const row = db.prepare("SELECT value FROM settings WHERE key = 'adcash_v2_token'").get();
    if (row && row.value) return decrypt(row.value);
    return '';
  }

  return '';
}

/**
 * Save API Token encrypted into database
 * @param {'adsterra'|'adcash'} provider
 * @param {string} plainToken
 */
function saveApiToken(provider = 'adsterra', plainToken) {
  const settingKey = provider === 'adcash' ? 'adcash_v2_token' : 'adcash_api_token';

  if (!plainToken) {
    db.prepare("DELETE FROM settings WHERE key = ?").run(settingKey);
  } else {
    const encrypted = encrypt(plainToken.trim());
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(settingKey, encrypted);
  }

  // Invalidate caches
  if (caches[provider]) {
    caches[provider] = { key: null, timestamp: 0, data: null };
  }
  if (provider === 'adcash') {
    adcashBearerCache = { token: null, expiresAt: 0 };
  }
  if (provider === 'adsterra') {
    placementsCache = { timestamp: 0, map: {} };
  }
}

/**
 * Exchange Adcash api_token for JWT access_token
 */
async function getAdcashBearerToken(apiToken) {
  const now = Date.now();
  if (adcashBearerCache.token && now < adcashBearerCache.expiresAt) {
    return adcashBearerCache.token;
  }

  const res = await fetch(`${ADCASH_BASE_URL}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ api_token: apiToken })
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.data || !body.data.access_token) {
    const err = body.error && body.error.message ? body.error.message : `Autentikasi Adcash gagal (HTTP ${res.status})`;
    throw new Error(err);
  }

  const expiresInSec = Number(body.data.expires_in) || 900;
  adcashBearerCache = {
    token: body.data.access_token,
    expiresAt: now + (expiresInSec - 120) * 1000 // refresh 2 min early
  };

  return adcashBearerCache.token;
}

/**
 * Fetch Adcash reports (Publisher Reporting API v2)
 */
async function getAdcashReports(options = {}) {
  const apiToken = getApiToken('adcash');
  if (!apiToken) {
    return {
      provider: 'adcash',
      configured: false,
      error: 'API Token Adcash belum dikonfigurasi. Silakan simpan token di pengaturan API Adcash.',
      data: null
    };
  }

  const period = options.period || 'today';
  const forceRefresh = Boolean(options.forceRefresh);
  const cacheKey = `adcash_${period}`;
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  if (!forceRefresh && caches.adcash.key === cacheKey && (now - caches.adcash.timestamp < ONE_HOUR) && caches.adcash.data) {
    return {
      provider: 'adcash',
      configured: true,
      cached: true,
      cacheTime: new Date(caches.adcash.timestamp),
      ...caches.adcash.data
    };
  }

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
    const bearer = await getAdcashBearerToken(apiToken);

    // Fetch zone breakdown and date breakdown in parallel + balance
    const [zoneRes, dateRes, balanceRes] = await Promise.all([
      fetch(`${ADCASH_BASE_URL}/publishers/reports?start_date=${startDate}&end_date=${finishDate}&group_by=zone`, {
        headers: { 'Authorization': `Bearer ${bearer}`, 'Accept': 'application/json' }
      }),
      fetch(`${ADCASH_BASE_URL}/publishers/reports?start_date=${startDate}&end_date=${finishDate}&group_by=date`, {
        headers: { 'Authorization': `Bearer ${bearer}`, 'Accept': 'application/json' }
      }),
      fetch(`${ADCASH_BASE_URL}/publishers/balance`, {
        headers: { 'Authorization': `Bearer ${bearer}`, 'Accept': 'application/json' }
      }).catch(() => null)
    ]);

    const zoneJson = await zoneRes.json().catch(() => ({}));
    const dateJson = await dateRes.json().catch(() => ({}));
    const balanceJson = balanceRes && balanceRes.ok ? await balanceRes.json().catch(() => ({})) : {};

    if (!zoneRes.ok) {
      const err = zoneJson.error?.message || `Adcash API error (HTTP ${zoneRes.status})`;
      throw new Error(err);
    }

    const zoneRows = Array.isArray(zoneJson.data?.rows) ? zoneJson.data.rows : [];
    const dateRows = Array.isArray(dateJson.data?.rows) ? dateJson.data.rows : [];

    // Aggregate totals from date rows (or zone rows if date rows empty)
    const rowsToSum = dateRows.length > 0 ? dateRows : zoneRows;
    let totalEarnings = 0;
    let totalUniqueUsers = 0;
    let totalClicks = 0;

    rowsToSum.forEach(r => {
      totalEarnings += parseFloat(r.earnings || 0);
      totalUniqueUsers += parseInt(r.unique_users || 0, 10);
      totalClicks += parseInt(r.clicks || 0, 10);
    });

    const averageCtr = totalUniqueUsers > 0 ? parseFloat(((totalClicks / totalUniqueUsers) * 100).toFixed(2)) : 0;
    const averageEcpm = totalUniqueUsers > 0 ? parseFloat(((totalEarnings / totalUniqueUsers) * 1000).toFixed(3)) : 0;

    const formattedZones = zoneRows.map(z => ({
      placementId: z.zone,
      title: z.parent_zone ? `Sub-Zone #${z.zone}` : `Zone #${z.zone}`,
      alias: z.parent_zone ? `Parent: #${z.parent_zone}` : 'Direct Zone',
      impressions: parseInt(z.unique_users || 0, 10), // Adcash publisher reporting uses unique users / visitors
      clicks: parseInt(z.clicks || 0, 10),
      ctr: parseInt(z.unique_users || 0, 10) > 0 ? parseFloat(((parseInt(z.clicks || 0, 10) / parseInt(z.unique_users || 0, 10)) * 100).toFixed(2)) : 0,
      cpm: parseFloat(z.unique_users_ecpm || 0),
      revenue: parseFloat(parseFloat(z.earnings || 0).toFixed(4)),
      fallback: parseInt(z.unique_users_fallback || 0, 10),
      rejected: parseInt(z.unique_users_rejected || 0, 10)
    })).sort((a, b) => b.impressions - a.impressions);

    // Sort date rows ascending for charts
    const sortedDateRows = [...dateRows].sort((a, b) => (a.date > b.date ? 1 : -1));

    const resultData = {
      period,
      startDate,
      endDate: finishDate,
      currency: zoneJson.meta?.currency || 'USD',
      balance: balanceJson.data ? balanceJson.data.balance : null,
      balanceCurrency: balanceJson.data ? balanceJson.data.currency : 'USD',
      summary: {
        impressions: totalUniqueUsers,
        clicks: totalClicks,
        ctr: averageCtr,
        cpm: averageEcpm,
        revenue: parseFloat(totalEarnings.toFixed(4))
      },
      dailyRows: sortedDateRows.map(d => ({
        date: d.date,
        impressions: parseInt(d.unique_users || 0, 10),
        clicks: parseInt(d.clicks || 0, 10),
        ctr: parseInt(d.unique_users || 0, 10) > 0 ? parseFloat(((parseInt(d.clicks || 0, 10) / parseInt(d.unique_users || 0, 10)) * 100).toFixed(2)) : 0,
        cpm: parseFloat(d.unique_users_ecpm || 0),
        revenue: parseFloat(parseFloat(d.earnings || 0).toFixed(4))
      })),
      placementRows: formattedZones
    };

    caches.adcash = {
      key: cacheKey,
      timestamp: now,
      data: resultData
    };

    return {
      provider: 'adcash',
      configured: true,
      cached: false,
      cacheTime: new Date(now),
      ...resultData
    };

  } catch (err) {
    console.error('Adcash Reporting API Error:', err.message);
    return {
      provider: 'adcash',
      configured: true,
      error: err.message || 'Gagal mengambil data dari Adcash API.',
      data: null
    };
  }
}

/**
 * Fetch Placements dictionary from Adsterra
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
 */
async function getAdsterraReports(options = {}) {
  const apiKey = getApiToken('adsterra');
  if (!apiKey) {
    return {
      provider: 'adsterra',
      configured: false,
      error: 'API Key Adsterra belum dikonfigurasi. Silakan masukkan API Key di modal konfigurasi.',
      data: null
    };
  }

  const period = options.period || 'today';
  const forceRefresh = Boolean(options.forceRefresh);
  const cacheKey = `adsterra_${period}`;
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  if (!forceRefresh && caches.adsterra.key === cacheKey && (now - caches.adsterra.timestamp < ONE_HOUR) && caches.adsterra.data) {
    return {
      provider: 'adsterra',
      configured: true,
      cached: true,
      cacheTime: new Date(caches.adsterra.timestamp),
      ...caches.adsterra.data
    };
  }

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
      const msg = dateJson.message || dateJson.error || (dateStatsRes.status === 401 ? 'API Key Adsterra tidak valid (401).' : `Error API: Status ${dateStatsRes.status}`);
      throw new Error(msg);
    }

    const dateItems = Array.isArray(dateJson.items) ? dateJson.items : [];
    let placementItems = [];
    if (placementStatsRes && placementStatsRes.ok) {
      const pJson = await placementStatsRes.json().catch(() => ({}));
      placementItems = Array.isArray(pJson.items) ? pJson.items : [];
    }

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

    const formattedPlacements = placementItems.map(p => {
      const info = placementsMap[p.placement] || {};
      const imps = Number(p.impression || 0);
      const clks = Number(p.clicks || 0);
      const rev = Number(p.revenue || 0);
      const ctr = Number(p.ctr || (imps > 0 ? (clks / imps * 100) : 0));
      const cpm = Number(p.cpm || (imps > 0 ? (rev / imps * 1000) : 0));

      return {
        placementId: p.placement,
        title: info.title || `Placement #${p.placement}`,
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

    caches.adsterra = {
      key: cacheKey,
      timestamp: now,
      data: resultData
    };

    return {
      provider: 'adsterra',
      configured: true,
      cached: false,
      cacheTime: new Date(now),
      ...resultData
    };

  } catch (err) {
    console.error('Adsterra Reporting API Error:', err.message);
    return {
      provider: 'adsterra',
      configured: true,
      error: err.message || 'Terjadi kendala saat menghubungi server Adsterra API.',
      data: null
    };
  }
}

/**
 * Universal dispatcher
 */
async function getReports(options = {}) {
  const provider = options.provider === 'adcash' ? 'adcash' : 'adsterra';
  if (provider === 'adcash') {
    return getAdcashReports(options);
  }
  return getAdsterraReports(options);
}

module.exports = {
  getApiToken,
  saveApiToken,
  getReports,
  getAdcashReports,
  getAdsterraReports
};
