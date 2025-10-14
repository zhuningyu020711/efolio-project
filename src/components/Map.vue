<template>
  <section class="wrap">
    <div class="panel">
      <h2>Map & Geo Features</h2>

      <div v-if="picking" class="pick-banner">
        Selecting: <strong>{{ picking }}</strong> — click on the map to set {{ picking }}
        <button type="button" class="btn" @click.stop.prevent="picking=null">Cancel</button>
      </div>

      <!-- Route Planning -->
      <div class="block">
        <h3>Route to Event</h3>

        <div class="row">
          <div class="cell">
            <span class="lbl">From</span>
            <div ref="fromBox" class="geocoder"></div>
            <div class="mini">
              <button type="button" class="btn" @click.stop.prevent="useMyLocation('from')">Use my location</button>
              <button type="button" class="btn" @click.stop.prevent="togglePick('from')">
                {{ picking==='from' ? 'Click on map…' : 'Pick on map' }}
              </button>
            </div>
          </div>

          <div class="cell">
            <span class="lbl">To</span>
            <div ref="toBox" class="geocoder"></div>
            <div class="mini">
              <button type="button" class="btn" @click.stop.prevent="useMyLocation('to')">Use my location</button>
              <button type="button" class="btn" @click.stop.prevent="togglePick('to')">
                {{ picking==='to' ? 'Click on map…' : 'Pick on map' }}
              </button>
            </div>
          </div>
        </div>

        <div class="row">
          <div class="cell">
            <span class="lbl">Profile</span>
            <div class="mini">
              <label><input type="radio" value="driving" v-model="profile" /> Driving</label>
              <label><input type="radio" value="walking" v-model="profile" /> Walking</label>
              <label><input type="radio" value="cycling" v-model="profile" /> Cycling</label>
            </div>
          </div>
          <div class="cell">
            <span class="lbl">&nbsp;</span>
            <div class="mini">
              <button type="button" class="btn" :disabled="!from || !to" @click.stop.prevent="swap">Swap</button>
              <button type="button" class="btn primary" :disabled="!from || !to" @click.stop.prevent="buildRoute">Build Route to Event</button>
            </div>
          </div>
        </div>

        <div class="stats" v-if="routeInfo">
          <span class="pill">Distance: <strong>{{ (routeInfo.distance/1000).toFixed(2) }} km</strong></span>
          <span class="pill">Duration: <strong>{{ (routeInfo.duration/60).toFixed(0) }} min</strong></span>
        </div>
        <details v-if="steps.length" class="steps">
          <summary>Steps ({{ steps.length }})</summary>
          <ol><li v-for="(s,i) in steps" :key="i">{{ s }}</li></ol>
        </details>
      </div>

      <!-- Nearby Facilities -->
      <div class="block">
        <h3>Nearby Facilities</h3>
        <div class="row">
          <div class="cell">
            <span class="lbl">Facility Type</span>
            <select v-model="poiCategory" class="input">
              <option v-for="c in categories" :key="c.q" :value="c.q">{{ c.label }}</option>
            </select>
          </div>
          <div class="cell">
            <span class="lbl">Center</span>
            <select v-model="poiCenter" class="input">
              <option value="map">Map Center</option>
              <option value="from" :disabled="!from">From</option>
              <option value="to" :disabled="!to">To</option>
            </select>
          </div>
          <div class="cell">
            <span class="lbl">Radius (km)</span>
            <input class="input" type="number" min="0.2" step="0.2" v-model.number="radiusKm" />
          </div>
          <div class="cell">
            <span class="lbl">&nbsp;</span>
            <button type="button" class="btn" @click.stop.prevent="searchPOI">Search Facilities</button>
          </div>
        </div>
        <div v-if="pois.length" class="mini muted">{{ pois.length }} facility found</div>
      </div>
    </div>

    <div ref="mapEl" class="map" role="region" aria-label="Interactive map showing route and nearby facilities"></div>
  </section>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import mapboxgl from 'mapbox-gl'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
mapboxgl.accessToken = MAPBOX_TOKEN

const REGION  = import.meta.env.VITE_FUNCTIONS_REGION || 'us-central1'
const PROJECT = import.meta.env.VITE_FIREBASE_PROJECT_ID
const BASE    = `https://${REGION}-${PROJECT}.cloudfunctions.net`  // /mapDirections /mapPOI

const mapEl = ref(null)
const fromBox = ref(null)
const toBox = ref(null)

