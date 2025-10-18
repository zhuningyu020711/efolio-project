import { reactive, computed } from 'vue'
import { sanitize } from './sanitize'

const USERS_KEY   = 'app_users_v1'
const SESSION_KEY = 'app_session_v1'
const ITEMS_KEY   = 'app_items_v2'

const DEV_ADMIN_EMAIL = 'admin@demo.local'
const DEV_ADMIN_PASS  = 'admin123'   // 可自行修改

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)
const LS = {
  get(k, fb){ try { return JSON.parse(localStorage.getItem(k)) ?? fb } catch { return fb } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)) }
}

function defaultItems(){
  return [
    { id: uid(), title:'Intro to Vue 3',         category:'Course',   description:'Build reactive UIs with the Composition API.', reviews:[] },
    { id: uid(), title:'Modern CSS Layouts',     category:'Workshop', description:'Grid & Flexbox for responsive design.',       reviews:[] },
    { id: uid(), title:'Secure Frontend Basics', category:'Seminar',  description:'XSS, CSP, sanitization, safe rendering.',     reviews:[] },
  ]
}

function seed(){
  const existing = LS.get(ITEMS_KEY, null)
  if (!Array.isArray(existing) || existing.length === 0){
    LS.set(ITEMS_KEY, defaultItems())
  }
}
seed()

const state = reactive({
  users:   LS.get(USERS_KEY, []),
  session: LS.get(SESSION_KEY, null),
  items:   LS.get(ITEMS_KEY, []),
})

const isAdmin = computed(() => state.session && state.session.role === 'admin')

function saveAll(){
  LS.set(USERS_KEY, state.users)
  LS.set(SESSION_KEY, state.session)
  LS.set(ITEMS_KEY, state.items)
}

/** 记录/更新用户到本地用户表 */
function upsertUser({ id, email, displayName, role }){
  if (!email) return
  const idx = state.users.findIndex(u => u.email === email)
  const rec = {
    id: id || uid(),
    email,
    displayName: displayName || 'User',
    role: role || 'user',
    lastLogin: Date.now()
  }
  if (idx === -1) state.users.push(rec)
  else state.users[idx] = { ...state.users[idx], ...rec }
  saveAll()
}

/** Session for Firebase / dev-admin */
function setSession(sess){
  state.session = sess
  upsertUser(sess)
  saveAll()
}
function clearSession(){
  state.session = null
  saveAll()
}
function logout(){
  state.session = null
  saveAll()
}

/** 本地管理员后门 */
function loginDev(email, password){
  if (email?.trim().toLowerCase() === DEV_ADMIN_EMAIL &&
      String(password) === DEV_ADMIN_PASS) {
    const sess = {
      id: 'dev-admin',
      displayName: 'Administrator',
      email: DEV_ADMIN_EMAIL,
      role: 'admin'
    }
    setSession(sess)
    return true
  }
  return false
}

/** CRUD Items */
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

/** Reviews */
function avgRating(item){
  if (!item?.reviews?.length) return 0
  return item.reviews.reduce((a,b)=>a+(b.rating||0),0)/item.reviews.length
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
  return state.items.flatMap(it=>it.reviews).filter(r=>r.byId===state.session.id).sort((a,b)=>b.createdAt - a.createdAt)
}

/** External JSON loader */
async function loadExternalData(){
  try {
    const authorsUrl = new URL('../assets/json/authors.json', import.meta.url)
    const storesUrl  = new URL('../assets/json/bookstores.json', import.meta.url)
    const [authors, stores] = await Promise.all([
      fetch(authorsUrl).then(r=>r.json()).catch(()=>[]),
      fetch(storesUrl).then(r=>r.json()).catch(()=>[]),
    ])
    const pack = (arr, cat) => Array.isArray(arr) ? arr.map(x=>({
      id: uid(),
      title: sanitize(String(x.name || x.title || x.id || 'Record')),
      category: cat,
      description: sanitize(Object.entries(x).slice(0,4).map(([k,v]) => `${k}: ${v}`).join(' • ') || `${cat} item`),
      reviews: [],
    })) : []
    state.items = [...pack(authors,'Authors'), ...pack(stores,'Bookstores'), ...state.items]
    saveAll()
  }catch(e){ console.warn('loadExternalData failed', e) }
}

function resetItems(){
  state.items = defaultItems()
  saveAll()
}

export function useStore(){
  return {
    state,
    isAdmin,
    // session & auth
    setSession, clearSession, logout, loginDev,
    // items & reviews
    addItem, removeItem,
    submitReview, avgRating, userReviews,
    // utils
    loadExternalData, resetItems,
  }
}