// src/services/serverless.js
const API_BASE = 'https://efolio-api.nzhu0009.workers.dev'; 

export async function summarizeRatings(ratings = []) {
  const res = await fetch(`${API_BASE}/reviews/summary`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ratings })
  })
  const data = await res.json()
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Serverless summary failed')
  }
  return data // { ok, count, avg, min, max, buckets }
}

export async function health() {
  const res = await fetch(`${API_BASE}/health`)
  return res.json()
}
