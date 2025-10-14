<template>
  <div v-if="isLoggedIn" class="inline" style="margin-bottom:12px">
    <span class="muted">Logged in as {{ userEmail }}</span>
    <button type="button" class="btn" @click="onLogout">Log out</button>
  </div>

  <form class="card" @submit.prevent="onSubmit" aria-labelledby="auth-title">
    <h2 id="auth-title">{{ mode==='login' ? 'Login' : 'Register' }}</h2>

    <div class="field">
      <label for="email">Email</label>
      <input id="email" v-model.trim="email" type="email" required
             inputmode="email" autocomplete="email"
             aria-describedby="emailHelp" />
      <p id="emailHelp" class="muted">Use your school email address.</p>
    </div>

    <div class="field">
      <label for="password">Password</label>
      <input id="password" v-model="password" type="password" required
             minlength="6" autocomplete="current-password"
             aria-describedby="pwdHelp" />
      <p id="pwdHelp" class="muted">Minimum 6 characters.</p>
    </div>

    <div class="inline">
      <button type="submit" class="btn primary">
        {{ mode==='login' ? 'Login' : 'Create account' }}
      </button>
      <button type="button" class="btn" @click="toggleMode" :aria-pressed="mode==='register'">
        {{ mode==='login' ? 'Need an account? Register' : 'Have an account? Login' }}
      </button>
      <button v-if="isLoggedIn" type="button" class="btn" @click="onLogout">Log out</button>
    </div>

    <p v-if="msg" class="muted" aria-live="polite">{{ msg }}</p>
    <p v-if="err" class="err" role="alert" aria-live="assertive">{{ err }}</p>
  </form>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from '../utils/useStore'

const store = useStore()

const email = ref('')
const password = ref('')
const mode = ref('login')
const msg = ref('')
const err = ref('')

// 会话使用你项目里的 state.session
const session    = computed(() => store.state?.session ?? null)
const isLoggedIn = computed(() => !!(session.value && (session.value.email || session.value.id || session.value.uid)))
const userEmail  = computed(() => session.value?.email || 'account')

const users = computed(() => store.state?.users || [])

function makeId(){
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function toggleMode(){
  mode.value = mode.value === 'login' ? 'register' : 'login'
  err.value = ''; msg.value = ''
}

async function onSubmit(){
  err.value = ''; msg.value = ''
  const e = email.value.trim().toLowerCase()
  const p = String(password.value || '')

  if (!e || !p){ err.value = 'Please enter email & password'; return }
  if (p.length < 6){ err.value = 'Password should be at least 6 characters'; return }

  try{
    if (mode.value === 'login'){
      const u = users.value.find(u => (u.email || '').toLowerCase() === e)
      if (!u) throw new Error('User not found')
      if (u.password !== p) throw new Error('Incorrect password')

      // 登录：只在这里设置 session
      store.setSession?.({
        id: u.id, email: u.email,
        displayName: u.displayName || u.email.split('@')[0],
        role: u.role || 'user',
      })
      msg.value = 'Logged in.'
    }else{
      // 注册：只写入用户，不自动登录
      if (users.value.some(u => (u.email || '').toLowerCase() === e)){
        throw new Error('Email already registered')
      }
      const u = {
        id: makeId(),
        email: e,
        password: p,                 // 本地 demo，明文保存；真实项目不要这样
        displayName: e.split('@')[0],
        role: 'user',
        createdAt: Date.now(),
      }
      store.state.users.push(u)
      // 不自动登录
      msg.value = 'Account created. Please login.'
      mode.value = 'login'
      password.value = ''
    }
  }catch(e){
    err.value = e?.message || String(e)
  }
}

async function onLogout(){
  err.value = ''; msg.value = ''
  try{
    if (store.logout) await store.logout()
    else if (store.clearSession) store.clearSession()
    msg.value = 'Logged out.'
  }catch(e){
    err.value = e?.message || String(e)
  }
}
</script>

<style scoped>
.field{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
.err{color:#b91c1c}
.inline{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.btn{border:1px solid #cbd5e1;background:#f3f4f6;border-radius:8px;padding:8px 12px;cursor:pointer}
.btn.primary{background:#2563eb;color:#fff;border-color:#2563eb}
.muted{color:#6b7280}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px}
</style>
