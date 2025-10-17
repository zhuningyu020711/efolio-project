<!-- src/components/ServerlessDemo.vue -->
<template>
  <section class="wrap card">
    <h2 class="h2">Serverless</h2>
    <p class="muted">
      This page showcases a serverless feature for the campus event system:
      <strong>Event Weather (OpenWeather)</strong> — get a same-day forecast by calling a Cloud Function
      (<code>/eventWeatherOW</code>).
    </p>

    <!-- ===== Cloud Function: Event Weather ===== -->
    <fieldset class="block">
      <legend>Event Weather (Cloud Function)</legend>

      <div class="grid">
        <label class="cell">
          <span class="lbl">Latitude</span>
          <input v-model.trim="lat" class="input" type="text" inputmode="decimal" placeholder="-37.8136" />
        </label>

        <label class="cell">
          <span class="lbl">Longitude</span>
          <input v-model.trim="lng" class="input" type="text" inputmode="decimal" placeholder="144.9631" />
        </label>

        <label class="cell">
          <span class="lbl">Date</span>
          <input v-model="date" class="input" type="date" />
        </label>
      </div>

      <div class="row">
        <button class="btn" @click="useCampus">Use campus sample</button>
        <button class="btn primary" @click="getWeather" :disabled="busy">Get Weather</button>
        <span class="status" v-if="busy">Loading…</span>
        <span class="status err" v-else-if="err">{{ err }}</span>
        <span class="status ok"  v-else-if="okMsg">{{ okMsg }}</span>
      </div>

      <details v-if="endpoint" class="ep">
        <summary>Function base URL</summary>
        <code>{{ endpoint }}</code>
      </details>

      <div v-if="view" class="result">
        <h3 class="h3">Forecast</h3>
        <ul>
          <li><strong>Summary:</strong> {{ view.summary || '-' }}</li>
          <li><strong>Temp:</strong> {{ fmt(view.temp) }} °C</li>
          <li><strong>Wind:</strong> {{ fmt(view.wind) }} m/s</li>
          <li><strong>Time:</strong> {{ view.time || (date || '') }}</li>
        </ul>

        <details class="raw">
          <summary>Raw response (JSON)</summary>
          <pre class="pre">{{ resultRaw }}</pre>
        </details>
      </div>
    </fieldset>

    <!-- ===== Public API Explorer ===== -->
    <fieldset class="block">
      <legend>Public API Explorer — /eventWeatherOW</legend>

      <div class="grid">
        <label class="cell">
          <span class="lbl">Latitude</span>
          <input v-model.trim="xLat" class="input" type="text" inputmode="decimal" />
        </label>

        <label class="cell">
          <span class="lbl">Longitude</span>
          <input v-model.trim="xLng" class="input" type="text" inputmode="decimal" />
        </label>

        <label class="cell">
          <span class="lbl">Date</span>
          <input v-model="xDate" class="input" type="date" />
        </label>
      </div>

      <div class="row">
        <button class="btn" @click="fillExplorer">Use campus sample</button>
        <button class="btn" @click="openInNew">Open in new tab</button>
        <button class="btn" @click="fetchHere" :disabled="xBusy">Fetch here</button>
      </div>

      <div class="mini">
        <span class="lbl">Example endpoint</span>
        <input class="input mono" :value="exampleUrl" readonly />
      </div>

      <details v-if="xJson" class="raw">
        <summary>Response</summary>
        <pre class="pre">{{ xJson }}</pre>
      </details>
    </fieldset>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'

/* ---------- Env & Base URL ---------- */
const REGION  = import.meta.env.VITE_FUNCTIONS_REGION || 'us-central1'
const PROJECT = import.meta.env.VITE_FIREBASE_PROJECT_ID || ''
const FUNCS_BASE =
  import.meta.env.VITE_FUNCS_BASE ||
  (REGION && PROJECT ? `https://${REGION}-${PROJECT}.cloudfunctions.net` : '')

/* ---------- Form state ---------- */
const lat  = ref('-37.8136')
const lng  = ref('144.9631')
const date = ref(new Date().toISOString().slice(0, 10))

const busy  = ref(false)
const err   = ref('')
const okMsg = ref('')
const view  = ref(null)     // 解析后的可读结果
const resultRaw = ref('')

const endpoint = computed(() => FUNCS_BASE ? `${FUNCS_BASE}/eventWeatherOW` : '(Missing VITE_FUNCS_BASE / REGION+PROJECT)')

function useCampus () {
  lat.value = '-37.8136'
  lng.value = '144.9631'
  date.value = new Date().toISOString().slice(0, 10)
}

/* ---------- 工具：显示数字 ---------- */
function fmt (n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '-'
  const v = Number(n)
  return Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(1)
}

