<template>
  <a href="#main" class="skip-link">Skip to content</a>

  <header class="bar" role="banner">
    <div class="brand" id="site-name">✨ Campus Event Management (Demo)</div>

    <nav class="hstack" role="navigation" aria-label="Primary">
      <button type="button" class="btn" :aria-current="page==='home' ? 'page' : null" @click="go('home')" aria-label="Go to Home">Home</button>
      <button type="button" class="btn" :aria-current="page==='catalog' ? 'page' : null" @click="go('catalog')" aria-label="Open Catalog">Catalog</button>
      <button type="button" class="btn" :aria-current="page==='email' ? 'page' : null" @click="go('email')" aria-label="Open Email">Email</button>
      <button type="button" class="btn" :aria-current="page==='serverless' ? 'page' : null" @click="go('serverless')" aria-label="Open Serverless demos">Serverless</button>
      <button type="button" class="btn" v-if="store.state.session" :aria-current="page==='dashboard' ? 'page' : null" @click="go('dashboard')" aria-label="Open Dashboard">Dashboard</button>
      <button type="button" class="btn" v-if="isAdmin" :aria-current="page==='admin' ? 'page' : null" @click="go('admin')" aria-label="Open Admin">Admin</button>
      <button type="button" class="btn" :aria-current="page==='map' ? 'page' : null" @click="go('map')" aria-label="Open Map">Map</button>
      <button type="button" class="btn" @click="resetData" aria-label="Reset demo data">Reset Data</button>

      <template v-if="!store.state.session">
        <button type="button" class="btn" :aria-current="page==='auth' ? 'page' : null" @click="go('auth')" aria-label="Login or Register">
          Login / Register
        </button>
      </template>
      <template v-else>
        <span class="pill" style="margin-left:4px" aria-live="polite">{{ store.state.session.email || 'user' }}</span>
        <button type="button" class="btn danger" aria-label="Log out" @click="onLogout">Logout</button>
      </template>
    </nav>
  </header>

  <div class="sr-only" aria-live="polite">{{ liveMsg }}</div>

  <main id="main" class="wrap" role="main" tabindex="-1">

    <!-- 🏠 Home Page -->
    <section v-if="page==='home'" class="card hero" aria-labelledby="home-h1">
      <h1 id="home-h1" class="headline">
        Make Campus Events <span class="grad">Effortless</span>
      </h1>
      <p class="tagline">
        Plan. Notify. Navigate. Attend. — Everything in one lightweight demo app.
      </p>

      <div class="quick-actions" role="group" aria-label="Quick actions">
        <button class="btn primary lg" @click="go('catalog')" aria-label="Open catalog">Browse Catalog</button>
        <button class="btn outline lg" @click="go('map')" aria-label="Open map">Open Map</button>
        <button class="btn success lg" v-if="store.state.session" @click="go('dashboard')" aria-label="Open dashboard">
          Go to Dashboard
        </button>
        <button class="btn lg" v-else @click="go('auth')" aria-label="Login or Register">
          Login / Register
        </button>
      </div>

      <div class="features" role="list" aria-label="Key features">
        <article class="feature-card" role="listitem">
          <div class="ico">🔐</div>
          <h3>Firebase Auth</h3>
          <p>Clean login/register flow with secure session handling.</p>
        </article>

        <article class="feature-card" role="listitem">
          <div class="ico">✉️</div>
          <h3>Email</h3>
          <p>Send event updates via EmailJS without exposing backend keys.</p>
        </article>

        <article class="feature-card" role="listitem">
          <div class="ico">📊</div>
          <h3>Interactive Tables</h3>
          <p>Sortable, filterable data tables for Admin and Catalog views.</p>
        </article>

        <article class="feature-card" role="listitem">
          <div class="ico">⚙️</div>
          <h3>Serverless</h3>
          <p>Aggregation powered by Cloudflare Workers for scalability.</p>
        </article>

        <article class="feature-card" role="listitem">
          <div class="ico">🗺️</div>
          <h3>Mapbox Integration</h3>
          <p>Event routing, nearby facilities, and live location support.</p>
        </article>

        <article class="feature-card" role="listitem">
          <div class="ico">📈</div>
          <h3>Dashboard</h3>
          <p>Visual analytics, QR check-in, and AI copy generation.</p>
        </article>
      </div>

      <div class="note">
        ☁️ Deployed on Cloudflare Pages · Accessible & Keyboard-Friendly · WCAG-Minded
      </div>
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
        <EventDashboard :events="store.state.items" :attendance="store.state.attendance" />
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
import { ref } from 'vue'
import { useStore } from './utils/useStore'
import Auth from './components/Auth.vue'
import Admin from './components/Admin.vue'
import Catalog from './components/Catalog.vue'
import Email from './components/Email.vue'
import MapView from './components/Map.vue'
import ServerlessDemo from './components/ServerlessDemo.vue'
import EventDashboard from './components/EventDashboard.vue'

