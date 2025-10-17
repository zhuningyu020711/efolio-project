<template>
  <section class="card" aria-labelledby="catalog-h1">
    <h1 id="catalog-h1">Catalog</h1>

    <!-- Filters -->
    <div class="toolbar" role="region" aria-label="Filters">
      <div class="row">
        <label class="lbl" for="q">Search by title</label>
        <input
          id="q"
          class="input"
          type="search"
          v-model.trim="q"
          placeholder="Search title…"
          @keyup.enter="goFirst"
          aria-label="Search by event title"
        />
        <button class="btn" type="button" @click="q=''; goFirst()" aria-label="Clear search">Clear</button>
      </div>

      <div class="row grid-4">
        <div>
          <label class="lbl" for="cat">Category</label>
          <select id="cat" class="input" v-model="cat">
            <option value="">All</option>
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div>
          <label class="lbl" for="status">Status</label>
          <select id="status" class="input" v-model="status">
            <option value="">All</option>
            <option>Open</option>
            <option>Closed</option>
            <option>Sold out</option>
          </select>
        </div>
        <div>
          <label class="lbl" for="minRate">Min rating</label>
          <select id="minRate" class="input" v-model.number="minRating">
            <option :value="0">All</option>
            <option :value="3">≥ 3</option>
            <option :value="4">≥ 4</option>
            <option :value="4.5">≥ 4.5</option>
          </select>
        </div>
        <div>
          <label class="lbl" for="perPage">Rows / page</label>
          <select id="perPage" class="input" v-model.number="perPage">
            <option :value="10">10</option>
            <option :value="15">15</option>
            <option :value="20">20</option>
          </select>
        </div>
      </div>

      <div class="row">
        <button class="btn" type="button" @click="exportCSV" aria-label="Export to CSV">Export CSV</button>
        <button class="btn" type="button" @click="exportPDF" aria-label="Export to PDF">Export PDF</button>
        <span class="muted" aria-live="polite">{{ filtered.length }} result(s)</span>
      </div>
    </div>

    <!-- Table -->
    <div class="table-wrap" role="region" aria-label="Event list">
      <table class="tbl">
        <thead>
          <tr>
            <th scope="col">
              <button class="th-btn" @click="sortBy('title')" :aria-label="sortAria('title')">
                Event <span class="sort" v-if="sort.key==='title'">{{ sort.dir==='asc'?'▲':'▼' }}</span>
              </button>
            </th>
            <th scope="col">
              <button class="th-btn" @click="sortBy('organizer')" :aria-label="sortAria('organizer')">
                Organizer <span class="sort" v-if="sort.key==='organizer'">{{ sort.dir==='asc'?'▲':'▼' }}</span>
              </button>
            </th>
            <th scope="col">
              <button class="th-btn" @click="sortBy('category')" :aria-label="sortAria('category')">
                Category <span class="sort" v-if="sort.key==='category'">{{ sort.dir==='asc'?'▲':'▼' }}</span>
              </button>
            </th>
            <th scope="col">
              <button class="th-btn" @click="sortBy('venue')" :aria-label="sortAria('venue')">
                Venue <span class="sort" v-if="sort.key==='venue'">{{ sort.dir==='asc'?'▲':'▼' }}</span>
              </button>
            </th>
            <th scope="col">
              <button class="th-btn" @click="sortBy('date')" :aria-label="sortAria('date')">
                Date <span class="sort" v-if="sort.key==='date'">{{ sort.dir==='asc'?'▲':'▼' }}</span>
              </button>
            </th>
            <th scope="col">Seats</th>
            <th scope="col">
              <button class="th-btn" @click="sortBy('price')" :aria-label="sortAria('price')">
                Price <span class="sort" v-if="sort.key==='price'">{{ sort.dir==='asc'?'▲':'▼' }}</span>
              </button>
            </th>
            <th scope="col">
              <button class="th-btn" @click="sortBy('status')" :aria-label="sortAria('status')">
                Status <span class="sort" v-if="sort.key==='status'">{{ sort.dir==='asc'?'▲':'▼' }}</span>
              </button>
            </th>
            <th scope="col">
              <button class="th-btn" @click="sortBy('rating')" :aria-label="sortAria('rating')">
                Rating <span class="sort" v-if="sort.key==='rating'">{{ sort.dir==='asc'?'▲':'▼' }}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ev in pageRows" :key="ev.id">
            <td class="title-cell">
              <div class="title">{{ ev.title }}</div>
              <div class="sub muted">#{{ ev.id }}</div>
            </td>
            <td>{{ ev.organizer }}</td>
            <td>{{ ev.category }}</td>
            <td>{{ ev.venue }}</td>
            <td>{{ fmtDate(ev.date) }}</td>
            <td>{{ ev.seats.taken }}/{{ ev.seats.total }}</td>
            <td>{{ fmtPrice(ev.price) }}</td>
            <td>
              <span class="tag" :class="slug(ev.status)">{{ ev.status }}</span>
            </td>
            <td>{{ ev.rating.toFixed(1) }}</td>
          </tr>
          <tr v-if="pageRows.length===0">
            <td colspan="9" class="muted">No results.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pager -->
    <div class="pager">
      <button class="btn" :disabled="page===1" @click="page--" aria-label="Previous page">Prev</button>
      <span>Page {{ page }} / {{ totalPages || 1 }}</span>
      <button class="btn" :disabled="page===totalPages || totalPages===0" @click="page++" aria-label="Next page">Next</button>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'

