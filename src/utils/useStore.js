// src/utils/useStore.js
import { reactive, computed } from 'vue'

// —— LocalStorage keys ——
const USERS_KEY   = 'app_users_v1'
const SESSION_KEY = 'app_session_v1'
const ITEMS_KEY   = 'app_items_v2'

// —— Helpers ——
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)
const LS = {
  get(k, fb){ try { return JSON.parse(localStorage.getItem(k)) ?? fb } catch { return fb } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)) }
}

// —— Seed 默认数据（最小） ——
function defaultItems(){
  return [
    { id: uid(), title:'Intro to Vue 3',         category:'Course',   description:'Composition API basics', reviews:[] },
    { id: uid(), title:'Modern CSS Layouts',     category:'Workshop', description:'Grid & Flexbox',         reviews:[] },
    { id: uid(), title:'Secure Frontend Basics', category:'Seminar',  description:'XSS & sanitization',     reviews:[] },
  ]
}
function seed(){
  const users = LS.get(USERS_KEY, [])
  if (!users.some(u => u.email === 'admin@demo.local')){
    users.push({ id: uid(), displayName:'Administrator', email:'admin@demo.local', role:'admin' })
    LS.set(USERS_KEY, users)
  }
  const existing = LS.get(ITEMS_KEY, null)
  if (!Array.isArray(existing) || existing.length === 0){
    LS.set(ITEMS_KEY, defaultItems())
  }
}
seed()

// —— Global state ——
const state = reactive({
  users:   LS.get(USERS_KEY, []),
  session: LS.get(SESSION_KEY, null),
  items:   LS.get(ITEMS_KEY, []),
})

const isAdmin = computed(() => !!(state.session && state.session.role === 'admin'))

function saveAll(){
  LS.set(USERS_KEY, state.users)
  LS.set(SESSION_KEY, state.session)
  LS.set(ITEMS_KEY, state.items)
}

function setSession(sess){ state.session = sess; saveAll() }
function clearSession(){ state.session = null; saveAll() }
function logout(){ clearSession() }

// （Catalog/Reviews 用得到的基础接口；细节你已有）
function resetItems(){ state.items = defaultItems(); saveAll() }
async function loadExternalData(){ /* 保持空实现，避免白屏 */ }

export function useStore(){
  return {
    state,
    isAdmin,
    setSession,
    clearSession,
    logout,
    resetItems,
    loadExternalData,
  }
}
