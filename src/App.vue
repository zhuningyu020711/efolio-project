<template>
  <header class="bar" role="banner">
    <div class="brand" id="site-name">✨ Campus Event Management (Demo)</div>

    <nav class="hstack" role="navigation" aria-label="Primary">
      <button type="button" class="btn" :aria-current="page==='home' ? 'page' : null" @click="page='home'">Home</button>
      <button type="button" class="btn" :aria-current="page==='catalog' ? 'page' : null" @click="page='catalog'">Catalog</button>
      <button type="button" class="btn" :aria-current="page==='email' ? 'page' : null" @click="page='email'">Email</button>
      <button type="button" class="btn" :aria-current="page==='serverless' ? 'page' : null" @click="page='serverless'">Serverless</button>
      <button type="button" class="btn" v-if="store.state.session" :aria-current="page==='dashboard' ? 'page' : null" @click="page='dashboard'">Dashboard</button>
      <button type="button" class="btn" v-if="isAdmin" :aria-current="page==='admin' ? 'page' : null" @click="page='admin'">Admin</button>
      <button type="button" class="btn" :aria-current="page==='map' ? 'page' : null" @click="page='map'">Map</button>
      <button type="button" class="btn" @click="resetData">Reset Data</button>

      <!-- 登录 / 登出（只这一块是新增/修改） -->
      <template v-if="!store.state.session">
        <button type="button" class="btn"
                :aria-current="page==='auth' ? 'page' : null"
                @click="page='auth'">
          Login / Register
        </button>
      </template>
      <template v-else>
        <span class="pill" style="margin-left:4px">{{ store.state.session.email || 'user' }}</span>
        <button type="button" class="btn danger" aria-label="Log out" @click="onLogout">Logout</button>
      </template>
    </nav>
  </header>

  <main id="main" class="wrap" role="main" tabindex="-1">
    <!-- Home -->
    <section v-if="page==='home'" class="card" aria-labelledby="home-h1">
      <h1 id="home-h1">Welcome</h1>
      <p class="muted">
        Use the navigation to open <strong>Catalog</strong>, <strong>Email</strong>,
        <strong>Serverless</strong>, <strong>Map</strong>, <strong>Admin</strong>, and <strong>Dashboard</strong>.
      </p>
      <ul>
        <li>✅ Firebase Auth</li>
        <li>✅ Email via EmailJS (no backend keys in frontend)</li>
        <li>✅ Interactive Tables (Admin / Catalog) with filters & pagination</li>
        <li>✅ Serverless aggregation with Cloudflare Workers</li>
        <li>✅ Mapbox: route planning + nearby POI</li>
        <li>☁️ Deployed on Cloudflare Pages</li>
      </ul>
    </section>

    <!-- Catalog -->
    <section v-else-if="page==='catalog'" class="card" aria-labelledby="catalog-h1">
      <h1 id="catalog-h1">Catalog</h1>
      <Catalog />
    </section>

    <!-- Email -->
    <section v-else-if="page==='email'" class="card" aria-labelledby="email-h1">
      <h1 id="email-h1">Email</h1>
      <Email />
    </section>

    <!-- Serverless -->
    <section v-else-if="page==='serverless'" class="card" aria-labelledby="serverless-h1">
      <h1 id="serverless-h1">Serverless</h1>
      <ServerlessDemo />
    </section>

    <!-- Map -->
    <section v-else-if="page==='map'" class="card" style="padding:0" aria-labelledby="map-h1">
      <h1 id="map-h1" class="sr-only">Map & Geolocation</h1>
      <MapView />
    </section>

    <!-- Auth -->
    <section v-else-if="page==='auth'" class="card" aria-labelledby="auth-h1">
      <h1 id="auth-h1">Login / Register</h1>
      <Auth />
    </section>

    <!-- Dashboard -->
    <section v-else-if="page==='dashboard'" class="card" aria-labelledby="dash-h1">
      <h1 id="dash-h1">Dashboard</h1>
      <p v-if="!store.state.session" class="muted">Please log in.</p>
      <div v-else>
        <p class="pill" aria-live="polite">
          Logged in as <strong>{{ store.state.session.displayName || 'User' }}</strong>
          ({{ store.state.session.email }}) — role:
          <strong>{{ store.state.session.role || 'user' }}</strong>
        </p>

        <h2>Your reviews</h2>
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
    <section v-else-if="page==='admin'" class="card" aria-labelledby="admin-h1">
      <h1 id="admin-h1">Admin</h1>
      <p v-if="!isAdmin" class="muted">Only admin can access this page.</p>
      <div v-else>
        <Admin />
      </div>
    </section>

    <!-- fallback -->
    <section v-else class="card" aria-labelledby="nf-h1">
      <h1 id="nf-h1">Not found</h1>
    </section>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from './utils/useStore'

// 子页面
import Auth from './components/Auth.vue'
import Admin from './components/Admin.vue'
import Catalog from './components/Catalog.vue'
import Email from './components/Email.vue'
import MapView from './components/Map.vue'
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
  try {
    if (store.logout) store.logout()
    else if (store.clearSession) store.clearSession()
  } catch {}
  page.value = 'home'
}
</script>

<style scoped>
:root{
  --brand:#3b82f6; --accent:#16a34a; --danger:#b91c1c;
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
.muted{color:#6b7280}
.inline{display:flex;gap:10px;align-items:center}
.grid{display:grid;gap:12px}
.btn{border:1px solid #ccc;background:#f0f0f0;color:var(--text);border-radius:8px;padding:8px 14px;cursor:pointer}
.btn.primary{background:#1d4ed8;color:#fff;border:none}
.btn.success{background:var(--accent);color:#fff;border:none}
.btn.danger{background:#b91c1c;color:#fff;border:none}
.pill{display:inline-flex;gap:6px;align-items:center;padding:4px 8px;border-radius:999px;
  background:#f2f2f2;border:1px solid #ccc;font-size:12px}
</style>
