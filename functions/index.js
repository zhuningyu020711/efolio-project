// functions/index.js
// Node 18+ 环境，自带 fetch
const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const { defineSecret } = require('firebase-functions/params');

/* ========= Secrets ========= */
const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY');
const MAPBOX_TOKEN = defineSecret('MAPBOX_TOKEN');

/* ========= Utils ========= */
function setCors(res) {
  res.set({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
}
function ok(res, data) { setCors(res); return res.status(200).send(JSON.stringify({ ok: true, ...data })); }
function fail(res, code = 500, msg = 'Internal error') { setCors(res); return res.status(code).send(JSON.stringify({ ok: false, error: msg })); }

function parseLngLatPair(v) {
  if (!v) return null;
  const [lng, lat] = v.toString().split(',').map(Number);
  if (!isFinite(lng) || !isFinite(lat)) return null;
  return [lng, lat];
}
function buildBbox(center, radiusKm = 1) {
  const [lng, lat] = center;
  const R = 6371;
  const dLat = radiusKm / R;
  const dLon = radiusKm / (R * Math.cos((Math.PI * lat) / 180));
  return [lng - dLon, lat - dLat, lng + dLon, lat + dLat];
}

/* ========= 1) Adder /add ========= */
exports.add = onRequest({ region: 'us-central1' }, async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return ok(res, {});
    const a = Number(req.query.a);
    const b = Number(req.query.b);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return fail(res, 400, 'Bad params');
    return ok(res, { result: a + b });
  } catch (err) {
    logger.error('add error', err);
    return fail(res, 500, err.message);
  }
});

/* ========= 2) Send email /sendgrid-proxy =========
  请求体支持：
  {
    to: "a@x.com,b@y.com"  或 ["a@x.com","b@y.com"],
    subject: "Title",
    message: "Plain text body",
    attachment: {           // 可选
      filename: "poster.pdf",
      contentType: "application/pdf",   // 可选
      base64: "<纯base64字符串，不带data:前缀>"
    }
  }
*/
exports['sendgrid-proxy'] = onRequest(
  { region: 'us-central1', secrets: [SENDGRID_API_KEY] },
  async (req, res) => {
    try {
      setCors(res);
      if (req.method === 'OPTIONS') return ok(res, {});
      if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');

      const body = req.body || {};
      let { to, subject, message, attachment } = body;

      // 解析收件人：允许 CSV 或数组
      let recipients = [];
      if (Array.isArray(to)) recipients = to;
      else if (typeof to === 'string') {
        recipients = to.split(',').map(s => s.trim()).filter(Boolean);
      }
      recipients = recipients.filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
      if (recipients.length === 0) return fail(res, 400, 'No valid recipient');

      if (!subject || !message) return fail(res, 400, 'Missing subject/message');

      const apiKey = SENDGRID_API_KEY.value();
      if (!apiKey || !apiKey.startsWith('SG.')) return fail(res, 500, 'SENDGRID_API_KEY not set');

      // 构建 SendGrid payload
      const payload = {
        personalizations: [{ to: recipients.map(email => ({ email })) }],
        from: { email: 'noreply@campus-demo.local' },   // 这里必须是你在 SendGrid 验证通过的发件人
        subject,
        content: [{ type: 'text/plain', value: message }],
      };

      if (attachment && attachment.base64 && attachment.filename) {
        payload.attachments = [{
          filename: attachment.filename,
          type: attachment.contentType || 'application/octet-stream',
          disposition: 'attachment',
          content: attachment.base64, // 纯 base64 字符串
        }];
      }

      const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!sgRes.ok) {
        const t = await sgRes.text();
        logger.error('Sendgrid failed', t);
        return fail(res, 502, 'Sendgrid request failed');
      }
      return ok(res, { sent: true, recipients: recipients.length });
    } catch (err) {
      logger.error('sendgrid error', err);
      return fail(res, 500, err.message);
    }
  }
);

