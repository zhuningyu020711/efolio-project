<template>
  <header class="bar">
    <div class="brand">✨ Campus Event Management (Demo)</div>
    <nav class="hstack">
      <button class="btn" @click="page='home'">Home</button>
      <button class="btn" @click="page='catalog'">Catalog</button>
      <button class="btn" @click="page='email'">Email</button>
      <button class="btn" @click="page='serverless'">Serverless</button>
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
        Use the navigation to open <strong>Catalog</strong>, <strong>Email</strong>, <strong>Serverless</strong>, <strong>Admin</strong>, and <strong>Dashboard</strong>.
      </p>
      <ul>
        <li>✅ Firebase Auth</li>
        <li>✅ Email via EmailJS (no backend keys in frontend)</li>
        <li>✅ Interactive Tables (Admin / Catalog) with filters & pagination</li>
        <li>✅ Serverless aggregation with Cloudflare Workers</li>
        <li>☁️ Deployed on Cloudflare Pages</li>
      </ul>
    </section>

    <!-- Catalog -->
    <section v-else-if="page==='catalog'" class="card">
      <h2>Catalog</h2>
      <Catalog />
    </section>

    <!-- Email -->
    <section v-else-if="page==='email'" class="card">
      <h2>Email</h2>
      <Email />
    </section>

    <!-- Serverless -->
    <section v-else-if="page==='serverless'" class="card">
      <h2>Serverless</h2>
      <ServerlessDemo />
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

// 现有组件
import Auth from './components/Auth.vue'
import Admin from './components/Admin.vue'
import Catalog from './components/Catalog.vue'
import Email from './components/Email.vue'

// 新增的 Serverless 演示页
import ServerlessDemo from './components/ServerlessDemo.vue'

const store = useStore()
const page = ref('home')
const isAdmin = store.isAdmin

const myReviews = computed(() => {
  try { return store.userReviews?.() || [] } catch { return [] }
})

function findItem(id){
  try { return (store.state.items || []).find(it => it.id === id) } catch { return null }
}
function resetData(){
  if (store.resetItems) store.resetItems()
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
.muted{color:var(--muted)}
.inline{display:flex;gap:10px;align-items:center}
.grid{display:grid;gap:12px}
.btn{border:1px solid #ccc;background:#f0f0f0;color:var(--text);border-radius:8px;padding:8px 14px;cursor:pointer}
.btn.primary{background:var(--brand);color:#fff;border:none}
.btn.success{background:var(--accent);color:#fff;border:none}
.btn.danger{background:var(--danger);color:#fff;border:none}
.pill{display:inline-flex;gap:6px;align-items:center;padding:4px 8px;border-radius:999px;
  background:#f2f2f2;border:1px solid #ccc;font-size:12px}
</style>