/* ---------- 统一解析后端返回 ---------- */
function toView(j) {
  // 1) 你现在后端的常见结构：today + raw
  const t = j?.today || {}
  const first = j?.raw?.list?.[0] || {}

  const summary =
    t.desc ||
    first?.weather?.[0]?.description ||
    j?.weather?.description ||
    j?.description ||
    j?.summary || ''

  const temp =
    t.temp ??
    j?.temp ??
    first?.main?.temp ??
    j?.main?.temp

  const wind =
    (t.wind && (t.wind.speed ?? t.wind)) ??
    (j?.wind && j.wind.speed) ??
    first?.wind?.speed ??
    j?.wind_speed

  const time =
    t.at ||
    j?.time ||
    first?.dt_txt ||
    j?.dt_txt ||
    j?.date

  return { summary, temp, wind, time }
}

/* ---------- Call function ---------- */
async function getWeather () {
  err.value = ''; okMsg.value = ''; view.value = null; resultRaw.value = ''
  if (!FUNCS_BASE) { err.value = 'Function base URL is empty. Check .env: VITE_FUNCS_BASE or REGION/PROJECT.'; return }

  const _lat = Number(String(lat.value).trim())
  const _lng = Number(String(lng.value).trim())
  if (Number.isNaN(_lat) || Number.isNaN(_lng)) { err.value = 'Missing lat/lon'; return }

  // 同时带 lng & lon
  const q = new URLSearchParams({
    lat : String(_lat),
    lng : String(_lng),
    lon : String(_lng),
    date: (date.value || '').slice(0, 10)
  })
  const url = `${FUNCS_BASE}/eventWeatherOW?${q.toString()}`
  busy.value = true
  try {
    const r = await fetch(url)
    const j = await r.json().catch(() => ({}))
    if (!r.ok || j.ok === false) {
      throw new Error(j.error || `HTTP ${r.status}`)
    }
    view.value = toView(j)
    resultRaw.value = JSON.stringify(j, null, 2)
    okMsg.value = 'Success'
  } catch (e) {
    err.value = String(e.message || e)
  } finally {
    busy.value = false
  }
}

/* ---------- Explorer ---------- */
const xLat  = ref(lat.value)
const xLng  = ref(lng.value)
const xDate = ref(date.value)
const xBusy = ref(false)
const xJson = ref('')

const exampleUrl = computed(() => {
  if (!FUNCS_BASE) return ''
  const _lat = Number(String(xLat.value || '').trim())
  const _lng = Number(String(xLng.value || '').trim())
  const q = new URLSearchParams({
    lat : String(_lat),
    lng : String(_lng),
    lon : String(_lng),
    date: (xDate.value || '').slice(0, 10)
  })
  return `${FUNCS_BASE}/eventWeatherOW?${q.toString()}`
})

function fillExplorer () {
  xLat.value  = '-37.8136'
  xLng.value  = '144.9631'
  xDate.value = new Date().toISOString().slice(0, 10)
}

function openInNew () {
  if (!exampleUrl.value) return
  window.open(exampleUrl.value, '_blank')
}

async function fetchHere () {
  xBusy.value = true
  xJson.value = ''
  try {
    const r = await fetch(exampleUrl.value)
    const j = await r.json().catch(() => ({}))
    xJson.value = JSON.stringify(j, null, 2)
  } catch (e) {
    xJson.value = `ERROR: ${String(e.message || e)}`
  } finally {
    xBusy.value = false
  }
}
</script>

<style scoped>
.wrap{max-width:980px;margin:18px auto}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px}
.h2{margin:0 0 6px}
.h3{margin:12px 0 6px}
.muted{color:#6b7280;margin:0 0 10px}
.block{border-top:1px dashed #e5e7eb;margin-top:14px;padding-top:12px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.cell{display:flex;flex-direction:column;gap:6px}
.lbl{font-weight:600}
.input{border:1px solid #cbd5e1;border-radius:8px;padding:8px}
.input.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.row{display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap}
.btn{border:1px solid #cbd5e1;background:#f3f4f6;border-radius:8px;padding:8px 12px;cursor:pointer}
.btn.primary{background:#2563eb;color:#fff;border-color:#2563eb}
.status{font-size:14px}
.status.ok{color:#16a34a}
.status.err{color:#b91c1c}
.result ul{margin:0 0 8px 16px}
.pre{background:#0b1020;color:#e5e7eb;border-radius:8px;padding:10px;overflow:auto}
.raw{margin-top:8px}
.ep{margin-top:8px}
@media (max-width:860px){ .grid{grid-template-columns:1fr} }
</style>