const map = ref(null)
const profile = ref('driving')
const from = ref(null)
const to = ref(null)
const fromMarker = ref(null)
const toMarker = ref(null)
const routeId = 'route-line'
const routeSourceId = 'route-src'
const steps = ref([])
const routeInfo = ref(null)
const picking = ref(null)

/* English facility categories */
const categories = [
  { q: 'restaurant,cafe,food', label: 'Food & Drink' },
  { q: 'parking,parking lot', label: 'Parking' },
  { q: 'bus station,subway station,train station,tram stop,transit station', label: 'Public Transport' },
  { q: 'stadium,arena,conference center,exhibition hall,concert hall,venue', label: 'Venues' },
]
const poiCategory = ref(categories[0].q)
const poiCenter = ref('map')
const radiusKm = ref(1.0)
const pois = ref([])
const poiMarkers = ref([])
let poiAborter = null

function makeMarker(lngLat, color='#2563eb'){ return new mapboxgl.Marker({ color }).setLngLat(lngLat).addTo(map.value) }
function clearRoute(){
  steps.value = []; routeInfo.value = null
  if (map.value?.getLayer(routeId)) map.value.removeLayer(routeId)
  if (map.value?.getSource(routeSourceId)) map.value.removeSource(routeSourceId)
}
function clearPoi(){ poiMarkers.value.forEach(m => m.remove()); poiMarkers.value = []; pois.value = [] }
function swap(){ const tmp = from.value; from.value = to.value; to.value = tmp; clearRoute() }
function fitBoundsToPoints(points){ const b = new mapboxgl.LngLatBounds(); points.forEach(p => b.extend([p.lng, p.lat])); map.value.fitBounds(b, { padding: 60, duration: 600 }) }
function togglePick(which){ picking.value = picking.value === which ? null : which }

/* --- Directions --- */
async function buildRoute(){
  if (!from.value || !to.value) return
  clearRoute()
  try{
    const q = new URLSearchParams({
      profile: profile.value,
      from: `${from.value.lng},${from.value.lat}`,
      to:   `${to.value.lng},${to.value.lat}`,
    })
    const res = await fetch(`${BASE}/mapDirections?${q.toString()}`, { method:'GET' })
    const data = await res.json()
    if (!data.ok) throw new Error(data.error || 'Route failed')

    const geo = { type:'Feature', geometry: data.geometry, properties:{} }
    map.value.addSource(routeSourceId, { type:'geojson', data: geo })
    map.value.addLayer({
      id: routeId, type:'line', source: routeSourceId,
      paint: { 'line-color': '#2563eb', 'line-width': 5, 'line-opacity': 0.85 }
    })

    routeInfo.value = { distance: data.distance, duration: data.duration }
    steps.value = data.steps || []

    const coords = data.geometry.coordinates.map(([lng,lat]) => ({ lng, lat }))
    fitBoundsToPoints([from.value, to.value, ...coords.slice(0,1), ...coords.slice(-1)])
  }catch(err){
    alert(`Route failed: ${err.message}`)
  }
}

/* --- POI Search --- */
async function searchPOI(){
  if (poiAborter) poiAborter.abort()
  poiAborter = new AbortController()

  clearPoi()
  let center
  if (poiCenter.value === 'from' && from.value) center = [from.value.lng, from.value.lat]
  else if (poiCenter.value === 'to' && to.value) center = [to.value.lng, to.value.lat]
  else center = map.value.getCenter().toArray()

  try{
    const q = new URLSearchParams({
      q: poiCategory.value,
      center: `${center[0]},${center[1]}`,
      limit: '15',
      radiusKm: String(Math.max(radiusKm.value || 1, 0.2))
    })
    const res = await fetch(`${BASE}/mapPOI?${q.toString()}`, { signal: poiAborter.signal })
    const data = await res.json()
    if (!data.ok) {
      alert(data.error || 'POI failed')
      return
    }

    const list = data.features || []
    if (!list.length){
      alert('No facilities found within the given radius.')
      return
    }

    list.forEach(f => {
      const [lng, lat] = f.coordinates
      const m = new mapboxgl.Marker({ color: '#f59e0b' })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 8 }).setHTML(`<strong>${f.text || 'Unnamed'}</strong>`))
        .addTo(map.value)
      poiMarkers.value.push(m)
    })
    pois.value = list

    const b = new mapboxgl.LngLatBounds()
    list.forEach(f => b.extend(f.coordinates)); b.extend(center)
    map.value.fitBounds(b, { padding: 60, duration: 600 })
  }catch(err){
    if (err.name === 'AbortError') return
    alert(`POI failed: ${err.message}`)
  }
}