/* —— Data —— */
const rows = ref([
  { id: 101, title: 'Welcome Fair', organizer: 'Student Union', category: 'Festival', venue: 'Main Lawn', date: '2025-03-02T10:00:00', seats:{taken:320,total:500}, price:0, status:'Open', rating:4.6 },
  { id: 102, title: 'Intro to Vue 3 Workshop', organizer: 'IT Club', category: 'Workshop', venue: 'IT Building 203', date: '2025-03-05T18:00:00', seats:{taken:45,total:60}, price:0, status:'Open', rating:4.8 },
  { id: 103, title: 'Data Science Seminar', organizer: 'Engineering Faculty', category: 'Talk', venue: 'Eng LT-1', date: '2025-03-08T14:00:00', seats:{taken:180,total:220}, price:5, status:'Open', rating:4.2 },
  { id: 104, title: 'Acoustic Night', organizer: 'Music Society', category: 'Music', venue: 'Student Theatre', date: '2025-03-10T19:30:00', seats:{taken:220,total:220}, price:8, status:'Sold out', rating:4.7 },
  { id: 105, title: 'Career Fair', organizer: 'Careers & Employability', category: 'Fair', venue: 'Convention Hall', date: '2025-03-12T10:00:00', seats:{taken:950,total:1200}, price:0, status:'Open', rating:4.3 },
  { id: 106, title: 'Basketball: Intra-school Cup', organizer: 'Sports Centre', category: 'Sports', venue: 'Court A', date: '2025-03-15T16:00:00', seats:{taken:420,total:600}, price:3, status:'Open', rating:4.1 },
  { id: 107, title: 'Photography Walk', organizer: 'Art Club', category: 'Outdoor', venue: 'City Trail', date: '2025-03-17T08:30:00', seats:{taken:30,total:40}, price:0, status:'Closed', rating:4.5 },
  { id: 108, title: 'Startup Pitch Night', organizer: 'Entrepreneurship Club', category: 'Competition', venue: 'Biz Hub 1F', date: '2025-03-18T18:30:00', seats:{taken:120,total:150}, price:6, status:'Open', rating:4.4 },
  { id: 109, title: 'Python for Research', organizer: 'Library', category: 'Workshop', venue: 'Lib Lab B', date: '2025-03-20T13:30:00', seats:{taken:55,total:70}, price:0, status:'Open', rating:4.6 },
  { id: 110, title: 'Cultural Food Market', organizer: 'Global Lounge', category: 'Festival', venue: 'Quad', date: '2025-03-22T11:00:00', seats:{taken:600,total:900}, price:2, status:'Open', rating:4.9 },
  { id: 111, title: 'Game Jam 24h', organizer: 'Gaming Club', category: 'Competition', venue: 'Lab 4', date: '2025-03-23T09:00:00', seats:{taken:90,total:100}, price:0, status:'Open', rating:4.0 },
  { id: 112, title: 'Machine Learning 101', organizer: 'CS Dept', category: 'Talk', venue: 'CS LT', date: '2025-03-25T15:00:00', seats:{taken:260,total:300}, price:0, status:'Open', rating:4.6 },
  { id: 113, title: 'Badminton Friendly', organizer: 'Sports Centre', category: 'Sports', venue: 'Hall B', date: '2025-03-26T18:00:00', seats:{taken:140,total:180}, price:2, status:'Open', rating:3.9 },
  { id: 114, title: 'Sustainability Forum', organizer: 'Green Office', category: 'Forum', venue: 'Admin LT', date: '2025-03-27T10:00:00', seats:{taken:300,total:400}, price:0, status:'Open', rating:4.2 },
  { id: 115, title: 'Debate: AI in Education', organizer: 'Debate Society', category: 'Debate', venue: 'Humanities LT-2', date: '2025-03-28T17:00:00', seats:{taken:180,total:200}, price:0, status:'Open', rating:4.4 },
  { id: 116, title: 'Volunteer Day', organizer: 'Community Service', category: 'Volunteer', venue: 'Neighborhood Centre', date: '2025-03-29T09:30:00', seats:{taken:80,total:120}, price:0, status:'Closed', rating:4.8 },
  { id: 117, title: 'Film Night: Classics', organizer: 'Film Club', category: 'Movie', venue: 'Cinema Hall', date: '2025-03-30T19:00:00', seats:{taken:310,total:350}, price:4, status:'Open', rating:4.1 },
  { id: 118, title: 'Hackathon (48h)', organizer: 'CS Dept', category: 'Competition', venue: 'Innovation Hub', date: '2025-04-02T09:00:00', seats:{taken:280,total:300}, price:0, status:'Open', rating:4.7 },
  { id: 119, title: 'Jazz Evening', organizer: 'Music Society', category: 'Music', venue: 'Auditorium', date: '2025-04-03T20:00:00', seats:{taken:500,total:500}, price:10, status:'Sold out', rating:4.9 },
  { id: 120, title: 'Thesis Writing Clinic', organizer: 'Graduate School', category: 'Workshop', venue: 'Grad Centre Rm 5', date: '2025-04-04T14:00:00', seats:{taken:35,total:50}, price:0, status:'Open', rating:4.3 },
])

