<template>
  <header class="bar">
    <div class="brand">✨ Campus Event Management (Demo)</div>
    <nav class="hstack">
      <button class="btn" @click="page='home'">Home</button>
      <button class="btn" @click="page='catalog'">Catalog</button>
      <button class="btn" v-if="!store.state.session" @click="page='auth'">Login / Register</button>
      <button class="btn" v-if="store.state.session" @click="page='dashboard'">Dashboard</button>
      <button class="btn" v-if="isAdmin" @click="page='admin'">Admin</button>
      <button class="btn danger" v-if="store.state.session" @click="logout">Logout</button>
    </nav>
  </header>

  <main class="wrap">
    <!-- 首页 -->
    <section v-if="page==='home'" class="hero card">
      <div class="hero-head">
        <h1 class="hero-title">Manage campus events with ease</h1>
        <p class="hero-sub">
          Default admin account:
          <kbd>admin@demo.local</kbd> / <kbd>Admin123!</kbd>
        </p>
        <div class="hero-cta">
          <button class="btn primary" @click="page='catalog'">
            <i class="pi pi-list" style="margin-right:6px"></i> Explore Catalog
          </button>
          <button class="btn" v-if="!store.state.session" @click="page='auth'">
            <i class="pi pi-user-plus" style="margin-right:6px"></i> Join Now
          </button>
          <button class="btn" v-else @click="page='dashboard'">
            <i class="pi pi-user" style="margin-right:6px"></i> Go to Dashboard
          </button>
        </div>
      </div>

      <div class="hero-feats">
        <div class="feat">
          <i class="pi pi-desktop feat-icon"></i>
          <div>
            <h3>Responsive UI</h3>
            <p class="muted">Looks great on phones, tablets and desktops.</p>
          </div>
        </div>
        <div class="feat">
          <i class="pi pi-check-circle feat-icon"></i>
          <div>
            <h3>Validations</h3>
            <p class="muted">Email, password and review validations included.</p>
          </div>
        </div>
        <div class="feat">
          <i class="pi pi-users feat-icon"></i>
          <div>
            <h3>Auth & Roles</h3>
            <p class="muted">Login/Register with user & admin access.</p>
          </div>
        </div>
        <div class="feat">
          <i class="pi pi-star feat-icon"></i>
          <div>
            <h3>Ratings</h3>
            <p class="muted">Reviews with aggregated average score.</p>
          </div>
        </div>
        <div class="feat">
          <i class="pi pi-database feat-icon"></i>
          <div>
            <h3>Dynamic Data</h3>
            <p class="muted">Seeded items + JSON imports on demand.</p>
          </div>
        </div>
        <div class="feat">
          <i class="pi pi-shield feat-icon"></i>
          <div>
            <h3>Security</h3>
            <p class="muted">Sanitization & hashed passwords for safety.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 登录/注册 -->
    <Auth v-else-if="page==='auth'" />

    <!-- Catalog 页面 -->
    <Catalog v-else-if="page==='catalog'" />

    <!-- Dashboard -->
    <section v-else-if="page==='dashboard'" class="card">
      <h2>Dashboard</h2>
      <p v-if="!store.state.session" class="muted">Please log in.</p>
      <div v-else>
        <p class="pill">
          Logged in as <strong>{{ store.state.session.displayName }}</strong>
          ({{ store.state.session.email }}) — role:
          <strong>{{ store.state.session.role }}</strong>
        </p>
        <h3>Your recent reviews</h3>
        <div v-if="reviews.length===0" class="muted">No reviews yet.</div>
        <div v-else class="grid">
          <div v-for="r in reviews" :key="r.id" class="card">
            <div class="inline">
              <span class="pill">{{ findItem(r.itemId)?.title || 'Unknown' }}</span>
              <span class="pill">{{ r.rating }} ★</span>
              <span class="muted">{{ new Date(r.createdAt).toLocaleString() }}</span>
            </div>
            <p>{{ r.comment }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Admin 页面 -->
    <Admin v-else-if="page==='admin'" />
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from './utils/useStore'
import Auth from './components/Auth.vue'
import Catalog from './components/Catalog.vue'
import Admin from './components/Admin.vue'

const store = useStore()
const page = ref('home')

const isAdmin = computed(() => store.isAdmin.value)
const reviews = computed(() => store.userReviews())
const findItem = (id) => store.state.items.find(x => x.id === id)

function logout(){
  store.logout()
  page.value = 'home'
}
</script>

<style>
.wrap{max-width:1100px;margin:0 auto;padding:16px}
header.bar{
  position:sticky;top:0;z-index:10;
  background:#ffffffee; backdrop-filter:saturate(150%) blur(6px);
  border-bottom:1px solid #ddd; display:flex;justify-content:space-between;align-items:center;padding:12px 16px
}
.brand{font-weight:700;color:var(--brand)}
.hstack{display:flex;gap:8px;align-items:center}
.card{background:var(--panel);border:1px solid #ddd;border-radius:16px;padding:16px;box-shadow:0 6px 16px rgba(0,0,0,.06)}
.muted{color:var(--muted)} .note{color:var(--muted);font-size:14px}
.inline{display:flex;gap:10px;align-items:center} .grid{display:grid;gap:12px}
.btn{appearance:none;border:1px solid #ccc;background:#f0f0f0;color:var(--text);border-radius:12px;padding:10px 14px;cursor:pointer}
.btn.danger{background:var(--danger);color:#fff;border:none}
.pill{display:inline-flex;gap:6px;align-items:center;padding:4px 8px;border-radius:999px;background:#f2f2f2;border:1px solid #ccc;font-size:12px}

/* Hero */
.hero{
  overflow:hidden;
  padding:28px;
  border-radius:20px;
  background:
    radial-gradient(1200px 500px at -10% -20%, rgba(43,104,255,0.10), transparent 60%),
    radial-gradient(1000px 400px at 120% -10%, rgba(29,187,114,0.12), transparent 60%),
    var(--panel);
}
.hero-head{ display:grid; gap:14px; margin-bottom:14px; }
.hero-title{ font-size:42px; line-height:1.15; margin:0; }
.hero-sub{ margin:0; color:var(--muted); font-size:16px; }
.hero-cta{ display:flex; gap:10px; flex-wrap:wrap; margin-top:6px; }

.hero-feats{
  display:grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap:14px; margin-top:10px;
}
@media (max-width: 720px){
  .hero-title{ font-size:32px; }
  .hero-feats{ grid-template-columns: 1fr; }
}
.feat{ display:flex; gap:12px; align-items:flex-start; padding:12px; border:1px solid #e8e8e8; border-radius:12px; background:#fff; }
.feat-icon{ font-size:22px; line-height:1; color:var(--brand); }
</style>
