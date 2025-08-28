<template>
    <div class="card">
      <div class="bar">
        <h2>Catalog</h2>
        <input class="input" placeholder="Search (≥3 chars)" v-model.trim="q" />
      </div>
  
      <div v-if="!items.length" class="muted">No items yet.</div>
  
      <div class="grid">
        <article v-for="it in filtered" :key="it.id" class="card item">
          <header class="inline">
            <h3>{{ it.title }}</h3>
            <span class="pill">{{ it.category }}</span>
          </header>
          <p class="muted">{{ it.description }}</p>
  
          <div class="inline">
            <div class="pill">
              <span class="star">★</span>
              <strong>{{ avg(it).toFixed(1) }}</strong> / 5
              <span class="muted">({{ it.reviews.length }})</span>
            </div>
          </div>
  
          <details>
            <summary>View reviews</summary>
            <div v-if="it.reviews.length===0" class="muted">No reviews yet.</div>
            <div v-else class="grid">
              <div v-for="rv in it.reviews" :key="rv.id" class="card">
                <div class="inline">
                  <span class="pill">{{ rv.rating }} ★</span>
                  <span class="muted">by {{ rv.byName }} • {{ new Date(rv.createdAt).toLocaleString() }}</span>
                </div>
                <p>{{ rv.comment }}</p>
              </div>
            </div>
          </details>
  
          <div v-if="store.state.session" class="card">
            <form class="grid" @submit.prevent="submit(it.id)">
              <label>Rating (1–5)
                <input class="input" type="number" min="1" max="5" step="1" v-model.number="form[it.id].rating" required />
              </label>
  
              <label>Comment (5–250)
                <textarea class="input" rows="3" v-model.trim="form[it.id].comment" required minlength="5" maxlength="250"></textarea>
              </label>
  
              <button class="btn primary">Submit</button>
            </form>
          </div>
          <div v-else class="muted">Login to leave a review.</div>
        </article>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, computed, watch } from 'vue'
  import { useStore } from '../utils/useStore'
  
  const store = useStore()
  const q = ref('')
  const form = reactive({})
  
  const items = computed(() => store.state.items)
  
  watch(items, (nv) => {
    nv.forEach(it => { if (!form[it.id]) form[it.id] = { rating:5, comment:'' } })
  }, { immediate: true })
  
  const filtered = computed(() => {
    const s = (q.value || '').trim().toLowerCase()
    if (!s) return items.value
    if (s.length < 3) return []
    return items.value.filter(it =>
      [it.title, it.category, it.description].some(t => t.toLowerCase().includes(s))
    )
  })
  
  const avg = (it) => store.avgRating(it)
  
  function submit(id){
    const { rating, comment } = form[id]
    try{
      store.submitReview(id, { rating, comment })
      form[id] = { rating:5, comment:'' }
    }catch(e){ alert(e.message) }
  }
  </script>
  
  <style scoped>
.card{background:var(--panel);border:1px solid #ddd;border-radius:12px;padding:16px;box-shadow:0 4px 10px rgba(0,0,0,.08)}
.grid{display:grid;gap:12px}
.item{gap:10px}
.inline{display:flex;gap:10px;align-items:center}
.pill{display:inline-flex;gap:6px;align-items:center;padding:4px 8px;border-radius:999px;background:#f2f2f2;border:1px solid #ccc;font-size:12px;color:var(--text)}
.star{font-size:18px;color:#ffbb33}
.input{width:100%;border:1px solid #ccc;background:#fff;color:var(--text);border-radius:8px;padding:10px 12px}
.bar{display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:8px}
.muted{color:var(--muted)}
.btn{border:1px solid #ccc;background:#f0f0f0;color:var(--text);border-radius:8px;padding:10px 14px;cursor:pointer}
.btn.primary{background:var(--brand);color:#fff;border:none}
</style>

  