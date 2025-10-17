<template>
  <section class="card" aria-labelledby="srv-h1">
    <h1 id="srv-h1">Serverless</h1>
    <p class="muted">
      This page showcases a serverless feature for the campus event system:
      <strong>Event Weather (OpenWeather)</strong> — get a same-day forecast for your event
      by calling a Cloud Function (<code>/eventWeatherOW</code>).
    </p>

    <!-- Event Weather (Cloud Function) -->
    <fieldset class="box" aria-labelledby="weather-title">
      <legend id="weather-title">Event Weather (Cloud Function)</legend>

      <div class="row">
        <div class="cell grow">
          <label class="lbl" for="lat">Latitude</label>
          <input id="lat" class="input" v-model.number="lat" placeholder="-37.8136" aria-label="Latitude">
        </div>
        <div class="cell grow">
          <label class="lbl" for="lng">Longitude</label>
          <input id="lng" class="input" v-model.number="lng" placeholder="144.9631" aria-label="Longitude">
        </div>
        <div class="cell">
          <label class="lbl" for="date">Date</label>
          <input id="date" class="input" type="date" v-model="date" aria-label="Event date (optional)">
        </div>
      </div>

      <div class="row">
        <button type="button" class="btn" @click="fillCampus" aria-label="Use campus sample">Use campus sample</button>
        <button type="button" class="btn primary" @click="getWeather" aria-label="Get weather">Get Weather</button>
        <span class="muted" aria-live="polite">{{ status }}</span>
      </div>

      <div v-if="daily" class="result">
        <div class="stats">
          <span class="pill">Date: <strong>{{ resp.date }}</strong></span>
          <span class="pill">Max: <strong>{{ daily.t_max }}°C</strong></span>
          <span class="pill">Min: <strong>{{ daily.t_min }}°C</strong></span>
          <span class="pill">Rain (day): <strong>{{ daily.precip_sum }} mm</strong></span>
          <span class="pill">Rain Prob (max): <strong>{{ daily.precip_prob_max }}%</strong></span>
          <span class="pill">Wind (max): <strong>{{ daily.wind_max }} m/s</strong></span>
        </div>

        <details class="steps">
          <summary>Hourly (temperature / rain probability / wind)</summary>
          <div class="hourly">
            <div v-for="(t,i) in resp.hourly.time" :key="i" class="hour">
              <div class="time">{{ t.slice(11,16) }}</div>
              <div class="val">Temp: {{ resp.hourly.temp[i] }}°C</div>
              <div class="val">Rain: {{ resp.hourly.pop[i] }}%</div>
              <div class="val">Wind: {{ resp.hourly.wind[i] }} m/s</div>
              <div class="val">Precip-3h: {{ resp.hourly.precip_3h[i] }} mm</div>
            </div>
          </div>
        </details>
      </div>
    </fieldset>

    <!-- Public API Explorer — /eventWeatherOW -->
    <fieldset class="box" aria-labelledby="api-title">
      <legend id="api-title">Public API Explorer — <code>/eventWeatherOW</code></legend>

      <div class="row">
        <div class="cell grow">
          <label class="lbl" for="a-lat">Latitude</label>
          <input id="a-lat" class="input" v-model="api.lat">
        </div>
        <div class="cell grow">
          <label class="lbl" for="a-lng">Longitude</label>
          <input id="a-lng" class="input" v-model="api.lng">
        </div>
        <div class="cell">
          <label class="lbl" for="a-date">Date</label>
          <input id="a-date" class="input" type="date" v-model="api.date">
        </div>
      </div>

      <div class="row">
        <button type="button" class="btn" @click="fillApiSample">Use campus sample</button>
        <button type="button" class="btn" @click="openApi">Open in new tab</button>
        <button type="button" class="btn" @click="fetchApi">Fetch here</button>
      </div>

      <label class="lbl" for="urlBox">Example endpoint</label>
      <input id="urlBox" class="input mono" :value="apiUrl" readonly>

      <pre v-if="apiOut" class="out" aria-live="polite">{{ apiOut }}</pre>
    </fieldset>

    <details class="box">
      <summary>Function base URL</summary>
      <code class="mono">{{ BASE }}/eventWeatherOW?lat=-37.8136&lng=144.9631&date={{ today }}</code>
    </details>
  </section>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

const REGION  = import.meta.env.VITE_FUNCTIONS_REGION || 'us-central1'
const PROJECT = import.meta.env.VITE_FIREBASE_PROJECT_ID || ''
const BASE    = `https://${REGION}-${PROJECT}.cloudfunctions.net`

const lat   = ref(-37.8136)
const lng   = ref(144.9631)
const today = new Date().toISOString().slice(0,10)
const date  = ref(today)

const status = ref('')
const resp   = ref(null)
const daily  = computed(() => resp.value?.daily || null)

function fillCampus(){
  lat.value = -37.8136
  lng.value = 144.9631
  date.value = today
}

async function getWeather(){
  status.value = 'Loading…'
  resp.value = null
  try{
    const q = new URLSearchParams({
      lat: String(lat.value),
      lng: String(lng.value),
      date: date.value || ''
    })
    const r = await fetch(`${BASE}/eventWeatherOW?${q.toString()}`)
    const j = await r.json()
    if (!j.ok) { status.value = `Failed: ${j.error || 'Unknown error'}`; return }
    resp.value = j
    status.value = 'OK'
  }catch(e){
    status.value = `Failed: ${e.message}`
  }
}

/* ---- API Explorer ---- */
const api = reactive({ lat: String(lat.value), lng: String(lng.value), date: date.value })
const apiUrl = computed(() => {
  const q = new URLSearchParams({ lat: api.lat, lng: api.lng, date: api.date || '' })
  return `${BASE}/eventWeatherOW?${q.toString()}`
})
const apiOut = ref('')

function fillApiSample(){ api.lat = String(lat.value); api.lng = String(lng.value); api.date = date.value }
function openApi(){ window.open(apiUrl.value, '_blank') }
async function fetchApi(){
  apiOut.value = 'Loading…'
  try{
    const r = await fetch(apiUrl.value)
    const j = await r.json()
    apiOut.value = JSON.stringify(j, null, 2)
  }catch(e){ apiOut.value = `Error: ${e.message}` }
}
</script>

<style scoped>
.muted{color:#6b7280}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px}
.box{border:1px dashed #e5e7eb;border-radius:12px;padding:12px;margin:12px 0}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.cell{display:flex;flex-direction:column;gap:6px}
.cell.grow{flex:1 1 260px}
.lbl{font-weight:600}
.input{border:1px solid #d1d5db;border-radius:8px;padding:8px}
.mono{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace}
.btn{border:1px solid #cbd5e1;background:#f3f4f6;border-radius:8px;padding:8px 12px;cursor:pointer}
.btn.primary{background:#1d4ed8;color:#fff;border:none}
.pill{display:inline-flex;gap:6px;align-items:center;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:999px;padding:2px 8px}
.stats{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}
.steps{margin-top:8px}
.hourly{display:grid;grid-template-columns:repeat(auto-fill, minmax(160px,1fr));gap:8px;margin-top:8px}
.hour{border:1px solid #e5e7eb;border-radius:8px;padding:8px;background:#fafafa}
.out{white-space:pre-wrap;background:#0b1020;color:#e6edf3;border-radius:8px;padding:10px;overflow:auto}
</style>
