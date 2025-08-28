import { reactive, computed } from 'vue'
import { sanitize } from './sanitize'

// LocalStorage keys
const USERS_KEY   = 'app_users_v1'
const SESSION_KEY = 'app_session_v1'
const LOCK_KEY    = 'app_lock_v1'
const ITEMS_KEY   = 'app_items_v1'

// Helpers
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)
const LS = {
  get(k, fb){ try { return JSON.parse(localStorage.getItem(k)) ?? fb } catch { return fb } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)) }
}

// Hash function (SHA-256, hex)
async function sha256Hex(str){
  const enc  = new TextEncoder().encode(str)
  const buf  = await crypto.subtle.digest('SHA-256', enc)
  const arr  = Array.from(new Uint8Array(buf))
  return arr.map(b => b.toString(16).padStart(2,'0')).join('')
}

// Seed admin + items
function seed(){
  const users = LS.get(USERS_KEY, [])
  if (!users.some(u => u.email === 'admin@demo.local')){
    const salt = uid()
    const admin = {
      id: uid(),
      displayName: 'Administrator',
      email: 'admin@demo.local',
      role: 'admin',
      salt,
      passwordHash: ''
    }
    sha256Hex('Admin123!' + salt).then(hash => {
      admin.passwordHash = hash
      users.push(admin)
      LS.set(USERS_KEY, users)
    })
  }
  if (!LS.get(ITEMS_KEY, null)){
    LS.set(ITEMS_KEY, [
      { id: uid(), title:'Intro to Vue 3', category:'Course', description:'Build reactive UIs with the Composition API.', reviews:[] },
      { id: uid(), title:'Modern CSS Layouts', category:'Workshop', description:'Grid & Flexbox for responsive design.', reviews:[] },
      { id: uid(), title:'Secure Frontend Basics', category:'Seminar', description:'XSS, CSP, sanitization, safe rendering.', reviews:[] },
    ])
  }
}
seed()

// Global state
const state = reactive({
  users:    LS.get(USERS_KEY, []),
  session:  LS.get(SESSION_KEY, null),
  items:    LS.get(ITEMS_KEY, []),
  lock:     LS.get(LOCK_KEY, { fails:0, until:0 }),
})

// Computed flags
const isLocked = computed(() => state.lock.until && Date.now() < state.lock.until)
const isAdmin  = computed(() => state.session && state.session.role === 'admin')

// Save everything
function saveAll(){
  LS.set(USERS_KEY, state.users)
  LS.set(SESSION_KEY, state.session)
  LS.set(ITEMS_KEY, state.items)
  LS.set(LOCK_KEY, state.lock)
}

// Logout
function logout(){
  state.session = null
  saveAll()
}

// Register new user
async function register({ displayName, email, password }){
  const name = sanitize((displayName||'').trim())
  const mail = sanitize((email||'').trim().toLowerCase())
  if (!/.+@.+\..+/.test(mail)) throw new Error('Invalid email')
  if (name.length < 2) throw new Error('Display name too short')
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password))
    throw new Error('Weak password')
  if (state.users.some(u => u.email === mail)) throw new Error('Email already registered')

  const salt = uid()
  const passwordHash = await sha256Hex(password + salt)
  const user = { id: uid(), displayName:name, email:mail, role:'user', salt, passwordHash }
  state.users.push(user)
  state.session = { id:user.id, displayName:user.displayName, email:user.email, role:user.role }
  saveAll()
  return state.session
}

// Login
async function login({ email, password }){
  if (isLocked.value) throw new Error('Locked due to failed attempts. Try later.')

  const mail = sanitize((email||'').trim().toLowerCase())
  const user = state.users.find(u => u.email === mail)
  if (!user){ bumpLock(); throw new Error('Invalid credentials') }

  const hash = await sha256Hex(password + user.salt)
  if (hash !== user.passwordHash){ bumpLock(); throw new Error('Invalid credentials') }

  resetLock()
  state.session = { id:user.id, displayName:user.displayName, email:user.email, role:user.role }
  saveAll()
  return state.session
}

// Lockout helpers
function bumpLock(){
  state.lock.fails += 1
  if (state.lock.fails >= 3){ state.lock.until = Date.now() + 60_000 } // 60s
  saveAll()
}
function resetLock(){ state.lock = { fails:0, until:0 }; saveAll() }

// Items management
function addItem({ title, category, description }){
  if (!isAdmin.value) throw new Error('Admins only')
  const t = sanitize((title||'').trim())
  const c = sanitize((category||'').trim())
  const d = sanitize((description||'').trim())
  if (t.length<3 || c.length<3 || d.length<10) throw new Error('Please complete all fields')
  const it = { id: uid(), title:t, category:c, description:d, reviews:[] }
  state.items.unshift(it)
  saveAll()
  return it
}
function removeItem(id){
  if (!isAdmin.value) throw new Error('Admins only')
  const i = state.items.findIndex(x=>x.id===id)
  if (i>=0){ state.items.splice(i,1); saveAll() }
}

// Reviews
function avgRating(item){
  if (!item.reviews.length) return 0
  return item.reviews.reduce((a,b)=>a + (b.rating||0), 0) / item.reviews.length
}
function submitReview(itemId, { rating, comment }){
  if (!state.session) throw new Error('Login required')
  const item = state.items.find(x=>x.id===itemId)
  if (!item) throw new Error('Item not found')
  const r = Number(rating)
  const c = sanitize((comment||'').trim())
  if (!(r>=1 && r<=5)) throw new Error('Rating must be 1–5')
  if (c.length < 5 || c.length > 250) throw new Error('Comment length must be 5–250 chars')
  item.reviews.push({ id: uid(), itemId, rating:r, comment:c, byId: state.session.id, byName: state.session.displayName, createdAt: Date.now() })
  saveAll()
}
function userReviews(){
  if (!state.session) return []
  return state.items.flatMap(it=>it.reviews).filter(r=>r.byId === state.session.id).sort((a,b)=>b.createdAt - a.createdAt)
}

// Export store
export function useStore(){
  return {
    state,
    isLocked,
    isAdmin,
    register,
    login,
    logout,
    addItem,
    removeItem,
    submitReview,
    avgRating,
    userReviews,
  }
}
