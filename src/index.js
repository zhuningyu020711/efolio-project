// src/index.js
function json(data, init = {}) {
    return new Response(JSON.stringify(data), {
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "content-type",
      },
      ...init,
    });
  }
  
  export default {
    async fetch(request) {
      // CORS 预检
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-headers": "content-type, authorization",
            "access-control-allow-methods": "GET, POST, OPTIONS",
          },
        });
      }
  
      const url = new URL(request.url);
  
      // 健康检查
      if (url.pathname === "/health") {
        return json({ ok: true, ts: new Date().toISOString() });
      }
  
      // 评分聚合：POST /reviews/summary { ratings: number[] }
      if (url.pathname === "/reviews/summary" && request.method === "POST") {
        try {
          const body = await request.json();
          const arr = Array.isArray(body?.ratings) ? body.ratings : [];
          const nums = arr.map(Number).filter(Number.isFinite);
  
          const count = nums.length;
          const sum = nums.reduce((a, b) => a + b, 0);
          const avg = count ? sum / count : 0;
          const min = count ? Math.min(...nums) : null;
          const max = count ? Math.max(...nums) : null;
  
          // 0~5 取最接近的整数星级
          const buckets = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0 };
          for (const n of nums) {
            const k = Math.max(0, Math.min(5, Math.round(n)));
            buckets[k] += 1;
          }
  
          return json({ ok: true, count, avg, min, max, buckets });
        } catch (e) {
          return json({ ok: false, error: e?.message || "Bad JSON" }, { status: 400 });
        }
      }
  
      return json({ ok: false, error: "Not found" }, { status: 404 });
    },
  };
  