/* —— Filters / Sorting / Paging —— */
const q = ref('')
const cat = ref('')
const status = ref('')
const minRating = ref(0)
const perPage = ref(10)
const page = ref(1)

const categories = [...new Set(rows.value.map(r => r.category))].sort()

const sort = reactive({ key: 'date', dir: 'asc' })
function sortBy(k){
  if (sort.key === k) sort.dir = sort.dir === 'asc' ? 'desc' : 'asc'
  else { sort.key = k; sort.dir = 'asc' }
}
function sortAria(k){
  return `Sort by ${k}, current: ${sort.key===k ? sort.dir : 'none'}`
}

const filtered = computed(() => {
  let list = rows.value.slice()
  if (q.value) {
    const qq = q.value.toLowerCase()
    list = list.filter(r => r.title.toLowerCase().includes(qq))
  }
  if (cat.value) list = list.filter(r => r.category === cat.value)
  if (status.value) list = list.filter(r => r.status === status.value)
  if (minRating.value) list = list.filter(r => r.rating >= minRating.value)
  return list
})

const sorted = computed(() => {
  const list = filtered.value.slice()
  list.sort((a,b) => {
    const k = sort.key
    let av = a[k], bv = b[k]
    if (k === 'date') { av = +new Date(a.date); bv = +new Date(b.date) }
    if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase() }
    const cmp = av > bv ? 1 : av < bv ? -1 : 0
    return sort.dir === 'asc' ? cmp : -cmp
  })
  return list
})

const totalPages = computed(() => Math.ceil(sorted.value.length / perPage.value))
const pageRows = computed(() => {
  const start = (page.value - 1) * perPage.value
  return sorted.value.slice(start, start + perPage.value)
})
function goFirst(){ page.value = 1 }

