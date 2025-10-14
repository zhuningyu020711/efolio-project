<template>
  <section>
    <div class="toolbar">
      <div class="inline">
        <label for="minPrice">Min price</label>
        <input id="minPrice" type="number" min="0" v-model.number="minPrice" @input="pageIndex=0" />
        <label for="minRating">Min rating</label>
        <input id="minRating" type="number" min="0" max="5" step="0.5" v-model.number="minRating" @input="pageIndex=0" />
      </div>

      <div class="inline" role="group" aria-label="Export">
        <button type="button" class="btn" @click="exportCSV(false)">CSV (page)</button>
        <button type="button" class="btn" @click="exportCSV(true)">CSV (all)</button>
        <button type="button" class="btn" @click="exportPDF(false)">PDF (page)</button>
        <button type="button" class="btn" @click="exportPDF(true)">PDF (all)</button>
      </div>
    </div>

    <table class="table" aria-labelledby="admin-table">
      <caption id="admin-table" class="sr-only">Admin items with filters, pagination and export</caption>
      <thead>
        <tr>
          <th scope="col">ID</th>
          <th scope="col">
            <button type="button" class="linklike"
              :aria-sort="ariaSort('price')" @click="toggleSort('price')">Price</button>
          </th>
          <th scope="col">
            <button type="button" class="linklike"
              :aria-sort="ariaSort('rating')" @click="toggleSort('rating')">Rating</button>
          </th>
          <th scope="col">Title</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="it in pageItems" :key="it.id">
          <th scope="row">{{ it.id }}</th>
          <td>${{ it.price.toFixed(2) }}</td>
          <td>{{ isNaN(it.rating) ? '-' : it.rating }}</td>
          <td>{{ it.title }}</td>
        </tr>
        <tr v-if="pageItems.length===0"><td colspan="4">No results.</td></tr>
      </tbody>
    </table>

    <nav class="pagination" aria-label="Pagination">
      <button type="button" class="btn" :disabled="pageIndex===0" @click="pageIndex--">Previous</button>
      <button
        v-for="n in totalPages" :key="n" type="button" class="btn"
        :aria-current="pageIndex===n-1 ? 'page' : null" @click="pageIndex=n-1">
        {{ n }}
      </button>
      <button type="button" class="btn" :disabled="pageIndex===totalPages-1" @click="pageIndex++">Next</button>
    </nav>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from '../utils/useStore'
import { exportToCSV, exportToPDF } from '../utils/export'
const store = useStore()

// Firebase Functions base
const REGION  = import.meta.env.VITE_FUNCTIONS_REGION || 'us-central1'
const PROJECT = import.meta.env.VITE_FIREBASE_PROJECT_ID
const BASE    = `https://${REGION}-${PROJECT}.cloudfunctions.net`

const minPrice = ref(0)
const minRating = ref(0)
const sort = ref({ key: 'price', order: 'asc' })
const pageIndex = ref(0)
const pageSize = 10

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'price', label: 'Price' },
  { key: 'rating', label: 'Rating' },
  { key: 'title', label: 'Title' }
]

const items = computed(() => (store.state.items || []).map(it => ({
  id: it.id, title: it.title || it.name || 'Untitled',
  price: Number(it.price ?? 0),
  rating: Number(it.rating ?? (it.reviews?.[0]?.rating ?? NaN))
})))

const filtered = computed(() => {
  const arr = items.value.filter(i =>
    i.price >= (minPrice.value||0) &&
    (isNaN(i.rating) ? true : i.rating >= (minRating.value||0))
  )
  const { key, order } = sort.value
  arr.sort((a,b) => (a[key] ?? 0) - (b[key] ?? 0))
  if (order==='desc') arr.reverse()
  return arr
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const pageItems = computed(() => filtered.value.slice(pageIndex.value * pageSize, (pageIndex.value+1)*pageSize))

function toggleSort(key){
  if (sort.value.key === key){ sort.value.order = (sort.value.order === 'asc' ? 'desc':'asc') }
  else { sort.value.key = key; sort.value.order = 'asc' }
}
function ariaSort(key){
  if (sort.value.key !== key) return 'none'
  return sort.value.order === 'asc' ? 'ascending' : 'descending'
}

async function auditExport(payload){
  try{
    await fetch(`${BASE}/auditExport`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    })
  }catch(e){ /* ignore */ }
}

function rows(all){
  const rows = all ? filtered.value : pageItems.value
  return rows.map(r => ({ ...r, price: r.price.toFixed(2) }))
}
function exportCSV(all){
  const data = rows(all)
  exportToCSV('Admin', columns, data)
  auditExport({
    table: 'Admin',
    format: 'csv',
    scope: all ? 'all' : 'page',
    count: data.length,
    filters: { minPrice: minPrice.value, minRating: minRating.value },
    sort: sort.value,
    user: store?.state?.session?.email || null
  })
}
function exportPDF(all){
  const data = rows(all)
  exportToPDF('Admin', columns, data, 'Admin')
  auditExport({
    table: 'Admin',
    format: 'pdf',
    scope: all ? 'all' : 'page',
    count: data.length,
    filters: { minPrice: minPrice.value, minRating: minRating.value },
    sort: sort.value,
    user: store?.state?.session?.email || null
  })
}
</script>

<style scoped>
.table{ width:100%; border-collapse:collapse; }
.table th,.table td{ border:1px solid #e5e7eb; padding:8px; text-align:left; }
.linklike{ background:none; border:none; color:#1d4ed8; cursor:pointer; text-decoration:underline; }
.pagination{ display:flex; gap:6px; align-items:center; margin-top:10px; flex-wrap:wrap; }
.inline{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.toolbar{ display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:10px; flex-wrap:wrap; }
.sr-only{ position:absolute!important; width:1px; height:1px; overflow:hidden; clip:rect(1px,1px,1px,1px); white-space:nowrap; border:0; padding:0; margin:-1px; }
</style>
