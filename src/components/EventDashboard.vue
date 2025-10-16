<template>
    <section class="dash" aria-labelledby="dash-h1">
      <h2 id="dash-h1">Event Dashboard</h2>
  
      <!-- Select event + chart type -->
      <div class="row" role="region" aria-label="Event selection">
        <label class="lbl" for="evSel">Event</label>
        <select id="evSel" class="input" v-model="selectedId" @change="refreshChart" aria-label="Select event">
          <option v-for="ev in eventList" :key="ev.id" :value="ev.id">{{ ev.title }}</option>
        </select>
  
        <label class="lbl" for="chartType">Chart</label>
        <select id="chartType" class="input" v-model="chartType" @change="refreshChart" aria-label="Select chart type">
          <option value="line">Line (Registrations vs Attendance)</option>
          <option value="bar">Bar (Registrations vs Attendance)</option>
        </select>
      </div>
  
      <!-- Chart -->
      <div class="panel" role="region" aria-label="Registration and attendance chart">
        <div ref="chartEl" class="chart" />
      </div>
  
      <!-- Quick navigation -->
      <div class="panel" role="region" aria-label="Quick navigation">
        <h3>Navigate to Event</h3>
        <div class="row">
          <label class="lbl" for="originSel">From</label>
          <select id="originSel" class="input" v-model="originPick" aria-label="Select origin">
            <option value="myloc">My Location (GPS)</option>
            <option value="dorm">Dorm</option>
            <option value="lecture">Lecture Hall</option>
          </select>
          <button class="btn primary" @click="navigate" aria-label="Open navigation to event in Google Maps">
            Open Directions
          </button>
        </div>
        <p class="muted mini">If the event has coordinates (lat/lng) they will be used; otherwise the address text is used.</p>
      </div>
  
      <!-- QR Check-in (optional) -->
      <div class="panel" role="region" aria-label="QR code for attendance">
        <h3>QR Check-in (optional)</h3>
        <div class="row">
          <button class="btn" @click="makeQR" aria-label="Generate QR code for event check-in">
            Generate QR for {{ currentEvent?.title || 'event' }}
          </button>
          <button v-if="qrDataUrl" class="btn" @click="downloadQR" aria-label="Download QR image">Download QR</button>
        </div>
        <div v-if="qrDataUrl" class="qrwrap">
          <img :src="qrDataUrl" :alt="`QR code for event ${currentEvent?.title || ''}`" />
          <p class="muted mini">Scanned payload (example): <code>{{ qrPayload }}</code></p>
        </div>
        <p class="muted mini">
          Backend idea: POST this payload to <code>/attendance</code> to record { eventId, userId, time }.
        </p>
      </div>
  
      <!-- AI copy & poster prompt (optional) -->
      <div class="panel" role="region" aria-label="AI copy drafting">
        <h3>AI Copy & Poster Prompt (optional)</h3>
        <div class="row">
          <label class="lbl" for="tone">Tone</label>
          <select id="tone" class="input" v-model="tone">
            <option value="friendly">Friendly</option>
            <option value="formal">Formal</option>
            <option value="energetic">Energetic</option>
          </select>
          <label class="lbl" for="tags">Tags</label>
          <input id="tags" class="input" v-model.trim="tags" placeholder="e.g., music, outdoor, free snacks" />
        </div>
  
        <div class="row">
          <button class="btn" @click="genCopy" aria-label="Generate event description draft">Generate Description</button>
          <button class="btn" @click="genPoster" aria-label="Generate poster prompt suggestions">Generate Poster Prompt</button>
        </div>
  
        <div class="grid2">
          <div>
            <label class="lbl" for="desc">Draft Description</label>
            <textarea id="desc" class="input" rows="6" v-model="descDraft" aria-live="polite"></textarea>
          </div>
          <div>
            <label class="lbl" for="poster">Poster Prompt</label>
            <textarea id="poster" class="input" rows="6" v-model="posterPrompt" aria-live="polite"></textarea>
          </div>
        </div>
      </div>
  
      <p class="sr-only" aria-live="polite">{{ liveMsg }}</p>
    </section>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, watch } from 'vue'
  import * as echarts from 'echarts'
  import QRCode from 'qrcode'
  
  const props = defineProps({
    // expect: [{id,title,locationText?,lat?,lng?, stats?: [{date, registered, attended}] }]
    events: { type: Array, default: () => [] },
    attendance: { type: Array, default: () => [] }
  })
  
  /* ---- events with fallback demo stats ---- */
  const eventList = computed(() => {
    return (props.events?.length ? props.events : demoEvents()).map(ev => {
      if (!ev.stats || !ev.stats.length) ev.stats = makeWeekStats()
      return ev
    })
  })
  
  const selectedId = ref(eventList.value[0]?.id ?? null)
  watch(eventList, () => {
    if (!selectedId.value && eventList.value.length) selectedId.value = eventList.value[0].id
  }, { immediate: true })
  
  const currentEvent = computed(() => eventList.value.find(e => e.id === selectedId.value) || null)
  
  /* ---- chart ---- */
  const chartEl = ref(null)
  let chart = null
  const chartType = ref('line')
  const liveMsg = ref('Dashboard ready')
  
  function refreshChart(){
    if (!currentEvent.value) return
    if (!chart) chart = echarts.init(chartEl.value)
    const dates = currentEvent.value.stats.map(s => s.date)
    const regs  = currentEvent.value.stats.map(s => s.registered)
    const atts  = currentEvent.value.stats.map(s => s.attended)
  
    const base = {
      tooltip: { trigger: 'axis' },
      legend: { data: ['Registrations', 'Attendance'] },
      xAxis: { type: 'category', data: dates, axisLabel: { rotate: 0 } },
      yAxis: { type: 'value' },
      grid: { left: 40, right: 20, top: 40, bottom: 40 }
    }
    const series = (chartType.value === 'bar')
      ? [
          { name: 'Registrations', type: 'bar', data: regs },
          { name: 'Attendance',    type: 'bar', data: atts }
        ]
      : [
          { name: 'Registrations', type: 'line', data: regs, smooth: true },
          { name: 'Attendance',    type: 'line', data: atts, smooth: true }
        ]
  
    chart.setOption({ ...base, series }, true)
    liveMsg.value = `Chart updated: ${currentEvent.value.title} (${chartType.value})`
  }
  
  onMounted(() => {
    refreshChart()
    window.addEventListener('resize', resize)
  })
  function resize(){ if (chart) chart.resize() }
  watch([selectedId, chartType], refreshChart)
  
  /* ---- quick navigation ---- */
  const originPick = ref('myloc') // myloc | dorm | lecture
  
  const PRESETS = {
    dorm:    { lat: -37.7996, lng: 144.9618, label: 'Dorm' },
    lecture: { lat: -37.7964, lng: 144.9612, label: 'Lecture Hall' }
  }
  
  async function navigate(){
    if (!currentEvent.value) return
    const dest = currentEvent.value.lat && currentEvent.value.lng
      ? `${currentEvent.value.lat},${currentEvent.value.lng}`
      : encodeURIComponent(currentEvent.value.locationText || currentEvent.value.title)
  
    if (originPick.value === 'myloc') {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank')
      return
    }
    const org = PRESETS[originPick.value]
    if (!org) return
    const origin = `${org.lat},${org.lng}`
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`, '_blank')
  }
  
  /* ---- QR check-in (optional) ---- */
  const qrDataUrl = ref('')
  const qrPayload = ref('')
  
  async function makeQR(){
    const ev = currentEvent.value
    if (!ev) return
    const payload = {
      type: 'attendance',
      eventId: ev.id,
      ts: Date.now()
    }
    qrPayload.value = JSON.stringify(payload)
    qrDataUrl.value = await QRCode.toDataURL(qrPayload.value, { margin: 2, width: 256 })
    liveMsg.value = 'QR generated'
  }
  function downloadQR(){
    const a = document.createElement('a')
    a.href = qrDataUrl.value
    a.download = `event_${currentEvent.value?.id}_qr.png`
    a.click()
  }
  
  /* ---- AI copy / poster prompt (local) ---- */
  const tone = ref('friendly')
  const tags = ref('')
  const descDraft = ref('')
  const posterPrompt = ref('')
  
  function genCopy(){
    const ev = currentEvent.value
    if (!ev) return
    const tagWords = tags.value ? `Tags: ${tags.value}. ` : ''
    const toneText = {
      friendly:  'Join us for a relaxed and welcoming experience.',
      formal:    'We sincerely invite you to participate in this event.',
      energetic: 'Get ready for an exciting, high-energy experience!'
    }[tone.value] || ''
  
    descDraft.value =
  `🎉 ${ev.title}
  ${toneText}
  Date: ${guessDateRange(ev)}
  Location: ${ev.locationText || 'TBA'}
  
  ${tagWords}Highlights: engaging activities, friendly community, and great vibes. Seats are limited — register now!`
    liveMsg.value = 'Description drafted'
  }
  
  function genPoster(){
    const ev = currentEvent.value
    if (!ev) return
    const t = (tags.value || 'students, campus events, community, fun').split(',').map(s=>s.trim()).filter(Boolean).join(', ')
    posterPrompt.value =
  `Poster for "${ev.title}", bold typographic title, vibrant color palette, friendly campus vibe, clean layout, high contrast, minimal icons, ${t}, aspect ratio 4:5`
    liveMsg.value = 'Poster prompt generated'
  }
  
  /* ---- demo data fallbacks ---- */
  function demoEvents(){
    return [
      { id: 'e1', title: 'Welcome BBQ', locationText: 'South Lawn, Parkville', lat: -37.7989, lng: 144.9634, stats: makeWeekStats(30, 50) },
      { id: 'e2', title: 'Tech Talk: Vue Best Practices', locationText: 'Old Arts Theatre', lat: -37.7968, lng: 144.9619, stats: makeWeekStats(15, 35) },
      { id: 'e3', title: 'Music Night', locationText: 'Union House', stats: makeWeekStats(10, 25) }
    ]
  }
  function makeWeekStats(min=10, max=40){
    const out = []
    const now = new Date()
    for (let i=6;i>=0;i--){
      const d = new Date(now); d.setDate(now.getDate()-i)
      const date = d.toISOString().slice(0,10)
      const registered = rand(min, max)
      const attended   = Math.max(0, registered - rand(0, Math.floor(registered*0.3)))
      out.push({ date, registered, attended })
    }
    return out
  }
  function rand(a,b){ return Math.floor(Math.random()*(b-a+1))+a }
  function guessDateRange(ev){
    const first = ev.stats?.[0]?.date, last = ev.stats?.[ev.stats.length-1]?.date
    return (first && last) ? `${first} ~ ${last}` : 'See schedule'
  }
  </script>
  
  <style scoped>
  .dash { display:flex; flex-direction:column; gap:16px }
  .panel{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:14px }
  .row{ display:grid; grid-template-columns: 120px 1fr 120px 1fr; gap:10px; align-items:center; }
  @media (max-width: 820px){
    .row{ grid-template-columns: 1fr; }
  }
  .lbl{ font-weight:600 }
  .input{ border:1px solid #d1d5db; border-radius:8px; padding:8px; min-height:36px }
  .btn{ border:1px solid #475569; background:#f8fafc; color:#111827; border-radius:8px; padding:8px 12px; cursor:pointer }
  .btn.primary{ background:#1d4ed8; color:#fff; border:none }
  .btn:focus-visible{ outline:3px solid #0ea5e9; outline-offset:2px }
  .mini{ font-size:12px }
  .muted{ color:#6b7280 }
  .chart{ width:100%; height:360px }
  .qrwrap{ margin-top:10px; display:flex; gap:16px; align-items:center }
  .sr-only{ position:absolute; left:-9999px; width:1px; height:1px; overflow:hidden }
  .grid2{ display:grid; grid-template-columns:1fr 1fr; gap:12px }
  @media (max-width: 820px){ .grid2{ grid-template-columns:1fr } }
  code{ background:#f1f5f9; padding:2px 4px; border-radius:6px; font-size:12px }
  </style>
  