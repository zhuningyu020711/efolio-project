<template>
    <!-- 仅管理员可见 -->
    <section v-if="isAdmin" class="dash" aria-labelledby="dash-h1">
      <h2 id="dash-h1">Event Dashboard</h2>
  
      <!-- 选择事件 & 图表类型 -->
      <div class="panel" role="region" aria-label="Event and chart selection">
        <div class="row-2">
          <div class="field">
            <label class="lbl" for="evSel">Event</label>
            <select
              id="evSel"
              class="input"
              v-model="selectedId"
              @change="refreshChart"
              aria-label="Select event"
            >
              <option v-for="ev in eventList" :key="ev.id" :value="ev.id">
                {{ ev.title }}
              </option>
            </select>
          </div>
  
          <div class="field">
            <label class="lbl" for="chartType">Chart</label>
            <select
              id="chartType"
              class="input"
              v-model="chartType"
              @change="refreshChart"
              aria-label="Select chart type"
            >
              <option value="line">Line (Registrations vs Attendance)</option>
              <option value="bar">Bar (Registrations vs Attendance)</option>
            </select>
          </div>
        </div>
      </div>
  
      <!-- 图表 -->
      <div class="panel" role="region" aria-label="Registration and attendance chart">
        <div ref="chartEl" class="chart" />
        <div class="summary">
          <div class="pill">Total registrations (7d): <strong>{{ totalReg }}</strong></div>
          <div class="pill">Total attendance (7d): <strong>{{ totalAtt }}</strong></div>
          <div class="pill">Avg attendance rate: <strong>{{ avgRate }}%</strong></div>
        </div>
      </div>
  
      <!-- 快速导航 -->
      <div class="panel" role="region" aria-label="Quick navigation">
        <h3>Navigate to Event</h3>
        <div class="row-3">
          <div class="field">
            <label class="lbl" for="originSel">From</label>
            <select id="originSel" class="input" v-model="originPick" aria-label="Select origin">
              <option value="myloc">My Location (GPS)</option>
              <option value="dorm">Dorm</option>
              <option value="lecture">Lecture Hall</option>
            </select>
          </div>
          <div class="field">
            <label class="lbl">&nbsp;</label>
            <button class="btn primary" @click="navigate" aria-label="Open navigation to event in Google Maps">
              Open Directions
            </button>
          </div>
          <div class="field muted mini" style="align-self:end">
            If the event has coordinates (lat/lng) they will be used; otherwise the address text is used.
          </div>
        </div>
      </div>
  
      <!-- 二维码签到 -->
      <div class="panel" role="region" aria-label="QR code for attendance">
        <h3>QR Check-in (optional)</h3>
        <div class="row-2">
          <div class="field">
            <button class="btn" @click="makeQR" aria-label="Generate QR code for event check-in">
              Generate QR for {{ currentEvent?.title || 'event' }}
            </button>
            <button v-if="qrDataUrl" class="btn" @click="downloadQR" aria-label="Download QR image" style="margin-left:8px">
              Download QR
            </button>
          </div>
          <div class="field right">
            <div v-if="qrDataUrl" class="qrwrap">
              <img :src="qrDataUrl" :alt="`QR code for event ${currentEvent?.title || ''}`" />
            </div>
          </div>
        </div>
        <p v-if="qrDataUrl" class="muted mini">
          Scanned payload (example): <code>{{ qrPayload }}</code>
        </p>
        <p class="muted mini">
          Backend idea: POST this payload to <code>/attendance</code> to record { eventId, userId, time }.
        </p>
      </div>
  
      <!-- AI 文案与海报提示 -->
      <div class="panel" role="region" aria-label="AI copy drafting">
        <h3>AI Copy & Poster Prompt (optional)</h3>
  
        <div class="row-3">
          <div class="field">
            <label class="lbl" for="tone">Tone</label>
            <select id="tone" class="input" v-model="tone">
              <option value="friendly">Friendly</option>
              <option value="formal">Formal</option>
              <option value="energetic">Energetic</option>
            </select>
          </div>
          <div class="field">
            <label class="lbl" for="tags">Tags</label>
            <input id="tags" class="input" v-model.trim="tags" placeholder="e.g., music, outdoor, free snacks" />
          </div>
          <div class="field" style="display:flex;gap:8px;align-items:end">
            <button class="btn" @click="genCopy" aria-label="Generate event description draft">Generate Description</button>
            <button class="btn" @click="genPoster" aria-label="Generate poster prompt suggestions">Generate Poster Prompt</button>
          </div>
        </div>
  
        <div class="grid2">
          <div class="field">
            <label class="lbl" for="desc">Draft Description</label>
            <textarea id="desc" class="input" rows="6" v-model="descDraft" aria-live="polite"></textarea>
          </div>
          <div class="field">
            <label class="lbl" for="poster">Poster Prompt</label>
            <textarea id="poster" class="input" rows="6" v-model="posterPrompt" aria-live="polite"></textarea>
          </div>
        </div>
      </div>
  
      <p class="sr-only" aria-live="polite">{{ liveMsg }}</p>
    </section>
  
    <!-- 非管理员提示 -->
    <section v-else class="panel" style="margin:12px">
      <h3>Admins only</h3>
      <p class="muted">You must be an administrator to view this dashboard.</p>
    </section>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, watch } from 'vue'
  import * as echarts from 'echarts'
  import QRCode from 'qrcode'
  import { rows as localRows } from '../services/rows' // 使用你的 20 条数据
  import { useStore } from '../utils/useStore'         // ★ 新增
  
  /* ---------- 仅管理员可见 ---------- */
  const store = useStore()
  const session = computed(() => store.state?.session ?? null)
  const isAdmin = computed(() =>
    store.isAdmin?.value ||
    session.value?.role === 'admin' ||
    (session.value?.email || '').toLowerCase() === 'admin@demo.local'
  )
  
  /* ---------- props ---------- */
  const props = defineProps({
    // 期望：[{ id, title, locationText?, lat?, lng?, stats?: [{date, registered, attended}] }]
    events: { type: Array, default: () => [] },
    attendance: { type: Array, default: () => [] }
  })
  
  /* ---------- 数据准备：优先 props.events，否则由 20 条 rows 生成 ---------- */
  const eventList = computed(() => {
    const fromProps = Array.isArray(props.events) && props.events.length > 0
      ? props.events
      : localRows.map(r => ({
          id: r.id,
          title: r.title,
          locationText: `${r.venue} · ${r.organizer}`,
          stats: makeWeekStats()
        }))
    return fromProps.map(ev => {
      const cloned = { ...ev }
      if (!cloned.stats || !cloned.stats.length) cloned.stats = makeWeekStats()
      return cloned
    })
  })
  
  const selectedId = ref(eventList.value[0]?.id ?? null)
  watch(eventList, () => {
    if (!selectedId.value && eventList.value.length) selectedId.value = eventList.value[0].id
  }, { immediate: true })
  
  const currentEvent = computed(() => eventList.value.find(e => e.id === selectedId.value) || null)
  
  /* ---------- 图表 ---------- */
  const chartEl = ref(null)
  let chart = null
  const chartType = ref('line')
  const liveMsg = ref('Dashboard ready')
  
  const totalReg = computed(() => (currentEvent.value?.stats || []).reduce((s, x) => s + (x.registered || 0), 0))
  const totalAtt = computed(() => (currentEvent.value?.stats || []).reduce((s, x) => s + (x.attended || 0), 0))
  const avgRate  = computed(() => totalReg.value ? Math.round((totalAtt.value / totalReg.value) * 100) : 0)
  
  function refreshChart () {
    if (!isAdmin.value) return
    if (!currentEvent.value || !chartEl.value) return
    if (!chart) chart = echarts.init(chartEl.value)
  
    const dates = currentEvent.value.stats.map(s => s.date)
    const regs  = currentEvent.value.stats.map(s => s.registered)
    const atts  = currentEvent.value.stats.map(s => s.attended)
  
    const base = {
      tooltip: { trigger: 'axis' },
      legend: { data: ['Registrations', 'Attendance'] },
      xAxis: { type: 'category', data: dates },
      yAxis: { type: 'value' },
      grid: { left: 40, right: 20, top: 40, bottom: 40 }
    }
    const series = (chartType.value === 'bar')
      ? [
          { name: 'Registrations', type: 'bar', data: regs },
          { name: 'Attendance',    type: 'bar', data: atts }
        ]
      : [
          { name: 'Registrations', type: 'line', data: regs, smooth: true, areaStyle: { opacity: .08 } },
          { name: 'Attendance',    type: 'line', data: atts, smooth: true, areaStyle: { opacity: .08 } }
        ]
  
    chart.setOption({ ...base, series }, true)
    chart.resize()
    liveMsg.value = `Chart updated: ${currentEvent.value.title} (${chartType.value})`
  }
  
  onMounted(() => {
    if (!isAdmin.value) return
    refreshChart()
    window.addEventListener('resize', () => chart?.resize())
  })
  watch([selectedId, chartType, currentEvent, isAdmin], () => refreshChart())
  
  /* ---------- 导航 ---------- */
  const originPick = ref('myloc') // myloc | dorm | lecture
  const PRESETS = {
    dorm   : { lat: -37.7996, lng: 144.9618, label: 'Dorm' },
    lecture: { lat: -37.7964, lng: 144.9612, label: 'Lecture Hall' }
  }
  function navigate(){
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
  
  /* ---------- 二维码签到 ---------- */
  const qrDataUrl = ref('')
  const qrPayload = ref('')
  async function makeQR () {
    const ev = currentEvent.value
    if (!ev) return
    const payload = { type: 'attendance', eventId: ev.id, ts: Date.now() }
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
    const base = `${window.location.origin}${window.location.pathname}`
    const url = `${base}#/checkin?p=${encodeURIComponent(b64)}`
    qrPayload.value = url
    qrDataUrl.value = await QRCode.toDataURL(url, { margin: 2, width: 256 })
    liveMsg.value = 'QR generated'
  }
  function downloadQR(){
    const a = document.createElement('a')
    a.href = qrDataUrl.value
    a.download = `checkin-${currentEvent.value?.id || 'event'}.png`
    a.click()
  }
  
  /* ---------- demo 工具 ---------- */
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
    const t = (tags.value || 'students, campus events, community, fun')
      .split(',').map(s=>s.trim()).filter(Boolean).join(', ')
    posterPrompt.value =
  `Poster for "${ev.title}", bold typographic title, vibrant color palette, friendly campus vibe, clean layout, high contrast, minimal icons, ${t}, aspect ratio 4:5`
    liveMsg.value = 'Poster prompt generated'
  }
  </script>
  
  <style scoped>
  /* —— 保持你的样式原样 —— */
  .dash { display:flex; flex-direction:column; gap:16px }
  .panel{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:14px }
  .field{ display:flex; flex-direction:column; gap:6px }
  .lbl{ font-weight:600 }
  .input{ border:1px solid #d1d5db; border-radius:8px; padding:8px; min-height:36px }
  .row-2{ display:grid; grid-template-columns:1fr 1fr; gap:12px; align-items:end }
  .row-3{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; align-items:end }
  .row-auto{ display:grid; grid-auto-flow:column; gap:12px; align-items:center }
  @media (max-width: 900px){ .row-2, .row-3{ grid-template-columns:1fr } }
  .btn{ border:1px solid #475569; background:#f8fafc; color:#111827; border-radius:8px; padding:8px 12px; cursor:pointer }
  .btn.primary{ background:#1d4ed8; color:#fff; border:none }
  .btn:focus-visible{ outline:3px solid #0ea5e9; outline-offset:2px }
  .chart{ width:100%; height:360px; }
  .summary{ display:flex; gap:8px; flex-wrap:wrap; margin-top:10px }
  .pill{ display:inline-flex; gap:6px; align-items:center; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:999px; padding:2px 8px }
  .mini{ font-size:12px }
  .muted{ color:#6b7280 }
  code{ background:#f1f5f9; padding:2px 4px; border-radius:6px; font-size:12px }
  .qrwrap{ display:flex; gap:16px; align-items:center }
  .qrwrap img{ width:160px; height:160px; border:1px solid #e5e7eb; border-radius:10px; padding:6px; background:#fff }
  .grid2{ display:grid; grid-template-columns:1fr 1fr; gap:12px }
  @media (max-width: 900px){ .grid2{ grid-template-columns:1fr } }
  .right{ display:flex; justify-content:flex-end }
  .sr-only{ position:absolute; left:-9999px; width:1px; height:1px; overflow:hidden }
  </style>
  