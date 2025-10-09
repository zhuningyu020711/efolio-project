<template>
  <section>
    <div class="toolbar">
      <div class="inline" role="search">
        <label for="q">Search</label>
        <input id="q" v-model.trim="q" placeholder="Search title…" @input="pageIndex=0" />
      </div>

      <div class="inline" role="group" aria-label="Export">
        <button type="button" class="btn" @click="exportCSV(false)" aria-label="Export current page to CSV">CSV (page)</button>
        <button type="button" class="btn" @click="exportCSV(true)"  aria-label="Export all results to CSV">CSV (all)</button>
        <button type="button" class="btn" @click="exportPDF(false)" aria-label="Export current page to PDF">PDF (page)</button>
        <button type="button" class="btn" @click="exportPDF(true)"  aria-label="Export all results to PDF">PDF (all)</button>
      </div>
    </div>

    <table class="table" aria-describedby="tblHelp">
      <caption id="tblHelp" class="sr-only">Sortable catalog table with pagination and export</caption>
      <thead>
        <tr>
          <th scope="col">
            <button type="button" class="linklike"
              :aria-sort="ariaSort('title')" @click="toggleSort('title')">
              Title <span class="sr-only" v-if="sort.key==='title'">({{ sort.order }})</span>
            </button>
          </th>
          <th scope="col">
            <button type="button" class="linklike"
              :aria-sort="ariaSort('price')" @click="toggleSort('price')">
              Price <span class="sr-only" v-if="sort.key==='price'">({{ sort.order }})</span>
            </button>
          </th>
          <th scope="col">Rating</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="it in pageItems" :key="it.id">
          <th scope="row">{{ it.title }}</th>
          <td>${{ it.price.toFixed(2) }}</td>
          <td>{{ isNaN(it.rating) ? '-' : it.rating }}</td>
        </tr>
        <tr v-if="pageItems.length===0"><td colspan="3">No results.</td></tr>
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
import { computed, ref } from 'vue'
import { useStore } from '../utils/useStore'
import { exportToCSV, exportToPDF } from '../utils/export'

const store = useStore()

const q = ref('')
const sort = ref({ key: 'title', order: 'asc' })
const pageIndex = ref(0)
const pageSize = 10

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'price', label: 'Price' },
  { key: 'rating', label: 'Rating' }
]

const items = computed(() => (store.state.items || []).map(it => ({
  id: it.id, title: it.title || it.name || 'Untitled',
  price: Number(it.price ?? 0),
  rating: Number(it.rating ?? (it.reviews?.[0]?.rating ?? NaN))
})))

const filtered = computed(() => {
  const s = q.value.toLowerCase()
  const arr = s ? items.value.filter(i => i.title.toLowerCase().includes(s)) : items.value.slice()
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

function dataForExport(all){
  const rows = all ? filtered.value : pageItems.value
  // 导出时格式化价格
  return rows.map(r => ({ ...r, price: r.price.toFixed(2) }))
}

function exportCSV(all){ exportToCSV('Catalog', columns, dataForExport(all)) }
function exportPDF(all){ exportToPDF('Catalog', columns, dataForExport(all), 'Catalog') }
</script>

<style scoped>
.table{ width:100%; border-collapse:collapse; }
.table th,.table td{ border:1px solid #e5e7eb; padding:8px; text-align:left; }
.linklike{ background:none; border:none; color:#1d4ed8; cursor:pointer; text-decoration:underline; }
.pagination{ display:flex; gap:6px; align-items:center; margin-top:10px; flex-wrap:wrap; }
.inline{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.toolbar{ display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:10px; flex-wrap:wrap; }
</style>