const store = useStore()
const page = ref('home')
const isAdmin = store.isAdmin
const liveMsg = ref('Home view')

function go(name){
  page.value = name
  const msg = name.charAt(0).toUpperCase() + name.slice(1) + ' view'
  liveMsg.value = msg
  requestAnimationFrame(() => {
    const el = document.getElementById('main')
    if (el) el.focus()
  })
}
function resetData(){
  if (store.resetItems) store.resetItems()
  if (store.loadExternalData) store.loadExternalData()
  liveMsg.value = 'Demo data reset'
}
function onLogout(){
  try { store.logout ? store.logout() : store.clearSession?.() } catch {}
  page.value = 'home'
  liveMsg.value = 'Logged out'
}
</script>

<style scoped>
:root{
  --brand:#3b82f6; --accent:#16a34a; --danger:#b91c1c;
  --text:#222; --muted:#4b5563; --panel:#fff;
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
.btn{border:1px solid #4b5563;background:#f3f4f6;color:#111827;border-radius:8px;padding:8px 14px;cursor:pointer}
.btn.primary{background:#1d4ed8;color:#fff;border:none}
.btn.success{background:var(--accent);color:#fff;border:none}
.btn.danger{background:#b91c1c;color:#fff;border:none}
.btn.outline{background:transparent;border:1.5px solid #cbd5e1;}
.btn.outline:hover{background:#f8fafc}
.btn.lg{padding:10px 16px;border-radius:10px;font-weight:600}
.pill{display:inline-flex;gap:6px;align-items:center;padding:4px 8px;border-radius:999px;background:#f2f2f2;border:1px solid #ccc;font-size:12px}

/* --- Home: Hero & Features --- */
.hero{
  padding:28px;background:
    radial-gradient(1200px 400px at 80% -10%, #dbeafe 0%, transparent 60%),
    radial-gradient(900px 300px at -10% 110%, #fef3c7 0%, transparent 60%),
    var(--panel);
  border:1px solid #e5e7eb;
}
.headline{
  font-size:clamp(28px,3.2vw,40px);
  line-height:1.15;margin:0 0 6px;letter-spacing:-0.02em;
}
.headline .grad{
  background:linear-gradient(90deg,#1d4ed8 0%,#22c55e 100%);
  -webkit-background-clip:text;background-clip:text;
  -webkit-text-fill-color:transparent;color:transparent;
  font-weight:800;
}
.tagline{color:var(--muted);margin:0 0 16px;font-size:15px;}
.quick-actions{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0 18px;}
.features{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
@media(max-width:980px){.features{grid-template-columns:repeat(2,1fr)}}
@media(max-width:620px){.features{grid-template-columns:1fr}}
.feature-card{background:#ffffffcc;border:1px solid #e5e7eb;border-radius:12px;padding:14px;
  transition:box-shadow .2s ease,transform .1s ease;}
.feature-card:hover{box-shadow:0 10px 24px rgba(0,0,0,.06);transform:translateY(-1px);}
.feature-card h3{margin:2px 0 6px;font-size:16px;}
.feature-card p{margin:0;color:var(--muted);font-size:13px;}
.feature-card .ico{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;font-size:18px;
  background:#eef2ff;color:#1d4ed8;margin-bottom:8px;}
.note{margin-top:14px;font-size:13px;color:var(--muted);background:#f8fafc;border:1px dashed #e5e7eb;
  border-radius:10px;padding:10px 12px;}

/* Skip link */
.skip-link{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}
.skip-link:focus{left:16px;top:12px;width:auto;height:auto;background:#111;color:#fff;padding:8px 12px;border-radius:8px;z-index:10000}
.sr-only{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}
</style>
