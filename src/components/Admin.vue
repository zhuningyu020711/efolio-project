<template>
  <section class="admin">
    <!-- 非管理员 -->
    <template v-if="!isAdmin">
      <div class="panel">
        <h3>Admins only</h3>
        <p class="muted">You must be an administrator to view this page.</p>
      </div>
    </template>

    <!-- 管理员视图 -->
    <template v-else>
      <!-- 当前会话 -->
      <div class="panel">
        <h3>Current Session</h3>
        <p class="muted mini">
          <strong>{{ session?.email || '—' }}</strong>
          <span class="tag admin" v-if="isAdmin">admin</span>
          <span class="tag user" v-else>user</span>
        </p>
        <p class="mini muted">UID: {{ session?.uid || session?.id || '—' }}</p>
      </div>

      <!-- 用户列表 + 导出 -->
      <div class="panel">
        <div class="head-row">
          <h3>Users</h3>
          <div class="row-inline">
            <button class="btn" @click="exportUsersCSV" :disabled="displayUsers.length===0">Export CSV</button>
            <span class="muted mini">{{ displayUsers.length }} user(s)</span>
          </div>
        </div>

        <p class="muted mini">
          This table is populated when users sign in.
          Dev admin: <code>admin@demo.local</code>
        </p>

        <div class="table-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>User Id</th>
                <th>Last Login</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in displayUsers" :key="u.id || u.uid || u.email">
                <td>{{ u.email || '—' }}</td>
                <td>{{ u.displayName || '—' }}</td>
                <td><span class="tag" :class="u.role || 'user'">{{ u.role || 'user' }}</span></td>
                <td class="mono">{{ u.id || u.uid || '—' }}</td>
                <td class="mono">{{ formatTime(u.lastLogin) }}</td>
              </tr>
              <tr v-if="displayUsers.length===0">
                <td colspan="5" class="muted">No users yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Catalog 管理（本地存储） -->
      <div class="panel">
        <h3>Catalog Management</h3>
        <p class="muted mini">This version stores data in your browser (localStorage). New items appear in Catalog immediately.</p>

        <div class="grid2">
          <!-- 新增 / 修改 -->
          <form class="card" @submit.prevent="createItem">
            <h4>Create / Upsert Event (local)</h4>

            <div class="grid2">
              <label class="stack">
                <span class="lbl">Event ID</span>
                <input v-model.trim="form.id" placeholder="e.g., 121" required />
              </label>
              <label class="stack">
                <span class="lbl">Title</span>
                <input v-model.trim="form.title" placeholder="Title" required />
              </label>
            </div>

            <div class="grid2">
              <label class="stack">
                <span class="lbl">Organizer</span>
                <input v-model.trim="form.organizer" placeholder="Organizer" />
              </label>
              <label class="stack">
                <span class="lbl">Category</span>
                <input v-model.trim="form.category" placeholder="Category" />
              </label>
            </div>

            <div class="grid2">
              <label class="stack">
                <span class="lbl">Venue</span>
                <input v-model.trim="form.venue" placeholder="Venue" />
              </label>
              <label class="stack">
                <span class="lbl">Date (ISO)</span>
                <input v-model.trim="form.date" placeholder="2025-05-01T10:00:00" />
              </label>
            </div>

            <div class="grid2">
              <label class="stack">
                <span class="lbl">Seats taken</span>
                <input type="number" v-model.number="form.seatsTaken" min="0" placeholder="0" />
              </label>
              <label class="stack">
                <span class="lbl">Seats total</span>
                <input type="number" v-model.number="form.seatsTotal" min="0" placeholder="0" />
              </label>
            </div>

            <div class="grid2">
              <label class="stack">
                <span class="lbl">Price</span>
                <input type="number" step="0.01" v-model.number="form.price" placeholder="0" />
              </label>
              <label class="stack">
                <span class="lbl">Status</span>
                <select v-model="form.status">
                  <option>Open</option>
                  <option>Closed</option>
                  <option>Sold out</option>
                </select>
              </label>
            </div>

            <div class="inline">
              <button class="btn primary">{{ saving ? 'Saving…' : 'Save' }}</button>
              <span v-if="msg" class="ok">{{ msg }}</span>
              <span v-if="err" class="err">{{ err }}</span>
            </div>

            <p class="muted mini" style="margin-top:6px">Open Catalog to see the item immediately.</p>
          </form>

          <!-- 删除 -->
          <form class="card" @submit.prevent="deleteItem">
            <h4>Delete Event</h4>
            <label class="stack">
              <span class="lbl">Event ID</span>
              <input v-model.trim="delId" placeholder="e.g., 121" required />
            </label>
            <div class="inline">
              <button class="btn">{{ deleting ? 'Deleting…' : 'Delete' }}</button>
              <span v-if="dmsg" class="ok">{{ dmsg }}</span>
              <span v-if="derr" class="err">{{ derr }}</span>
            </div>
          </form>
        </div>

        <!-- 当前本地新增项预览 -->
        <div class="card">
          <h4>Local Extras</h4>
          <ul class="list">
            <li v-for="it in extras" :key="it.id">
              <code>#{{ it.id }}</code> — {{ it.title }}
            </li>
            <li v-if="extras.length===0" class="muted">No extra items yet.</li>
          </ul>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useStore } from '../utils/useStore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'

