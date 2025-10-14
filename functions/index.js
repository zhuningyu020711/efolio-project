// functions/index.js —— CommonJS，Gen2 兼容稳定版
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { defineSecret } = require("firebase-functions/params");

// ---- Secrets ----
const MAPBOX_TOKEN = defineSecret("MAPBOX_TOKEN");

// ---- 通用响应工具 ----
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

// ---- 辅助函数 ----
function parseLngLatPair(v) {
  if (!v) return null;
  const [lng, lat] = v.toString().split(",").map(Number);
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

/* ========================================================
 * Directions（路线规划）
 * ======================================================*/
exports.mapDirections = onRequest({ region: "us-central1", secrets: [MAPBOX_TOKEN] }, async (req, res) => {
  try {
    const token = MAPBOX_TOKEN.value();
    if (!token || !token.startsWith("pk.")) return fail(res, 500, "MAPBOX_TOKEN malformed");

    const profile = (req.query.profile || "driving").toString();
    const from = parseLngLatPair(req.query.from);
    const to = parseLngLatPair(req.query.to);
    if (!from || !to) return fail(res, 400, "Missing or bad from/to");

    const url =
      `https://api.mapbox.com/directions/v5/mapbox/${encodeURIComponent(profile)}/` +
      `${from[0]},${from[1]};${to[0]},${to[1]}?geometries=geojson&steps=true&overview=full&access_token=${token}`;

    logger.info("mapDirections", { url });
    const r = await fetch(url);
    const j = await r.json();

    if (!j.routes || !j.routes.length) return fail(res, 404, "No route found");

    const route = j.routes[0];
    const steps = (route.legs?.[0]?.steps || []).map(s => s.maneuver?.instruction).filter(Boolean);

    // 前端使用 geometry 字段
    return ok(res, {
      geometry: route.geometry,
      distance: route.distance,
      duration: route.duration,
      steps,
    });
  } catch (err) {
    logger.error("mapDirections error", err);
    return fail(res, 500, err.message || "Internal error");
  }
});

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
      coordinates: f.center,
    }));

    logger.info("mapPOI features", { count: features.length });
    return ok(res, { features });
  } catch (err) {
    logger.error("mapPOI error", err);
    return fail(res, 500, err.message || "Internal error");
  }
});
