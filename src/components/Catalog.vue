<template>
  <div class="card">
    <div class="bar">
      <h2>Catalog</h2>
      <input class="input" placeholder="Search (≥3 chars)" v-model.trim="q" />
    </div>

    <div v-if="safeItems.length === 0" class="muted">No items yet.</div>

    <div class="grid" v-else>
      <article v-for="it in filtered" :key="it.id" class="card item">
        <header class="inline">
          <h3>{{ safeText(it.title) }}</h3>
          <span class="pill">{{ safeText(it.category) }}</span>
        </header>
        <p class="muted">{{ safeText(it.description) }}</p>

        <div class="inline">
          <div class="pill">
            <span class="star">★</span>
            <strong>{{ avg(it).toFixed(1) }}</strong> / 5
            <span class="muted">({{ (it.reviews || []).length }})</span>
          </div>
        </div>

        <details>
          <summary>View reviews</summary>
          <div v-if="(it.reviews || []).length === 0" class="muted">No reviews yet.</div>
          <div v-else class="grid">
            <div v-for="rv in it.reviews" :key="rv.id" class="card">
              <div class="inline">
                <span class="pill">{{ Number(rv.rating) || 0 }} ★</span>
                <span class="muted">
                  by {{ safeText(rv.byName) }} • {{ new Date(rv.createdAt || Date.now()).toLocaleString() }}
                </span>
              </div>
              <p>{{ safeText(rv.comment) }}</p>
            </div>
          </div>
        </details>

        <!-- 登录后才显示表单；并且先确保 form[it.id] 已初始化 -->
        <div v-if="store.state.session" class="card">
          <template v-if="ensureForm(it.id)">
            <form class="grid" @submit.prevent="submit(it.id)">
              <label>Rating (1–5)
                <input
                  class="input" type="number" min="1" max="5" step="1"
                  v-model.number="form[it.id].rating" required
                />
              </label>

              <label>Comment (5–250)
                <textarea
                  class="input" rows="3"
                  v-model.trim="form[it.id].comment"
                  required minlength="5" maxlength="250"
                ></textarea>
              </label>

              <button class="btn primary">Submit</button>
            </form>
          </template>
        </div>
        <div v-else class="muted">Login to leave a review.</div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useStore } from '../utils/useStore'

const store = useStore()
const q = ref('')
const form = reactive({})

// 安全获取 items（始终是数组）
const safeItems = computed(() => Array.isArray(store.state.items) ? store.state.items : [])

// 组件挂载时可加载外部数据（失败不影响）
onMounted(async () => {
  try { await store.loadExternalData?.() } catch {}
})

// 任何文本都转成字符串，避免 toLowerCase 报错
const safeText = (v) => (v == null ? '' : String(v))

// 少于 3 个字符显示全部；否则模糊搜索
const filtered = computed(() => {
  const s = safeText(q.value).trim().toLowerCase()
  const list = safeItems.value
  if (s.length < 3) return list
  return list.filter(it => {
    const segs = [safeText(it.title), safeText(it.category), safeText(it.description)]
    return segs.some(t => t.toLowerCase().includes(s))
  })
})

// 平均分安全计算
const avg = (it) => {
  const arr = Array.isArray(it.reviews) ? it.reviews : []
  if (arr.length === 0) return 0
  const sum = arr.reduce((a, b) => a + (Number(b.rating) || 0), 0)
  return sum / arr.length
}

// ⭐ 关键：先确保 form[id] 存在，再渲染 v-model
function ensureForm(id){
  if (!form[id]) form[id] = { rating: 5, comment: '' }
  return true
}

function submit(id){
  ensureForm(id)
  const { rating, comment } = form[id]
  try{
    store.submitReview(id, { rating, comment })
    form[id] = { rating: 5, comment: '' }
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