/* —— Export —— */
function exportCSV(){
  const headers = ['Event','Organizer','Category','Venue','Date','Seats','Price','Status','Rating']
  const lines = sorted.value.map(r => ([
    r.title, r.organizer, r.category, r.venue,
    fmtDate(r.date),
    `${r.seats.taken}/${r.seats.total}`,
    fmtPrice(r.price),
    r.status,
    r.rating.toFixed(1)
  ]))
  const csv = [headers, ...lines]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'events_catalog.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

function exportPDF(){
  const rowsHtml = sorted.value.map(r => {
    return `
      <tr>
        <td>${esc(r.title)}</td>
        <td>${esc(r.organizer)}</td>
        <td>${esc(r.category)}</td>
        <td>${esc(r.venue)}</td>
        <td>${esc(fmtDate(r.date))}</td>
        <td>${r.seats.taken}/${r.seats.total}</td>
        <td>${esc(fmtPrice(r.price))}</td>
        <td>${esc(r.status)}</td>
        <td>${r.rating.toFixed(1)}</td>
      </tr>
    `
  }).join('')

 
  const html = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8"/>
      <title>Events Catalog</title>
      <style>
        body{font:14px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;padding:16px}
        h1{margin:0 0 12px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #ccc;padding:6px 8px}
        th{background:#f1f5f9;text-align:left}
        .muted{color:#6b7280}
      </style>
    </head>
    <body>
      <h1>Events Catalog</h1>
      <div class="muted">${sorted.value.length} result(s)</div>
      <table>
        <thead>
          <tr>
            <th>Event</th><th>Organizer</th><th>Category</th><th>Venue</th>
            <th>Date</th><th>Seats</th><th>Price</th><th>Status</th><th>Rating</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </body>
  </html>`

  const w = window.open('', '_blank', 'width=1000,height=700')
  if (!w) return
  w.document.open()
  w.document.write(html)
  w.document.close()
  // 页面加载后再打印
  w.addEventListener('load', () => {
    try { w.focus(); w.print() } catch {}
  }, { once: true })
}

/* —— Utils —— */
function fmtPrice(p){ return p ? `$${p.toFixed(2)}` : '$0.00' }
function fmtDate(iso){ const d = new Date(iso); return d.toLocaleString() }
function esc(s){ return String(s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])) }
function slug(s){ return String(s).toLowerCase().replace(/\s+/g,'-') }
</script>

<style scoped>
.toolbar{display:flex;flex-direction:column;gap:10px;margin-bottom:12px}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
@media (max-width: 960px){ .grid-4{grid-template-columns:repeat(2,1fr)} }
@media (max-width: 560px){ .grid-4{grid-template-columns:1fr} }

.lbl{font-weight:600}
.input{border:1px solid #d1d5db;border-radius:8px;padding:8px}
.input, select{min-width:160px}

.table-wrap{overflow:auto;border:1px solid #e5e7eb;border-radius:10px}
.tbl{width:100%;border-collapse:separate;border-spacing:0}
.tbl thead th{background:#eef2f7;font-weight:700;border-bottom:1px solid #dce3ea}
.tbl th,.tbl td{padding:10px;border-bottom:1px solid #eef2f7;vertical-align:top}
.title-cell .title{font-weight:600}
.sub{font-size:12px}

.th-btn{background:none;border:none;padding:0;font:inherit;cursor:pointer;display:flex;gap:6px;align-items:center}
.sort{font-size:12px;color:#6b7280}

.pager{display:flex;gap:10px;align-items:center;justify-content:flex-end;margin-top:10px}

.btn{border:1px solid #cbd5e1;background:#f3f4f6;border-radius:8px;padding:8px 12px;cursor:pointer}
.muted{color:#6b7280}
.tag{display:inline-block;padding:2px 8px;border-radius:999px;border:1px solid #e5e7eb;background:#f8fafc}
.tag.open{background:#e8f5e9;border-color:#a7f3d0}
.tag.closed{background:#fef3c7;border-color:#fde68a}
.tag.sold-out{background:#fee2e2;border-color:#fecaca}
</style>
