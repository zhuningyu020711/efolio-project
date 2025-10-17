// functions/index.js — CommonJS for Firebase Functions (Gen2 friendly)
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { defineSecret } = require("firebase-functions/params");

const MAPBOX_TOKEN = defineSecret("MAPBOX_TOKEN");

// ---- helpers ----
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

// ---- Directions ----
exports.mapDirections = onRequest(
  { region: "us-central1", secrets: [MAPBOX_TOKEN] },
  async (req, res) => {
    try {
      const token = MAPBOX_TOKEN.value();
      if (!token || !token.startsWith("pk.")) {
        return fail(res, 500, "MAPBOX_TOKEN malformed");
      }
      const profile = (req.query.profile || "driving").toString();
      const from = parseLngLatPair(req.query.from);
      const to = parseLngLatPair(req.query.to);
      if (!from || !to) return fail(res, 400, "Missing or bad from/to");

      const url =
        `https://api.mapbox.com/directions/v5/mapbox/${encodeURIComponent(
          profile
        )}/` +
        `${from[0]},${from[1]};${to[0]},${to[1]}?geometries=geojson&steps=true&overview=full&access_token=${token}`;

      logger.info("mapDirections", { url });

      const r = await fetch(url);
      const j = await r.json();

      if (!j.routes || !j.routes.length) {
        return fail(res, 404, "No route found");
      }
      const route = j.routes[0];
      const steps = (route.legs?.[0]?.steps || [])
        .map((s) => s.maneuver?.instruction)
        .filter(Boolean);

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
  }
);

// ---- POI ----
exports.mapPOI = onRequest(
  { region: "us-central1", secrets: [MAPBOX_TOKEN] },
  async (req, res) => {
    try {
      const token = MAPBOX_TOKEN.value();
      if (!token || !token.startsWith("pk.")) {
        return fail(res, 500, "MAPBOX_TOKEN malformed");
      }

      const qRaw = (req.query.q || "poi").toString();
      const center = parseLngLatPair(req.query.center);
      if (!center) return fail(res, 400, "Missing center");

      const limit = Math.min(parseInt(req.query.limit || "15", 10), 20);
      const radiusKm = Math.max(Number(req.query.radiusKm || "1.2"), 0.2);

      const bbox = buildBbox(center, radiusKm).join(",");
      const common =
        `proximity=${center[0]},${center[1]}` +
        `&limit=${limit}` +
        `&language=en` +
        `&autocomplete=false` +
        `&access_token=${token}`;

      // 尽量在有 bbox 的前提下命中；如果空，再逐渐放宽条件
      const trials = [
        { q: qRaw, types: "poi,poi.landmark", useBbox: true },
        { q: qRaw, types: "poi,poi.landmark", useBbox: false },
        { q: qRaw, types: "", useBbox: false },
        { q: "poi", types: "poi,poi.landmark", useBbox: true },
      ];

      let features = [];
      for (const t of trials) {
        const params =
          `${common}` +
          (t.types ? `&types=${t.types}` : "") +
          (t.useBbox ? `&bbox=${bbox}` : "");

        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          t.q
        )}.json?${params}`;

        logger.info("mapPOI trial", { url });
        const r = await fetch(url);
        const j = await r.json();

        if (Array.isArray(j.features) && j.features.length) {
          // 这里只返回必须字段，避免体积过大
          features = j.features.map((f) => ({
            text: f.text,
            place_name: f.place_name,
            coordinates: f.center, // [lng, lat]
          }));
          break;
        }
      }

      logger.info("mapPOI features", { count: features.length });
      return ok(res, { features });
    } catch (err) {
      logger.error("mapPOI error", err);
      return fail(res, 500, err.message || "Internal error");
    }
  }
);
