const db = require('../db/database');
const { encrypt, decrypt } = require('../utils/crypto');

const ADCASH_BASE_URL = 'https://adcash.myadcash.com/api/v2';

// In-memory / cache storage
let cache = {
  key: null,
  timestamp: 0,
  data: null
};

// Access token cache to avoid exchanging API token on every request
let accessTokenCache = {
  apiToken: null,
  token: null,
  expiresAt: 0
};

/**
 * Get stored Adcash API Token (from DB or process.env)
 */
function getApiToken() {
  if (process.env.ADCASH_API_TOKEN) {
    return process.env.ADCASH_API_TOKEN.trim();
  }
  const row = db.prepare("SELECT value FROM settings WHERE key = 'adcash_api_token'").get();
  if (row && row.value) {
    return decrypt(row.value);
  }
  return '';
}

/**
 * Save Adcash API Token encrypted into database
 */
function saveApiToken(plainToken) {
  if (!plainToken) {
    db.prepare("DELETE FROM settings WHERE key = 'adcash_api_token'").run();
  } else {
    const encrypted = encrypt(plainToken.trim());
    db.prepare("INSERT INTO settings (key, value) VALUES ('adcash_api_token', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(encrypted);
  }
  // Invalidate tokens and caches
  accessTokenCache = { apiToken: null, token: null, expiresAt: 0 };
  cache = { key: null, timestamp: 0, data: null };
}

/**
 * Exchange API Token for Access Token (/auth/token)
 */
async function getAccessToken(apiToken) {
  const now = Date.now();
  if (accessTokenCache.apiToken === apiToken && accessTokenCache.token && accessTokenCache.expiresAt > now + 60000) {
    return accessTokenCache.token;
  }

  const res = await fetch(`${ADCASH_BASE_URL}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ token: apiToken })
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body.message || body.error || (res.status === 401 ? 'API Token tidak valid atau kadaluarsa.' : `Gagal autentikasi API: status ${res.status}`);
    throw new Error(msg);
  }

  // Expect token or access_token in response
  const token = body.token || body.access_token || body.data?.token || body.data?.access_token;
  if (!token) {
    throw new Error('Format respon token dari Adcash tidak dikenali.');
  }

  const expiresIn = Number(body.expires_in || 3600) * 1000;
  accessTokenCache = {
    apiToken,
    token,
    expiresAt: now + expiresIn
  };

  return token;
}

/**
 * Fetch reports from /publishers/reports
 * @param {Object} options { period: 'today'|'week'|'month', forceRefresh: boolean }
 */
async function getReports(options = {}) {
  const apiToken = getApiToken();
  if (!apiToken) {
    return {
      configured: false,
      error: 'API Key belum dikonfigurasi. Silakan masukkan API Token Adcash Anda di form pengaturan.',
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

  // Calculate start & end date (YYYY-MM-DD)
  const today = new Date();
  const endDate = today.toISOString().slice(0, 10);
  let startDate = endDate;

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
    const accessToken = await getAccessToken(apiToken);
    
    // Fetch reports & balance in parallel
    const [reportRes, balanceRes] = await Promise.all([
      fetch(`${ADCASH_BASE_URL}/publishers/reports?start_date=${startDate}&end_date=${endDate}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }),
      fetch(`${ADCASH_BASE_URL}/publishers/balance`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }).catch(() => null)
    ]);

    const reportJson = await reportRes.json().catch(() => ({}));
    if (!reportRes.ok) {
      const msg = reportJson.message || reportJson.error || (reportRes.status === 401 ? 'Access Token kadaluarsa atau tidak memiliki hak akses.' : `Error Adcash API: ${reportRes.status}`);
      throw new Error(msg);
    }

    let balance = 0;
    let currency = 'USD';
    if (balanceRes && balanceRes.ok) {
      const bJson = await balanceRes.json().catch(() => ({}));
      balance = Number(bJson.balance || bJson.data?.balance || 0);
      currency = bJson.currency || bJson.data?.currency || 'USD';
    }

    // Parse items array
    const rawRows = Array.isArray(reportJson) 
      ? reportJson 
      : (Array.isArray(reportJson.data) ? reportJson.data : (Array.isArray(reportJson.rows) ? reportJson.rows : []));

    // Calculate aggregated totals
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalRevenue = 0;

    const formattedRows = rawRows.map(row => {
      const imps = Number(row.impressions || row.views || 0);
      const clks = Number(row.clicks || 0);
      const rev = Number(row.earnings || row.revenue || row.money || 0);
      const ctr = imps > 0 ? ((clks / imps) * 100) : Number(row.ctr || 0);
      const cpm = imps > 0 ? ((rev / imps) * 1000) : Number(row.cpm || row.ecpm || 0);

      totalImpressions += imps;
      totalClicks += clks;
      totalRevenue += rev;

      return {
        date: row.date || row.day || endDate,
        zoneId: row.zone_id || row.zone || row.zoneId || 'Semua Zone',
        zoneName: row.zone_name || row.zoneName || 'Ad Zone',
        website: row.website || row.site || 'Nusantara News',
        impressions: imps,
        clicks: clks,
        ctr: parseFloat(ctr.toFixed(2)),
        cpm: parseFloat(cpm.toFixed(2)),
        revenue: parseFloat(rev.toFixed(4))
      };
    });

    const averageCtr = totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
    const averageCpm = totalImpressions > 0 ? parseFloat(((totalRevenue / totalImpressions) * 1000).toFixed(2)) : 0;

    const resultData = {
      period,
      startDate,
      endDate,
      balance,
      currency,
      summary: {
        impressions: totalImpressions,
        clicks: totalClicks,
        ctr: averageCtr,
        cpm: averageCpm,
        revenue: parseFloat(totalRevenue.toFixed(2))
      },
      rows: formattedRows
    };

    // Save to cache
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
    console.error('Adcash Reporting API Error:', err.message);
    return {
      configured: true,
      error: err.message || 'Terjadi kesalahan saat menghubungi server Adcash.',
      data: null
    };
  }
}

module.exports = {
  getApiToken,
  saveApiToken,
  getReports
};
