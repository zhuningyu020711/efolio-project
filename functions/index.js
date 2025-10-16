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

/* ========= 4) POI /mapPOI ========= */
exports.mapPOI = onRequest(
  { region: 'us-central1', secrets: [MAPBOX_TOKEN] },
  async (req, res) => {
    try {
      if (req.method === 'OPTIONS') return ok(res, {});
      const token = MAPBOX_TOKEN.value();
      if (!token || !token.startsWith('pk.')) return fail(res, 500, 'MAPBOX_TOKEN malformed');

      const qRaw = (req.query.q || 'poi').toString();
      const center = parseLngLatPair(req.query.center);
      if (!center) return fail(res, 400, 'Missing center');

      const limit = Math.min(parseInt(req.query.limit || '15', 10), 20);
      const radiusKm = Math.max(Number(req.query.radiusKm || '1.2'), 0.2);

      const bbox = buildBbox(center, radiusKm).join(',');
      const common = `proximity=${center[0]},${center[1]}&limit=${limit}&language=en&autocomplete=false&access_token=${token}`;

      const trials = [
        { q: qRaw, types: 'poi,poi.landmark', useBbox: true },
        { q: qRaw, types: 'poi,poi.landmark', useBbox: false },
        { q: qRaw, types: '', useBbox: false },
        { q: 'poi', types: 'poi,poi.landmark', useBbox: true },
      ];

      let features = [];
      for (const t of trials) {
        const params =
          `${common}` + (t.types ? `&types=${t.types}` : '') + (t.useBbox ? `&bbox=${bbox}` : '');
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(t.q)}.json?${params}`;

        const r = await fetch(url);
        const j = await r.json();

        if (Array.isArray(j.features) && j.features.length) {
          features = j.features.map(f => ({
            text: f.text,
            place_name: f.place_name,
            coordinates: f.center,
          }));
          break;
        }
      }

      return ok(res, { features });
    } catch (err) {
      logger.error('mapPOI error', err);
      return fail(res, 500, err.message);
    }
  }
);