const store = useStore()
const auth = getAuth()

/* ---------- 会话与管理员判断 ---------- */
const session = computed(() => store.state?.session ?? null)
const isAdmin = computed(() => {
  const raw = store.isAdmin?.value
  if (typeof raw !== 'undefined') return !!raw
  const s = session.value
  const email = (s?.email || '').toLowerCase()
  return s?.role === 'admin' || email === 'admin@demo.local'
})

/* ---------- 用户表：合并 store 和 localStorage ---------- */
function readUsersLS(){
  try { return JSON.parse(localStorage.getItem('users') || '[]') } catch { return [] }
}
function writeUsersLS(list){
  localStorage.setItem('users', JSON.stringify(list))
}
function upsertUserLS(u){
  const list = readUsersLS()
  const idKey = String(u.id || u.uid || u.email || '')
  const idx = list.findIndex(x => String(x.id || x.uid || x.email || '') === idKey)
  if (idx >= 0) list[idx] = { ...list[idx], ...u }
  else list.push(u)
  writeUsersLS(list)
}
const storeUsers = computed(() => store.state?.users || [])
const displayUsers = computed(() => {
  // 合并并去重（id/uid/email 三选一作为 key）
  const map = new Map()
  for (const u of (storeUsers.value || [])) {
    const key = String(u.id || u.uid || u.email || '')
    if (!key) continue
    map.set(key, { ...u })
  }
  for (const u of readUsersLS()) {
    const key = String(u.id || u.uid || u.email || '')
    if (!key) continue
    if (!map.has(key)) map.set(key, { ...u })
    else map.set(key, { ...map.get(key), ...u })
  }
  // 排序：最近登录在前
  return Array.from(map.values()).sort((a,b) => (b.lastLogin||0) - (a.lastLogin||0))
})

function formatTime(t){
  if (!t) return '—'
  try{
    const d = new Date(t)
    return isNaN(d.getTime()) ? '—' : d.toLocaleString()
  }catch{ return '—' }
}

/* ---------- 导出用户 CSV ---------- */
function exportUsersCSV(){
  const headers = ['Email','Name','Role','UserId','LastLogin']
  const lines = displayUsers.value.map(u => ([
    u.email || '',
    u.displayName || '',
    u.role || 'user',
    u.id || u.uid || '',
    formatTime(u.lastLogin)
  ]))
  const csv = [headers, ...lines]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'users.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

/* ---------- 监听登录态：同步到 store & localStorage.users ---------- */
onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    if (user){
      const sess = {
        id: user.uid,
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
        role: (user.email || '').toLowerCase() === 'admin@demo.local' ? 'admin' : 'user',
        lastLogin: Date.now(),
      }
      // 写入会话
      store.setSession?.(sess)
      // 写入/更新到 localStorage.users
      upsertUserLS(sess)
      // 如果你的 store 有 addUser(s) 之类 API，也尝试同步一下（没有就忽略）
      try {
        if (typeof store.addUser === 'function') store.addUser(sess)
        else if (typeof store.setUsers === 'function') {
          const ls = readUsersLS()
          store.setUsers(ls)
        }
      } catch {}
    } else {
      store.clearSession?.()
    }
  })
})
/* 也允许手动刷新：如果其它标签页写入 users，这里跟着更新（依赖计算属性自动刷新） */
window.addEventListener?.('storage', (e) => {
  if (e.key === 'users') {
    // 计算属性 displayUsers 会自动重新取值
  }
})

