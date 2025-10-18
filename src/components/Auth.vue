<template>
  <div class="auth-wrap">
    <!-- 登录态条 -->
    <div v-if="isLoggedIn" class="inline" style="margin-bottom:12px">
      <span class="muted">Logged in as {{ userEmail }}</span>
      <button type="button" class="btn" @click="onLogout">Log out</button>
    </div>

    <!-- 表单卡片 -->
    <form class="card" @submit.prevent="onSubmit" aria-labelledby="auth-title">
      <h2 id="auth-title">{{ mode==='login' ? 'Login' : 'Register' }}</h2>

      <div class="field">
        <label for="email">Email</label>
        <input id="email" v-model.trim="email" type="email" required
               inputmode="email" autocomplete="email"
               aria-describedby="emailHelp" />
        <p id="emailHelp" class="muted">Use your email address.</p>
      </div>

      <div class="field">
        <label for="password">Password</label>
        <input id="password" v-model="password" type="password" required
               minlength="6" autocomplete="current-password" />
      </div>

      <div class="inline">
        <button type="submit" class="btn primary">
          {{ mode==='login' ? 'Login' : 'Create account' }}
        </button>
        <button type="button" class="btn" @click="toggleMode" aria-live="polite">
          {{ mode==='login' ? 'Need an account? Register' : 'Have an account? Login' }}
        </button>
      </div>

      <div class="or">
        <span class="muted">or</span>
      </div>

      <button type="button" class="btn" @click="onGoogleLogin">
        Continue with Google
      </button>

      <p v-if="msg" class="muted" style="margin-top:8px">{{ msg }}</p>
      <p v-if="err" class="err" role="alert" style="margin-top:8px">{{ err }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from '../utils/useStore'

// Firebase Auth (基于已初始化的默认 app)
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth'

const store = useStore()
const auth = getAuth()

// ====== local state ======
const email = ref('')
const password = ref('')
const mode = ref('login')
const msg = ref('')
const err = ref('')

// ====== derived state ======
const session    = computed(() => store.state?.session ?? null)
const isLoggedIn = computed(() => !!(session.value && (session.value.email || session.value.uid || session.value.id)))
const userEmail  = computed(() => session.value?.email || 'account')

// ====== helpers ======
function getRoleByEmail(email) {
  const e = (email || '').toLowerCase()
  // 和 useStore.js 的 DEV_ADMIN_EMAIL 对齐：'admin@demo.local'
  return e === 'admin@demo.local' ? 'admin' : 'user'
}

function toSessionPayload(user) {
  // 将 Firebase User 映射到你项目的 session 结构
  return {
    id: user.uid,
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
    role: getRoleByEmail(user.email),
    lastLogin: Date.now(),
  }
}

function toggleMode(){
  mode.value = mode.value === 'login' ? 'register' : 'login'
  msg.value = ''
  err.value = ''
}

async function onSubmit(){
  err.value = ''
  msg.value = ''

  const e = email.value.trim()
  const p = String(password.value || '')
  if (!e || !p){ err.value = 'Please enter email & password'; return }
  if (p.length < 6){ err.value = 'Password should be at least 6 characters'; return }

  try{
    if (mode.value === 'login'){
      const cred = await signInWithEmailAndPassword(auth, e, p)
      const user = cred.user
      const sess = toSessionPayload(user)
      store.setSession?.(sess)
      msg.value = 'Logged in'
    } else {
      const cred = await createUserWithEmailAndPassword(auth, e, p)
      const user = cred.user
      // 给新用户一个默认的 displayName（邮箱前缀）
      if (!user.displayName && user.email){
        await updateProfile(user, { displayName: user.email.split('@')[0] })
      }
      const freshUser = auth.currentUser || user
      const sess = toSessionPayload(freshUser)
      store.setSession?.(sess)
      msg.value = 'Account created & logged in'
    }
  }catch(e){
    err.value = e?.message || String(e)
  }
}

async function onGoogleLogin(){
  err.value = ''
  msg.value = ''
  try{
    const provider = new GoogleAuthProvider()
    const cred = await signInWithPopup(auth, provider)
    const user = cred.user
    const sess = toSessionPayload(user)
    store.setSession?.(sess)
    msg.value = 'Logged in with Google'
  }catch(e){
    err.value = e?.message || String(e)
  }
}

async function onLogout(){
  err.value = ''
  msg.value = ''
  try{
    await signOut(auth)
    store.logout?.()
    msg.value = 'Logged out'
  }catch(e){
    err.value = e?.message || String(e)
  }
}

// 同步 Firebase 登录态到本地 store（刷新后仍能还原）
onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    if (user){
      const sess = toSessionPayload(user)
      store.setSession?.(sess)
    } else {
      store.clearSession?.()
    }
  })
})
</script>

<style scoped>
.auth-wrap{display:flex;flex-direction:column;gap:12px}
.field{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
.err{color:#b91c1c}
.inline{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.btn{border:1px solid #cbd5e1;background:#f3f4f6;border-radius:8px;padding:8px 12px;cursor:pointer}
.btn.primary{background:#2563eb;color:#fff;border-color:#2563eb}
.muted{color:#6b7280}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px}
.or{display:flex;justify-content:center;margin:10px 0}
</style>
