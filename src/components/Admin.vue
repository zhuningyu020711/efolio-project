<template>
  <section class="card">
    <h3 class="mb-2">All Items (Admin)</h3>

    <!-- 筛选区 -->
    <div class="filters">
      <div class="row">
        <label class="cell">
          <span>Global</span>
          <InputText v-model="q.global" placeholder="Search all…" />
        </label>
        <label class="cell">
          <span>Title</span>
          <InputText v-model="q.title" placeholder="Title…" />
        </label>
        <label class="cell">
          <span>Category</span>
          <InputText v-model="q.category" placeholder="Category…" />
        </label>
      </div>

      <div class="row">
        <label class="cell">
          <span>Price Min</span>
          <InputText v-model.number="q.priceMin" type="number" placeholder="min" />
        </label>
        <label class="cell">
          <span>Price Max</span>
          <InputText v-model.number="q.priceMax" type="number" placeholder="max" />
        </label>
        <label class="cell">
          <span>Rating Min</span>
          <InputText v-model.number="q.ratingMin" type="number" placeholder="0–5" />
        </label>
        <label class="cell">
          <span>Rating Max</span>
          <InputText v-model.number="q.ratingMax" type="number" placeholder="0–5" />
        </label>

        <button class="btn" @click="resetFilters">Reset</button>
      </div>
    </div>

    <DataTable
      :value="filteredItems"
      dataKey="id"
      paginator
      :rows="10"
      :rowsPerPageOptions="[10,20,50]"
      removableSort
      responsiveLayout="scroll"
      :emptyMessage="'No items found'"
    >
      <Column field="title" header="Title" sortable />
      <Column field="category" header="Category" sortable />
      <Column header="Avg" sortable :sortFunction="sortByAvg">
        <template #body="slotProps">{{ avg(slotProps.data).toFixed(1) }}</template>
      </Column>
      <Column header="Reviews" :body="it => (it.reviews?.length || 0)" sortable />
      <Column field="price" header="Price" sortable>
        <template #body="slotProps">{{ formatPrice(slotProps.data.price) }}</template>
      </Column>
      <Column header="Actions" style="width:140px">
        <template #body="slotProps">
          <button class="btn danger" @click="onDelete(slotProps.data)">Delete</button>
        </template>
      </Column>
    </DataTable>
  </section>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useStore } from '../utils/useStore'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'

const store = useStore()
const items = computed(() => store.state.items || [])

const q = reactive({
  global: '',
  title: '',
  category: '',
  priceMin: null,
  priceMax: null,
  ratingMin: null,
  ratingMax: null
})
function resetFilters(){
  q.global = q.title = q.category = ''
  q.priceMin = q.priceMax = q.ratingMin = q.ratingMax = null
}
function avg(it){
  const arr = it.reviews || []
  if (!arr.length) return 0
  return arr.reduce((s,r)=>s+(Number(r.rating)||0),0)/arr.length
}
function formatPrice(p){
  if (p == null || p === '') return '-'
  const n = Number(p)
  return isNaN(n) ? '-' : `$${n.toFixed(2)}`
}
function sortByAvg(ev){
  const dir = ev.order
  ev.data.sort((a,b) => (avg(a)-avg(b)) * dir)
}
const contains = (source, needle) =>
  String(source ?? '').toLowerCase().includes(String(needle ?? '').toLowerCase())

const filteredItems = computed(() => {
  return (items.value || []).filter(it => {
    const t = it.title ?? ''
    const c = it.category ?? ''
    const p = it.price != null ? Number(it.price) : null
    const r = avg(it)

    if (q.global) {
      const hit = contains(t, q.global) || contains(c, q.global) ||
                  contains(formatPrice(p), q.global) || String(r).includes(q.global)
      if (!hit) return false
    }
    if (q.title && !contains(t, q.title)) return false
    if (q.category && !contains(c, q.category)) return false
    if (q.priceMin != null && !(p != null && p >= q.priceMin)) return false
    if (q.priceMax != null && !(p != null && p <= q.priceMax)) return false
    if (q.ratingMin != null && !(r >= q.ratingMin)) return false
    if (q.ratingMax != null && !(r <= q.ratingMax)) return false
    return true
  })
})

function onDelete(row){
  if (!confirm(`Delete "${row.title}" ?`)) return
  if (store.del) store.del(row.id)   // 按你的 store 实现对接
}
</script>

<style scoped>
.card{background:#fff;border:1px solid #ddd;border-radius:12px;padding:16px}
.filters{display:grid;gap:10px;margin-bottom:10px}
.row{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));align-items:end}
.cell{display:flex;flex-direction:column;gap:6px}
.mb-2{margin-bottom:12px}
.btn{border:1px solid #ccc;background:#f0f0f0;color:#222;border-radius:8px;padding:6px 10px;cursor:pointer}
.btn.danger{background:#ef4444;color:#fff;border:none}
</style>
