<template>
    <div class="card">
      <div class="tabs">
        <button :class="{active: tab==='login'}" @click="tab='login'">Login</button>
        <button :class="{active: tab==='register'}" @click="tab='register'">Register</button>
      </div>
  
      <!-- LOGIN -->
      <form v-if="tab==='login'" class="grid" @submit.prevent="onLogin" novalidate autocomplete="off">
        <label>Email
          <input class="input" type="email" v-model.trim="loginForm.email" required placeholder="you@example.com" />
        </label>
        <label>Password
          <input class="input" type="password" v-model="loginForm.password" required minlength="8" />
        </label>
        <div class="inline">
          <button class="btn primary" :disabled="store.isLocked">Login</button>
          <span v-if="store.isLocked" class="error">Locked. Try again later.</span>
        </div>
        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      </form>
  
      <!-- REGISTER -->
      <form v-else class="grid" @submit.prevent="onRegister" novalidate autocomplete="off">
        <label>Display name
          <input class="input" type="text" v-model.trim="regForm.displayName" required minlength="2" maxlength="30" />
        </label>
        <label>Email
          <input class="input" type="email" v-model.trim="regForm.email" required placeholder="jane@example.com" />
        </label>
        <label>Password
          <input class="input" type="password" v-model="regForm.password" required minlength="8" />
        </label>
        <label>Confirm password
          <input class="input" type="password" v-model="regForm.confirm" required minlength="8" />
        </label>
  
        <ul class="note">
          <li :class="check.len ? 'ok':'error'">≥ 8 chars</li>
          <li :class="check.upper ? 'ok':'error'">Uppercase</li>
          <li :class="check.lower ? 'ok':'error'">Lowercase</li>
          <li :class="check.digit ? 'ok':'error'">Digit</li>
          <li :class="match ? 'ok':'error'">Passwords match</li>
        </ul>
  
        <div class="inline">
          <button class="btn success" :disabled="!canRegister">Create account</button>
        </div>
        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      </form>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, computed } from 'vue'
  import { useStore } from '../utils/useStore'
  
  // 不解构 login / register，避免与本地变量重名
  const store = useStore()
  
  const tab = ref('login')
  
  // 本地表单对象使用 loginForm / regForm，避免与 store.login 同名
  const loginForm = reactive({ email:'', password:'' })
  const regForm   = reactive({ displayName:'', email:'', password:'', confirm:'' })
  const errorMsg  = ref('')
  
  const check = computed(() => ({
    len: regForm.password.length >= 8,
    upper: /[A-Z]/.test(regForm.password),
    lower: /[a-z]/.test(regForm.password),
    digit: /\d/.test(regForm.password),
  }))
  const match = computed(() => regForm.password && regForm.password === regForm.confirm)
  const canRegister = computed(() =>
    check.value.len && check.value.upper && check.value.lower && check.value.digit &&
    match.value && /.+@.+\..+/.test(regForm.email) && regForm.displayName.trim().length >= 2
  )
  
  async function onRegister(){
    try{
      errorMsg.value = ''
      await store.register({
        displayName: regForm.displayName,
        email: regForm.email,
        password: regForm.password
      })
      tab.value = 'login'
      regForm.displayName = regForm.email = regForm.password = regForm.confirm = ''
    }catch(e){ errorMsg.value = e.message }
  }
  
  async function onLogin(){
    try{
      errorMsg.value = ''
      await store.login({ email: loginForm.email, password: loginForm.password })
      loginForm.email = loginForm.password = ''
    }catch(e){ errorMsg.value = e.message }
  }
  </script>
  
  <style scoped>
.card{background:var(--panel);border:1px solid #ddd;border-radius:12px;padding:16px;box-shadow:0 4px 10px rgba(0,0,0,.08)}
.grid{display:grid;gap:12px}
.input{width:100%;border:1px solid #ccc;background:#fff;color:var(--text);border-radius:8px;padding:10px 12px}
.btn{border:1px solid #ccc;background:#f0f0f0;color:var(--text);border-radius:8px;padding:10px 14px;cursor:pointer}
.btn.primary{background:var(--brand);color:#fff;border:none}
.btn.success{background:var(--accent);color:#fff;border:none}
.inline{display:flex;gap:10px;align-items:center}
.error{color:var(--danger)} .ok{color:var(--accent)}
.note{font-size:13px;color:var(--muted)}
.tabs{display:flex;gap:8px;margin-bottom:8px}
.tabs button{padding:8px 12px;border-radius:10px;border:1px solid #ccc;background:#fff;color:var(--text)}
.tabs .active{background:#f0f0f0}
</style>

  