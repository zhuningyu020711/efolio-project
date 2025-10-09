<template>
    <section class="wrap">
      <div class="panel">
        <h2>Map & Geo Features</h2>
  
        <!-- 当前拾取提示 -->
        <div v-if="picking" class="pick-banner">
          Picking: <strong>{{ picking }}</strong> — click the map to set {{ picking }}
          <button type="button" class="btn" @click.stop.prevent="picking=null">Cancel</button>
        </div>
  
        <!-- 路线规划 -->
        <div class="block">
          <h3>Route Planner</h3>
  
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
                <button type="button" class="btn primary" :disabled="!from || !to" @click.stop.prevent="buildRoute">Build Route</button>
              </div>
            </div>
          </div>
  
          <div class="stats" v-if="routeInfo">
            <span class="pill">Distance: <strong>{{ (routeInfo.distance/1000).toFixed(2) }} km</strong></span>
            <span class="pill">Duration: <strong>{{ (routeInfo.duration/60).toFixed(0) }} min</strong></span>
          </div>
          <details v-if="steps.length" class="steps">
            <summary>Steps ({{ steps.length }})</summary>
            <ol>
              <li v-for="(s,i) in steps" :key="i">{{ s }}</li>
            </ol>
          </details>
        </div>
  
        <!-- 附近 POI 搜索 -->
        <div class="block">
          <h3>Nearby Places</h3>
          <div class="row">
            <div class="cell">
              <span class="lbl">Category</span>
              <select v-model="poiCategory" class="input">
                <option v-for="c in categories" :key="c.q" :value="c.q">{{ c.label }}</option>
              </select>
            </div>
            <div class="cell">
              <span class="lbl">Center</span>
              <select v-model="poiCenter" class="input">
                <option value="map">Map center</option>
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
              <button type="button" class="btn" @click.stop.prevent="searchPOI">Search POI</button>
            </div>
          </div>
          <div v-if="pois.length" class="mini muted">{{ pois.length }} place(s) found</div>
        </div>
      </div>
  
      <div ref="mapEl" class="map"></div>
    </section>
  </template>
  
  <script setup>
  import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
  import mapboxgl from 'mapbox-gl'
  import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
  import * as turf from '@turf/turf'
  
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
  if (!MAPBOX_TOKEN) console.warn('VITE_MAPBOX_TOKEN is missing')
  mapboxgl.accessToken = MAPBOX_TOKEN
  
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
  
  const categories = [
    { q: 'cafe', label: 'Cafe' },
    { q: 'restaurant', label: 'Restaurant' },
    { q: 'supermarket', label: 'Supermarket' },
    { q: 'hospital', label: 'Hospital' },
    { q: 'school', label: 'School' },
    { q: 'park', label: 'Park' },
  ]
  const poiCategory = ref(categories[0].q)
  const poiCenter = ref('map')
  const radiusKm = ref(1.0)
  const pois = ref([])
  const poiMarkers = ref([])
  
  function makeMarker(lngLat, color='#2563eb'){
    return new mapboxgl.Marker({ color }).setLngLat(lngLat).addTo(map.value)
  }
  function clearRoute(){
    steps.value = []
    routeInfo.value = null
    if (map.value?.getLayer(routeId)) map.value.removeLayer(routeId)
    if (map.value?.getSource(routeSourceId)) map.value.removeSource(routeSourceId)
  }
  function clearPoi(){
    poiMarkers.value.forEach(m => m.remove())
    poiMarkers.value = []
    pois.value = []
  }
  function swap(){
    const tmp = from.value; from.value = to.value; to.value = tmp; clearRoute()
  }
  function fitBoundsToPoints(points){
    const b = new mapboxgl.LngLatBounds()
    points.forEach(p => b.extend([p.lng, p.lat]))
    map.value.fitBounds(b, { padding: 60, duration: 600 })
  }
  function togglePick(which){ picking.value = picking.value === which ? null : which }
  
  async function buildRoute(){
    if (!from.value || !to.value) return
    clearRoute()
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile.value}/${from.value.lng},${from.value.lat};${to.value.lng},${to.value.lat}?geometries=geojson&steps=true&overview=full&access_token=${MAPBOX_TOKEN}`
    const res = await fetch(url); const data = await res.json()
    const route = data?.routes?.[0]; if (!route) return
    const geo = { type: 'Feature', geometry: route.geometry, properties: {} }
    map.value.addSource(routeSourceId, { type: 'geojson', data: geo })
    map.value.addLayer({ id: routeId, type: 'line', source: routeSourceId,
      paint: { 'line-color': '#2563eb', 'line-width': 5, 'line-opacity': 0.85 }})
    routeInfo.value = { distance: route.distance, duration: route.duration }
    steps.value = route.legs?.[0]?.steps?.map(s => s.maneuver?.instruction).filter(Boolean) || []
    const coords = route.geometry.coordinates.map(([lng,lat]) => ({ lng, lat }))
    fitBoundsToPoints([from.value, to.value, ...coords.slice(0,1), ...coords.slice(-1)])
  }
  
  function useMyLocation(which){
    if (!navigator.geolocation) return alert('Geolocation not available')
    navigator.geolocation.getCurrentPosition(pos => {
      const ll = { lng: pos.coords.longitude, lat: pos.coords.latitude, name: 'My location' }
      if (which === 'from'){ from.value = ll; fromMarker.value?.remove(); fromMarker.value = makeMarker(ll, '#16a34a') }
      else { to.value = ll; toMarker.value?.remove(); toMarker.value = makeMarker(ll, '#ef4444') }
      map.value.flyTo({ center: [ll.lng, ll.lat], zoom: 13, duration: 600 })
      picking.value = null
    }, err => alert(err.message))
  }
  
  async function searchPOI(){
    if (!MAPBOX_TOKEN) return
    clearPoi()
    let center
    if (poiCenter.value === 'from' && from.value) center = [from.value.lng, from.value.lat]
    else if (poiCenter.value === 'to' && to.value) center = [to.value.lng, to.value.lat]
    else center = map.value.getCenter().toArray()
  
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(poiCategory.value)}.json?types=poi&proximity=${center[0]},${center[1]}&limit=15&access_token=${MAPBOX_TOKEN}`
    const res = await fetch(url); const data = await res.json()
    const fc = data?.features || []
    const centerPt = turf.point(center)
    const filtered = fc.filter(f => {
      const [lng, lat] = f.geometry.coordinates
      const d = turf.distance(centerPt, turf.point([lng,lat]), { units: 'kilometers' })
      return d <= (radiusKm.value || 1)
    })
    filtered.forEach(f => {
      const [lng, lat] = f.geometry.coordinates
      const m = new mapboxgl.Marker({ color: '#f59e0b' })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 8 }).setHTML(`<strong>${f.text}</strong><br>${f.place_name}`))
        .addTo(map.value)
      poiMarkers.value.push(m)
    })
    pois.value = filtered
    if (filtered.length){
      const b = new mapboxgl.LngLatBounds()
      filtered.forEach(f => b.extend(f.geometry.coordinates)); b.extend(center)
      map.value.fitBounds(b, { padding: 60, duration: 600 })
    }
  }
  
  watch(picking, (val) => {
    const canvas = map.value?.getCanvas?.(); if (!canvas) return
    canvas.style.cursor = val ? 'crosshair' : ''
  })
  
  onMounted(() => {
    const m = new mapboxgl.Map({
      container: mapEl.value, style: 'mapbox://styles/mapbox/streets-v12',
      center: [144.9631, -37.8136], zoom: 11
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
  .panel{position:relative; z-index:1000; background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px; pointer-events:auto}
  .block{border-top:1px dashed #e5e7eb;padding-top:12px;margin-top:10px}
  .row{display:grid;gap:10px;grid-template-columns:1fr 1fr}
  .cell{display:flex;flex-direction:column;gap:6px}
  .lbl{font-weight:600}
  .input{border:1px solid #d1d5db;border-radius:8px;padding:8px}
  .btn{border:1px solid #cbd5e1;background:#f3f4f6;border-radius:8px;padding:8px 12px;cursor:pointer}
  .btn.primary{background:#2563eb;color:#fff;border-color:#2563eb}
  .pill{display:inline-flex;gap:6px;align-items:center;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:999px;padding:2px 8px}
  .stats{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}
  .mini{position:relative; z-index:1002; display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12px}
  .muted{color:#6b7280}
  .map{position:relative; z-index:1; height:72vh;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}
  .pick-banner{margin:8px 0; padding:8px; border-radius:8px; background:#f1f5ff; border:1px solid #c7d2fe; display:flex; gap:8px; align-items:center; flex-wrap:wrap}
  .geocoder{position:relative; z-index:1001}
  .geocoder :deep(.mapboxgl-ctrl-geocoder){display:block; position:relative; z-index:1001; min-width:100%; max-width:100%}
  @media (max-width: 920px){ .wrap{grid-template-columns:1fr} .map{height:60vh} }
  </style>
  
  <style>
  @import 'mapbox-gl/dist/mapbox-gl.css';
  @import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
  </style>
  