/* ========= 3) Directions /mapDirections ========= */
exports.mapDirections = onRequest(
  { region: 'us-central1', secrets: [MAPBOX_TOKEN] },
  async (req, res) => {
    try {
      if (req.method === 'OPTIONS') return ok(res, {});
      const token = MAPBOX_TOKEN.value();
      if (!token || !token.startsWith('pk.')) return fail(res, 500, 'MAPBOX_TOKEN malformed');

      const profile = (req.query.profile || 'driving').toString();
      const from = parseLngLatPair(req.query.from);
      const to = parseLngLatPair(req.query.to);
      if (!from || !to) return fail(res, 400, 'Missing or bad from/to');

      const url =
        `https://api.mapbox.com/directions/v5/mapbox/${encodeURIComponent(profile)}/` +
        `${from[0]},${from[1]};${to[0]},${to[1]}?geometries=geojson&steps=true&overview=full&access_token=${token}`;

      const r = await fetch(url);
      const j = await r.json();

      if (!j.routes || !j.routes.length) return fail(res, 404, 'No route found');
      const route = j.routes[0];
      const steps = (route.legs?.[0]?.steps || [])
        .map(s => s.maneuver?.instruction).filter(Boolean);

      return ok(res, {
        geometry: route.geometry,
        distance: route.distance,
        duration: route.duration,
        steps,
      });
    } catch (err) {
      logger.error('mapDirections error', err);
      return fail(res, 500, err.message);
    }
  }
);

/* ========================================================
 * POI（附近地点搜索）稳定回退版
 * ======================================================*/
 /* ========================================================
 * POI（附近地点搜索）稳定回退版
 * ======================================================*/
/* ========================================================
 * POI（附近地点搜索）稳定回退版
 * ======================================================*/
