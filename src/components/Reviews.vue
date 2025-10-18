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
  
          <div class="mini muted">Logged in as: <strong>{{ displayName }}</strong></div>
  
          <div class="actions">
            <button class="btn primary" type="submit">Submit review</button>
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
  import { computed, ref, onMounted, watch } from 'vue'
  import { useStore } from '../utils/useStore'
  
  /* —— 简单会话显示（没有后端也能用） —— */
  const store = useStore?.() || {}
  const session = store?.state?.session || null
  const displayName = computed(() => session?.displayName || session?.email?.split('@')[0] || 'Guest')
  const uid = computed(() => session?.uid || 'guest')
  
  /* —— 读全量活动：20条基础 + Admin 新增（localStorage） —— */
  function base20(){
    return [
      { id: 101, title: 'Welcome Fair', category: 'Festival', description: 'Student Union · Main Lawn · Festival' },
      { id: 102, title: 'Intro to Vue 3 Workshop', category: 'Workshop', description: 'IT Club · IT Building 203 · Workshop' },
      { id: 103, title: 'Data Science Seminar', category: 'Talk', description: 'Engineering Faculty · Eng LT-1 · Talk' },
      { id: 104, title: 'Acoustic Night', category: 'Music', description: 'Music Society · Student Theatre · Music' },
      { id: 105, title: 'Career Fair', category: 'Fair', description: 'Careers & Employability · Convention Hall · Fair' },
      { id: 106, title: 'Basketball: Intra-school Cup', category: 'Sports', description: 'Sports Centre · Court A · Sports' },
      { id: 107, title: 'Photography Walk', category: 'Outdoor', description: 'Art Club · City Trail · Outdoor' },
      { id: 108, title: 'Startup Pitch Night', category: 'Competition', description: 'Entrepreneurship Club · Biz Hub 1F · Competition' },
      { id: 109, title: 'Python for Research', category: 'Workshop', description: 'Library · Lib Lab B · Workshop' },
      { id: 110, title: 'Cultural Food Market', category: 'Festival', description: 'Global Lounge · Quad · Festival' },
      { id: 111, title: 'Game Jam 24h', category: 'Competition', description: 'Gaming Club · Lab 4 · Competition' },
      { id: 112, title: 'Machine Learning 101', category: 'Talk', description: 'CS Dept · CS LT · Talk' },
      { id: 113, title: 'Badminton Friendly', category: 'Sports', description: 'Sports Centre · Hall B · Sports' },
      { id: 114, title: 'Sustainability Forum', category: 'Forum', description: 'Green Office · Admin LT · Forum' },
      { id: 115, title: 'Debate: AI in Education', category: 'Debate', description: 'Debate Society · Humanities LT-2 · Debate' },
      { id: 116, title: 'Volunteer Day', category: 'Volunteer', description: 'Community Service · Neighborhood Centre · Volunteer' },
      { id: 117, title: 'Film Night: Classics', category: 'Movie', description: 'Film Club · Cinema Hall · Movie' },
      { id: 118, title: 'Hackathon (48h)', category: 'Competition', description: 'CS Dept · Innovation Hub · Competition' },
      { id: 119, title: 'Jazz Evening', category: 'Music', description: 'Music Society · Auditorium · Music' },
      { id: 120, title: 'Thesis Writing Clinic', category: 'Workshop', description: 'Graduate School · Grad Centre Rm 5 · Workshop' },
    ]
  }
  function readExtras(){
    try { return JSON.parse(localStorage.getItem('catalog_items') || '[]') } catch { return [] }
  }
  function mergeItems(){
    const base = base20()
    const has = new Set(base.map(b => String(b.id)))
    const extras = readExtras().map(e => ({
      id: isNaN(+e.id) ? e.id : Number(e.id),
      title: e.title || `Event ${e.id}`,
      category: e.category || '',
      description: `${e.organizer || ''} · ${e.venue || ''} · ${e.category || ''}`.replace(/^ · /,'').replace(/ · $/,'')
    }))
    const add = extras.filter(x => !has.has(String(x.id)))
    return base.concat(add)
  }
  
  /* —— 评分索引（与 Catalog 同结构，确保联动） —— */
  function getIndex(){ try { return JSON.parse(localStorage.getItem('ratingsIndex') || '{}') } catch { return {} } }
  function setIndex(idx){ localStorage.setItem('ratingsIndex', JSON.stringify(idx)) }
  function ensureRec(id){
    const idx = getIndex()
    if (!idx[id]){ idx[id] = { total: 0, count: 0, userScore: 0 }; setIndex(idx) }
  }
  function avgOf(id){
    const rec = getIndex()[id]
    return (!rec || rec.count===0) ? 0 : (rec.total / rec.count)
  }
  function addRating(id, val){
    const idx = getIndex()
    const rec = idx[id] || { total: 0, count: 0, userScore: 0 }
    const prev = Number(rec.userScore || 0)
    const firstTime = prev === 0
    rec.userScore = val
    rec.total += (val - prev)
    if (firstTime) rec.count += 1
    idx[id] = rec
    setIndex(idx)
  }
  
  /* —— 评论表 —— */
  function readReviews(){ try { return JSON.parse(localStorage.getItem('reviews') || '[]') } catch { return [] } }
  function writeReviews(list){ localStorage.setItem('reviews', JSON.stringify(list)) }
  
  /* —— 组件状态 —— */
  const items = ref(mergeItems())
  items.value.forEach(it => ensureRec(String(it.id)))
  
  const pickId = ref(items.value[0]?.id || null)
  const current = computed(() => {
    const it = items.value.find(i => String(i.id) === String(pickId.value))
    if (!it) return null
    const all = readReviews().filter(r => String(r.itemId) === String(it.id))
    return { ...it, reviews: all }
  })
  const avg = computed(() => current.value ? avgOf(String(current.value.id)) : 0)
  
  const rating = ref(5)
  const comment = ref('')
  const ok = ref('')
  const err = ref('')
  
  function submit(){
    ok.value = err.value = ''
    if (!current.value){ err.value = 'Please select an item.'; return }
    if (!(rating.value >= 1 && rating.value <= 5)){ err.value = 'Rating must be 1–5.'; return }
    if (comment.value && (comment.value.length < 5 || comment.value.length > 250)){
      err.value = 'Comment length must be 5–250 characters.'; return
    }
  
    try{
      // 1) 写入评分索引（会联动 Catalog）
      addRating(String(current.value.id), Number(rating.value))
  
      // 2) 写入评论表
      const list = readReviews()
      list.push({
        id: crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(16).slice(2),
        itemId: String(current.value.id),
        rating: Number(rating.value),
        comment: comment.value || '',
        userId: uid.value,
        byName: displayName.value,
        createdAt: Date.now()
      })
      writeReviews(list)
  
      // 3) 刷新当前项
      items.value = mergeItems()
      ok.value = 'Thanks for your review!'
      comment.value = ''
    }catch(e){
      err.value = e?.message || 'Failed'
    }
  }
  
  /* —— 我的评论 —— */
  const myReviews = computed(() => readReviews().filter(r => r.userId === uid.value))
  function findItem(id){ return items.value.find(i => String(i.id)===String(id)) }
  
  /* —— 当 Admin 新增/删除 或其它标签页评分/评论时，自动同步 —— */
  onMounted(() => {
    window.addEventListener('storage', (e) => {
      if (e.key === 'catalog_items' || e.key === 'reviews' || e.key === 'ratingsIndex') {
        items.value = mergeItems()
      }
    })
  })
  watch(pickId, () => { ok.value = ''; err.value = '' })
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
  