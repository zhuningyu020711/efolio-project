<template>
  <header class="bar">
    <div class="brand">✨ Campus Event Management (Demo)</div>
    <nav class="hstack">
      <button class="btn" @click="page='home'">Home</button>
      <button class="btn" @click="page='catalog'">Catalog</button>
      <button class="btn" @click="page='email'">Email</button>
      <button class="btn" v-if="!store.state.session" @click="page='auth'">Login / Register</button>
      <button class="btn" v-if="store.state.session" @click="page='dashboard'">Dashboard</button>
      <button class="btn" v-if="isAdmin" @click="page='admin'">Admin</button>
      <button class="btn" @click="resetData">Reset Data</button>
      <button class="btn danger" v-if="store.state.session" @click="onLogout">Logout</button>
    </nav>
  </header>

  <main class="wrap">
    <!-- Home -->
    <section v-if="page==='home'" class="card">
      <h2>Welcome</h2>
      <p class="muted">
        This is a demo app for your assignment. Use the top navigation to try
        <strong>Catalog</strong>, <strong>Email</strong>, <strong>Admin</strong> and <strong>Dashboard</strong>.
      </p>
      <ul>
        <li>✅ Firebase Auth 已完成（你已实现）</li>
        <li>✅ Email（SendGrid + Cloud Functions）— 见 <em>Email</em> 栏</li>
        <li>✅ 交互表格（Admin / Catalog 使用 DataTable 可做 D.3）</li>
        <li>☁️ 部署（D.4）推荐 Cloudflare Pages / Firebase Hosting</li>
      </ul>
    </section>

    <!-- Catalog（你的列表页，可改造成 DataTable） -->
    <section v-else-if="page==='catalog'" class="card">
      <h2>Catalog</h2>
      <Catalog />
    </section>

    <!-- Email（新页） -->
    <section v-else-if="page==='email'" class="card">
      <h2>Email</h2>
      <Email />
    </section>

    <!-- Auth -->
    <section v-else-if="page==='auth'" class="card">
      <h2>Login / Register</h2>
      <Auth />
    </section>

    <!-- Dashboard -->
    <section v-else-if="page==='dashboard'" class="card">
      <h2>Dashboard</h2>
      <p v-if="!store.state.session" class="muted">Please log in.</p>
      <div v-else>
        <p class="pill">
          Logged in as <strong>{{ store.state.session.displayName || 'User' }}</strong>
          ({{ store.state.session.email }}) — role:
          <strong>{{ store.state.session.role || 'user' }}</strong>
        </p>

        <h3>Your reviews</h3>
        <div v-if="myReviews.length===0" class="muted">No reviews yet.</div>
        <div v-else class="grid">
          <div v-for="r in myReviews" :key="r.id" class="card">
            <div class="inline">
              <span class="pill">{{ findItem(r.itemId)?.title || 'Unknown item' }}</span>
              <span class="pill">Rating: {{ r.rating }}</span>
            </div>
            <p class="muted">{{ r.comment }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Admin -->
    <section v-else-if="page==='admin'" class="card">
      <h2>Admin</h2>
      <p v-if="!isAdmin" class="muted">Only admin can access this page.</p>
      <div v-else>
        <Admin />
      </div>
    </section>

    <!-- fallback -->
    <section v-else class="card">
      <h2>Not found</h2>
    </section>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from './utils/useStore'

// 组件
import Auth from './components/Auth.vue'
import Admin from './components/Admin.vue'
import Catalog from './components/Catalog.vue'
import Email from './components/Email.vue'

const store = useStore()
const page = ref('home')

// isAdmin：你的 useStore.js 已经暴露 computed，直接用即可
const isAdmin = store.isAdmin

// 个人评论（假设 useStore 有 userReviews()）
const myReviews = computed(() => {
  try { return store.userReviews?.() || [] } catch { return [] }
})

// 找 item（为了在 Dashboard 里显示标题）
function findItem(id){
  try { return (store.state.items || []).find(it => it.id === id) } catch { return null }
}

function resetData(){
  // 你的 useStore 里有 resetItems() / loadExternalData()；这里优先 resetItems
  if (store.resetItems) store.resetItems()
  // 如果有“加载样例数据”的函数，可以顺便触发
  if (store.loadExternalData) store.loadExternalData()
}

function onLogout(){
  if (store.logout) store.logout()
}
</script>

<style scoped>
:root{
  --brand:#3b82f6; --accent:#16a34a; --danger:#ef4444;
  --text:#222; --muted:#6b7280; --panel:#fff;
}
*{box-sizing:border-box}
body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial}
.wrap{max-width:1100px;margin:24px auto;padding:0 16px}
.bar{
  position:sticky;top:0;z-index:10;background:#ffffffee;
  backdrop-filter:saturate(150%) blur(6px);
  border-bottom:1px solid #ddd;display:flex;justify-content:space-between;
  align-items:center;padding:12px 16px
}
.brand{font-weight:700;color:var(--brand)}
.hstack{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.card{background:var(--panel);border:1px solid #ddd;border-radius:12px;padding:16px;
  box-shadow:0 4px 10px rgba(0,0,0,0.08)}
.muted{color:var(--muted)} .note{color:var(--muted);font-size:14px}
.inline{display:flex;gap:10px;align-items:center} .grid{display:grid;gap:12px}
.btn{border:1px solid #ccc;background:#f0f0f0;color:var(--text);border-radius:8px;padding:8px 14px;cursor:pointer}
.btn.primary{background:var(--brand);color:#fff;border:none}
.btn.success{background:var(--accent);color:#fff;border:none}
.btn.danger{background:var(--danger);color:#fff;border:none}
.pill{display:inline-flex;gap:6px;align-items:center;padding:4px 8px;border-radius:999px;
  background:#f2f2f2;border:1px solid #ccc;font-size:12px}
</style>
