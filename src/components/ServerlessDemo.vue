<template>
    <section class="card">
      <h2>Serverless Demo (Cloudflare Workers)</h2>
      <p class="muted">Send all ratings to a serverless function for aggregation.</p>
  
      <div class="inline">
        <button class="btn primary" :disabled="loading" @click="run">
          Compute Summary (Server)
        </button>
        <span v-if="loading" class="muted">Working…</span>
        <span v-if="status" :class="ok ? 'ok' : 'err'">{{ status }}</span>
      </div>
  
      <div v-if="result" class="grid mt">
        <div class="stat"><span>Count</span><strong>{{ result.count }}</strong></div>
        <div class="stat"><span>Average</span><strong>{{ result.avg.toFixed(2) }}</strong></div>
        <div class="stat"><span>Min</span><strong>{{ result.min ?? '-' }}</strong></div>
        <div class="stat"><span>Max</span><strong>{{ result.max ?? '-' }}</strong></div>
      </div>
  
      <div v-if="result" class="card mt">
        <h3>Distribution (nearest star)</h3>
        <table class="dist">
          <thead><tr><th>Stars</th><th>Count</th></tr></thead>
          <tbody>
            <tr v-for="k in [0,1,2,3,4,5]" :key="k">
              <td>{{ k }}</td>
              <td>{{ result.buckets[k] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </template>
  
  <script setup>
  import { ref, computed } from 'vue'
  import { useStore } from '../utils/useStore'
  import { summarizeRatings } from '../services/serverless'
  
  const store = useStore()
  const items = computed(() => store.state.items || [])
  
  const loading = ref(false)
  const status  = ref('')
  const ok      = ref(false)
  const result  = ref(null)
  
  function collectRatings(){
    const ratings = []
    for (const it of items.value) {
      for (const r of (it.reviews || [])) {
        const n = Number(r?.rating)
        if (Number.isFinite(n)) ratings.push(n)
      }
    }
    return ratings
  }
  
  async function run(){
    loading.value = true; status.value=''; ok.value=false; result.value=null
    try{
      const ratings = collectRatings()
      const data = await summarizeRatings(ratings)
      result.value = data
      ok.value = true
      status.value = 'Done ✅'
    }catch(e){
      ok.value = false
      status.value = 'Failed ❌ ' + (e?.message || e)
    }finally{
      loading.value = false
    }
  }
  </script>
  
  <style scoped>
  .card{background:#fff;border:1px solid #ddd;border-radius:12px;padding:16px}
  .inline{display:flex;gap:10px;align-items:center}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px}
  .stat{border:1px solid #eee;border-radius:10px;padding:10px}
  .muted{color:#6b7280}
  .ok{color:#16a34a}.err{color:#ef4444}
  .btn{border:1px solid #ccc;background:#f0f0f0;color:#222;border-radius:8px;padding:8px 12px;cursor:pointer}
  .btn.primary{background:#3b82f6;color:#fff;border:none}
  table.dist{width:100%;border-collapse:collapse}
  table.dist th,table.dist td{border:1px solid #eee;padding:6px 8px;text-align:left}
  .mt{margin-top:12px}
  </style>
  