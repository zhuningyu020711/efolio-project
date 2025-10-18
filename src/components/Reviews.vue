<template>
    <section class="rev">
      <div class="row">
        <label class="lbl" for="itm">Select Item</label>
        <select id="itm" class="input" v-model="pickId">
          <option v-for="it in items" :key="it.id" :value="it.id">{{ it.title }} — {{ it.category }}</option>
        </select>
      </div>
  
      <div v-if="current" class="panel">
        <h3 class="ttl">{{ current.title }}</h3>
        <p class="muted">{{ current.description }}</p>
  
        <div class="stats">
          <span class="pill">Average: <strong>{{ avg.toFixed(2) }}</strong> / 5</span>
          <span class="pill">{{ current.reviews.length }} review(s)</span>
        </div>
  
        <form class="write" @submit.prevent="submit">
          <fieldset>
            <legend class="lbl">Your rating</legend>
            <div class="stars" role="radiogroup" aria-label="Rate">
              <label v-for="n in 5" :key="n" class="star">
                <input type="radio" name="rate" :value="n" v-model.number="rating" />
                <span :class="{on: n<=rating}">★</span>
              </label>
            </div>
          </fieldset>
  
          <label class="lbl" for="cmt">Comment</label>
          <textarea id="cmt" class="input" rows="3" v-model.trim="comment" placeholder="Say something helpful (5–250 chars)"></textarea>
  
          <div class="mini muted">Logged in as: <strong>{{ store.state.session?.displayName || 'Guest' }}</strong></div>
  
          <div class="actions">
            <button class="btn primary" type="submit" :disabled="!store.state.session">Submit review</button>
            <span class="muted" v-if="!store.state.session">Please login first.</span>
          </div>
  
          <p class="ok" v-if="ok">{{ ok }}</p>
          <p class="err" v-if="err">{{ err }}</p>
        </form>
      </div>
  
      <div v-if="current" class="panel">
        <h3>All Reviews</h3>
        <ul class="list">
          <li v-for="r in current.reviews.slice().reverse()" :key="r.id">
            <div class="head">
              <span class="stars-view">{{ '★'.repeat(r.rating) }}{{ '☆'.repeat(5-r.rating) }}</span>
              <strong>{{ r.byName }}</strong>
              <span class="muted">{{ new Date(r.createdAt).toLocaleString() }}</span>
            </div>
            <div class="body">{{ r.comment }}</div>
          </li>
          <li v-if="current.reviews.length===0" class="muted">No reviews yet.</li>
        </ul>
      </div>
  
      <div class="panel">
        <h3>My Reviews</h3>
        <ul class="list">
          <li v-for="r in myReviews" :key="r.id">
            <div class="head">
              <span class="stars-view">{{ '★'.repeat(r.rating) }}{{ '☆'.repeat(5-r.rating) }}</span>
              <strong>{{ findItem(r.itemId)?.title || 'Item' }}</strong>
              <span class="muted">{{ new Date(r.createdAt).toLocaleString() }}</span>
            </div>
            <div class="body">{{ r.comment }}</div>
          </li>
          <li v-if="myReviews.length===0" class="muted">No personal reviews.</li>
        </ul>
      </div>
    </section>
  </template>
  
  <script setup>
  import { computed, ref } from 'vue'
  import { useStore } from '../utils/useStore'
  
  const store = useStore()
  const items = computed(() => store.state.items || [])
  const pickId = ref(items.value[0]?.id || null)
  
  const current = computed(() => items.value.find(i => i.id === pickId.value))
  const avg = computed(() => current.value ? store.avgRating(current.value) : 0)
  
  const rating = ref(5)
  const comment = ref('')
  const ok = ref('')
  const err = ref('')
  
  function submit(){
    ok.value = err.value = ''
    try{
      store.submitReview(pickId.value, { rating: rating.value, comment: comment.value })
      ok.value = 'Thanks for your review!'
      comment.value = ''
    }catch(e){
      err.value = e.message || 'Failed'
    }
  }
  
  const myReviews = computed(() => store.userReviews())
  function findItem(id){ return items.value.find(i => i.id===id) }
  </script>
  
  <style scoped>
  .rev{display:flex;flex-direction:column;gap:12px}
  .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .panel{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px}
  .lbl{font-weight:600}
  .input{border:1px solid #d1d5db;border-radius:8px;padding:8px}
  .ttl{margin:0 0 6px}
  .pill{display:inline-flex;gap:6px;align-items:center;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:999px;padding:2px 8px;margin-right:8px}
  .stats{margin:8px 0}
  .stars{display:flex;gap:2px}
  .star input{position:absolute;left:-9999px}
  .star span{font-size:22px;color:#cbd5e1;cursor:pointer}
  .star span.on{color:#f59e0b}
  .actions{margin-top:8px;display:flex;gap:8px;align-items:center}
  .btn{border:1px solid #475569;background:#f8fafc;color:#111827;border-radius:8px;padding:8px 12px;cursor:pointer}
  .btn.primary{background:#1d4ed8;border-color:#1d4ed8;color:#fff}
  .ok{color:#16a34a}
  .err{color:#b91c1c}
  .list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px}
  .head{display:flex;gap:8px;align-items:center}
  .stars-view{color:#f59e0b}
  .muted{color:#6b7280}
  .body{white-space:pre-wrap}
  </style>
  