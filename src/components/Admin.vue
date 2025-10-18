<template>
  <section class="admin">
    <template v-if="!isAdmin">
      <div class="panel">
        <h3>Admins only</h3>
        <p class="muted">You must be an administrator to view this page.</p>
      </div>
    </template>

    <template v-else>
      <div class="panel">
        <h3>Current Session</h3>
        <p class="muted mini">
          <strong>{{ session?.email }}</strong>
          <span class="tag admin" v-if="isAdmin">admin</span>
          <span class="tag user" v-else>user</span>
        </p>
        <p class="mini muted">UID: {{ session?.uid || session?.id }}</p>
      </div>

      <div class="panel">
        <h3>Users</h3>
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
              <tr v-for="u in users" :key="u.id">
                <td>{{ u.email }}</td>
                <td>{{ u.displayName }}</td>
                <td><span class="tag" :class="u.role">{{ u.role || 'user' }}</span></td>
                <td class="mono">{{ u.id || u.uid }}</td>
                <td class="mono">{{ formatTime(u.lastLogin) }}</td>
              </tr>
              <tr v-if="users.length===0">
                <td colspan="5" class="muted">No users yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useStore } from '../utils/useStore'

// Firebase Auth（只用来监听会话变化）
import { getAuth, onAuthStateChanged } from 'firebase/auth'

const store = useStore()
const auth = getAuth()

const session = computed(() => store.state?.session ?? null)
const users   = computed(() => store.state?.users ?? [])
// store.isAdmin 在 useStore.js 里是 computed，直接拿它的 .value
const isAdmin = computed(() => {
  const raw = store.isAdmin?.value
  if (typeof raw !== 'undefined') return !!raw
  // 兜底逻辑：如果 session.role==='admin' 或 email 命中 dev admin
  const s = session.value
  const email = (s?.email || '').toLowerCase()
  return s?.role === 'admin' || email === 'admin@demo.local'
})

function formatTime(t){
  if (!t) return '—'
  try{
    const d = new Date(t)
    return isNaN(d.getTime()) ? '—' : d.toLocaleString()
  }catch{ return '—' }
}

// 监听 Firebase 登录态，保持和本地 store 同步
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
      store.setSession?.(sess)
    } else {
      store.clearSession?.()
    }
  })
})
</script>

<style scoped>
.admin{display:flex;flex-direction:column;gap:12px}
.panel{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px}
.table-wrap{overflow:auto;border:1px solid #e5e7eb;border-radius:10px}
.tbl{width:100%;border-collapse:separate;border-spacing:0}
.tbl thead th{background:#eef2f7;font-weight:700;border-bottom:1px solid #dce3ea}
.tbl th,.tbl td{padding:10px;border-bottom:1px solid #eef2f7;vertical-align:top}
.mono{font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace}
.muted{color:#6b7280}
.mini{font-size:12px}
.tag{display:inline-block;padding:2px 8px;border-radius:999px;border:1px solid #e5e7eb;background:#f8fafc;text-transform:capitalize}
.tag.admin{background:#dbeafe;border-color:#93c5fd}
.tag.user{background:#ecfccb;border-color:#bbf7d0}
</style>