/* --- Pick & Geolocation --- */
function useMyLocation(which){
  if (!navigator.geolocation) return alert('Geolocation not available')
  navigator.geolocation.getCurrentPosition(pos => {
    const ll = { lng: pos.coords.longitude, lat: pos.coords.latitude, name: 'My location' }
    if (which === 'from'){ from.value = ll; fromMarker.value?.remove(); fromMarker.value = makeMarker(ll, '#16a34a') }
    else { to.value = ll; toMarker.value?.remove(); toMarker.value = makeMarker(ll, '#ef4444') }
    map.value.flyTo({ center: [ll.lng, ll.lat], zoom: 13, duration: 600 })
    picking.value = null; clearRoute()
  }, err => alert(err.message))
}

watch(picking, (val) => {
  const canvas = map.value?.getCanvas?.(); if (!canvas) return
  canvas.style.cursor = val ? 'crosshair' : ''
})

/* --- Map Initialization --- */
onMounted(() => {
  const m = new mapboxgl.Map({
    container: mapEl.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [144.9631, -37.8136],
    zoom: 11
  })
  map.value = m

  m.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right')
  m.addControl(new mapboxgl.FullscreenControl(), 'top-right')
  m.addControl(new mapboxgl.ScaleControl({ maxWidth: 120, unit: 'metric' }))
  const geo = new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true })
  m.addControl(geo, 'top-right')

  const common = { accessToken: MAPBOX_TOKEN, mapboxgl, marker: false, proximity: { longitude: 144.9631, latitude: -37.8136 }, types: 'address,poi,place' }
  const gcFrom = new MapboxGeocoder({ ...common, placeholder: 'Search origin…' })
  const gcTo   = new MapboxGeocoder({ ...common, placeholder: 'Search destination…' })
  gcFrom.addTo(fromBox.value); gcTo.addTo(toBox.value)

  gcFrom.on('result', (e) => {
    const [lng, lat] = e.result.center
    from.value = { lng, lat, name: e.result.place_name }
    fromMarker.value?.remove(); fromMarker.value = makeMarker([lng, lat], '#16a34a')
    picking.value = null; clearRoute()
  })
  gcTo.on('result', (e) => {
    const [lng, lat] = e.result.center
    to.value = { lng, lat, name: e.result.place_name }
    toMarker.value?.remove(); toMarker.value = makeMarker([lng, lat], '#ef4444')
    picking.value = null; clearRoute()
  })

  m.on('click', (ev) => {
    if (!picking.value) return
    const ll = { lng: ev.lngLat.lng, lat: ev.lngLat.lat, name: 'Picked' }
    if (picking.value === 'from'){ from.value = ll; fromMarker.value?.remove(); fromMarker.value = makeMarker(ll, '#16a34a') }
    else { to.value = ll; toMarker.value?.remove(); toMarker.value = makeMarker(ll, '#ef4444') }
    picking.value = null; clearRoute()
  })
})

onBeforeUnmount(() => { clearPoi(); if (map.value) map.value.remove() })
</script>

<style scoped>
.wrap{display:grid;grid-template-columns:380px 1fr;gap:12px}
.panel{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px}
.block{border-top:1px dashed #e5e7eb;padding-top:12px;margin-top:10px}
.row{display:grid;gap:10px;grid-template-columns:1fr 1fr}
.cell{display:flex;flex-direction:column;gap:6px}
.lbl{font-weight:600}
.input{border:1px solid #d1d5db;border-radius:8px;padding:8px}
.btn{border:1px solid #cbd5e1;background:#f3f4f6;border-radius:8px;padding:8px 12px;cursor:pointer}
.btn.primary{background:#2563eb;color:#fff;border-color:#2563eb}
.pill{display:inline-flex;gap:6px;align-items:center;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:999px;padding:2px 8px}
.stats{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}
.mini{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12px}
.muted{color:#6b7280}
.map{height:72vh;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}
.pick-banner{margin:8px 0; padding:8px; border-radius:8px; background:#f1f5ff; border:1px solid #c7d2fe; display:flex; gap:8px; align-items:center; flex-wrap:wrap}
.geocoder{position:relative; z-index:1001}
.geocoder :deep(.mapboxgl-ctrl-geocoder){display:block; position:relative; min-width:100%}
@media (max-width: 920px){ .wrap{grid-template-columns:1fr} .map{height:60vh} }
</style>

<style>
@import 'mapbox-gl/dist/mapbox-gl.css';
@import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
</style>