exports.mapPOI = onRequest({ region: "us-central1", secrets: [MAPBOX_TOKEN] }, async (req, res) => {
  try {
    const token = MAPBOX_TOKEN.value();
    if (!token || !token.startsWith("pk.")) return fail(res, 500, "MAPBOX_TOKEN malformed");

    const qRaw = (req.query.q || "poi").toString(); // e.g. "restaurant"
    const center = parseLngLatPair(req.query.center);
    if (!center) return fail(res, 400, "Missing center");

    const limit = Math.min(parseInt(req.query.limit || "15", 10), 25);
    const radiusKm = Math.max(Number(req.query.radiusKm || "1.2"), 0.2);
    const bbox = buildBbox(center, radiusKm).join(",");

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(qRaw)}.json` +
      `?proximity=${center[0]},${center[1]}&bbox=${bbox}&types=poi&limit=${limit}&access_token=${token}`;

    logger.info("mapPOI", { url });
    const r = await fetch(url);
    const j = await r.json();

    if (!Array.isArray(j.features) || !j.features.length) {
      return ok(res, { features: [] }); // 不报错，只返回空数组
    }
  

    const features = j.features.map(f => ({
      text: f.text,
      place_name: f.place_name,
      coordinates: [f.center[0], f.center[1]],
    }));

    logger.info("mapPOI features", { count: features.length });
    return ok(res, { features });
  } catch (err) {
    logger.error("mapPOI error", err);
    return fail(res, 500, err.message || "Internal error");
  }
});
// functions/index.js （追加）
// ----------------------------------------------------
// Event Weather (OpenWeather) — /eventWeatherOW
// Params: lat, lng, date(YYYY-MM-DD)
// 汇总当日最高/最低温、最大风速、降水总量、最大降水概率(pop)
// 来源：OpenWeather 5-day / 3-hour forecast (免费档可用)
// ----------------------------------------------------




// ----------------------------------------------------
// Event Weather (OpenWeather) — /eventWeatherOW
// Params: lat, lng, date(YYYY-MM-DD)
// 汇总当日最高/最低温、最大风速、降水总量、最大降水概率(pop)
// 来源：OpenWeather 5-day / 3-hour forecast (免费档可用)
// ----------------------------------------------------



const OPENWEATHER_KEY = defineSecret("OPENWEATHER_KEY");

function ok(res, data) {
  res.set({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
  });
  return res.status(200).send(JSON.stringify({ ok: true, ...data }));
}
function fail(res, code = 500, msg = "Internal error") {
  res.set({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
  });
  return res.status(code).send(JSON.stringify({ ok: false, error: msg }));
}
function parsePair(v) {
  if (!v) return null;
  const [a, b] = v.toString().split(",").map(Number);
  if (!isFinite(a) || !isFinite(b)) return null;
  return [a, b];
}

// /eventWeatherOW?lat=-37.8136&lng=144.9631&date=2025-10-05
exports.eventWeatherOW = onRequest(
  { region: "us-central1", secrets: [OPENWEATHER_KEY] },
  async (req, res) => {
    try {
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      const date = (req.query.date || "").toString(); // YYYY-MM-DD

      if (!isFinite(lat) || !isFinite(lng)) {
        return fail(res, 400, "Missing/invalid lat,lng");
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        // 如果没给日期就用今天（UTC）
        const d = new Date();
        const iso = d.toISOString().slice(0, 10);
        req.query.date = iso;
      }
      const target = (req.query.date || "").toString();

      const key = OPENWEATHER_KEY.value();
      if (!key) return fail(res, 500, "OPENWEATHER_KEY not set");

      // 5-day / 3-hour 预报
      // 文档: https://openweathermap.org/forecast5
      const url =
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}` +
        `&appid=${key}&units=metric`;

      const r = await fetch(url);
      if (!r.ok) {
        return fail(res, 502, `Upstream error: ${r.status}`);
      }
      const j = await r.json();
      const list = Array.isArray(j.list) ? j.list : [];

      // 过滤出目标日期（UTC）数据
      const dayItems = list.filter(
        (it) => new Date(it.dt * 1000).toISOString().slice(0, 10) === target
      );

      if (dayItems.length === 0) {
        // 可能是目标日超出5天窗口；返回可用的最接近的一天提示
        return ok(res, {
          message:
            "No forecast points for the requested date (outside 5-day window). Try a date within 5 days.",
          date: target,
          latitude: lat,
          longitude: lng,
          daily: null,
          hourly: null,
        });
      }

      // 汇总
      let tMax = -Infinity,
        tMin = Infinity,
        windMax = -Infinity,
        precipSum = 0,
        popMax = 0;

      const hourly = { time: [], temp: [], wind: [], pop: [], precip_3h: [] };

      for (const it of dayItems) {
        const t = it.main?.temp;
        const tmax = it.main?.temp_max;
        const tmin = it.main?.temp_min;
        const wind = it.wind?.speed ?? 0;
        const pop = (it.pop ?? 0) * 100;
        const rain3h = (it.rain && (it.rain["3h"] || 0)) || 0;
        const snow3h = (it.snow && (it.snow["3h"] || 0)) || 0;
        const p3h = rain3h + snow3h;

        if (isFinite(tmax) && tmax > tMax) tMax = tmax;
        if (isFinite(tmin) && tmin < tMin) tMin = tmin;
        if (isFinite(wind) && wind > windMax) windMax = wind;
        if (isFinite(p3h)) precipSum += p3h;
        if (isFinite(pop) && pop > popMax) popMax = pop;

        hourly.time.push(new Date(it.dt * 1000).toISOString());
        hourly.temp.push(t ?? null);
        hourly.wind.push(wind);
        hourly.pop.push(Math.round(pop));
        hourly.precip_3h.push(p3h);
      }

      const out = {
        ok: true,
        provider: "openweather",
        date: target,
        latitude: lat,
        longitude: lng,
        daily: {
          t_max: isFinite(tMax) ? Math.round(tMax * 10) / 10 : null,
          t_min: isFinite(tMin) ? Math.round(tMin * 10) / 10 : null,
          wind_max: isFinite(windMax) ? Math.round(windMax * 10) / 10 : null,
          precip_sum: Math.round(precipSum * 10) / 10, // mm
          precip_prob_max: Math.round(popMax), // %
        },
        hourly,
      };

      return ok(res, out);
    } catch (err) {
      return fail(res, 500, err?.message || "Internal error");
    }
  }
);