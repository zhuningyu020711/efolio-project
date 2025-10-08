<template>
  <div class="card" style="max-width:720px;margin:0 auto">
    <div class="inline" style="margin-bottom:10px">
      <button class="btn" :class="{primary: tab==='login'}" @click="tab='login'">Login</button>
      <button class="btn" :class="{primary: tab==='register'}" @click="tab='register'">Register</button>
    </div>

    <!-- LOGIN -->
    <form v-if="tab==='login'" class="grid" @submit.prevent="onLogin">
      <label>Email
        <input class="input" type="email" v-model.trim="login.email" required />
      </label>
      <label>Password
        <input class="input" type="password" v-model="login.password" required minlength="6" />
      </label>
      <div class="inline">
        <button class="btn primary">Login</button>
        <span class="error" v-if="err">{{ err }}</span>
      </div>
    </form>

    <!-- REGISTER -->
    <form v-else class="grid" @submit.prevent="onRegister">
      <label>Display name
        <input class="input" v-model.trim="reg.displayName" required minlength="2" />
      </label>
      <label>Email
        <input class="input" type="email" v-model.trim="reg.email" required />
      </label>
      <label>Password (≥6)
        <input class="input" type="password" v-model="reg.password" required minlength="6" />
      </label>
      <div class="inline">
        <button class="btn success">Create account</button>
        <span class="error" v-if="err">{{ err }}</span>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { fbLogin, fbLogout, fbRegister } from '../services/fbauth'
import { useStore } from '../utils/useStore'

const store = useStore()
const tab = ref('login')
const err = ref('')

const login = ref({ email:'', password:'' })
const reg   = ref({ displayName:'', email:'', password:'' })

async function onLogin(){
  err.value = ''
  try{
    await fbLogin(login.value)
    // 登录成功后可选：跳去 Dashboard
    // 这里不需要手动写 session，initAuthBridge 会自动同步
  }catch(e){
    err.value = e?.message || 'Login failed'
  }
}

async function onRegister(){
  err.value = ''
  try{
    await fbRegister(reg.value)
    // 注册完成后会自动登录（Firebase state change → store）
  }catch(e){
    err.value = e?.message || 'Register failed'
  }
}

// 可选：供外部调用
async function onLogout(){
  await fbLogout()
}
</script>

<style scoped>
.grid{display:grid;gap:12px}
.inline{display:flex;gap:10px;align-items:center}
.input{width:100%;border:1px solid #ccc;background:#fff;color:var(--text);border-radius:8px;padding:10px 12px}
.btn{border:1px solid #ccc;background:#f0f0f0;color:var(--text);border-radius:8px;padding:8px 14px;cursor:pointer}
.btn.primary{background:var(--brand);color:#fff;border:none}
.btn.success{background:var(--accent);color:#fff;border:none}
.error{color:var(--danger)}
</style>