/* ---------- Catalog 本地管理（与之前保持一致） ---------- */
const form = ref({
  id: '', title: '', organizer: '', category: '', venue: '',
  date: '', seatsTaken: 0, seatsTotal: 0, price: 0, status: 'Open'
})
const delId = ref('')
const saving = ref(false), err = ref(''), msg = ref('')
const deleting = ref(false), derr = ref(''), dmsg = ref('')
const extras = ref([])

function readExtras(){
  try { extras.value = JSON.parse(localStorage.getItem('catalog_items') || '[]') } catch { extras.value = [] }
}
function writeExtras(list){
  localStorage.setItem('catalog_items', JSON.stringify(list))
  readExtras()
}
function createItem(){
  err.value = ''; msg.value = ''
  if (!form.value.id || !form.value.title){ err.value = 'Missing id or title'; return }
  saving.value = true
  try{
    const list = (extras.value || []).slice()
    const id = String(form.value.id)
    const payload = {
      id,
      title: form.value.title,
      organizer: form.value.organizer || '',
      category: form.value.category || '',
      venue: form.value.venue || '',
      date: form.value.date || '',
      seats: { taken: Number(form.value.seatsTaken||0), total: Number(form.value.seatsTotal||0) },
      price: Number(form.value.price||0),
      status: form.value.status || 'Open'
    }
    const idx = list.findIndex(x => String(x.id)===id)
    if (idx >= 0) list[idx] = payload
    else list.push(payload)
    writeExtras(list)
    msg.value = `Saved #${id}`
  }catch(e){
    err.value = e?.message || 'Failed'
  }finally{
    saving.value = false
  }
}
function deleteItem(){
  derr.value = ''; dmsg.value = ''
  if (!delId.value){ derr.value = 'Missing id'; return }
  deleting.value = true
  try{
    const id = String(delId.value)
    const list = (extras.value || []).filter(x => String(x.id)!==id)
    writeExtras(list)
    // 连带清理本地评分与评论
    try{
      const ratings = JSON.parse(localStorage.getItem('ratingsIndex') || '{}')
      if (ratings[id]){ delete ratings[id]; localStorage.setItem('ratingsIndex', JSON.stringify(ratings)) }
      const reviews = JSON.parse(localStorage.getItem('reviews') || '[]')
      localStorage.setItem('reviews', JSON.stringify(reviews.filter(r => String(r.itemId)!==id)))
    }catch{}
    dmsg.value = `Deleted #${id}`
  }catch(e){
    derr.value = e?.message || 'Failed'
  }finally{
    deleting.value = false
  }
}
onMounted(readExtras)
</script>

<style scoped>
.admin{display:flex;flex-direction:column;gap:12px}
.panel{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px}
.muted{color:#6b7280}.mini{font-size:12px}
.tag{display:inline-block;padding:2px 8px;border-radius:999px;border:1px solid #e5e7eb;background:#f8fafc;text-transform:capitalize}
.tag.admin{background:#dbeafe;border-color:#93c5fd}
.tag.user{background:#ecfccb;border-color:#bbf7d0}

.table-wrap{overflow:auto;border:1px solid #e5e7eb;border-radius:10px}
.tbl{width:100%;border-collapse:separate;border-spacing:0}
.tbl thead th{background:#eef2f7;font-weight:700;border-bottom:1px solid #dce3ea}
.tbl th,.tbl td{padding:10px;border-bottom:1px solid #eef2f7;vertical-align:top}
.mono{font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace}

.head-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
.row-inline{display:flex;gap:8px;align-items:center;flex-wrap:wrap}

.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-top:8px}
.card{border:1px solid #e5e7eb;border-radius:10px;padding:10px;background:#fff}
.stack{display:flex;flex-direction:column;gap:6px;margin-bottom:8px}
.inline{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.btn{border:1px solid #cbd5e1;background:#f3f4f6;border-radius:8px;padding:6px 10px;cursor:pointer}
.btn.primary{background:#2563eb;border-color:#2563eb;color:#fff}
.ok{color:#16a34a}.err{color:#b91c1c}
.list{margin:0;padding-left:18px}
</style>
