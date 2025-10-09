<template>
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
      <button type="submit" class="btn primary">{{ mode==='login' ? 'Login' : 'Create account' }}</button>
      <button type="button" class="btn" @click="toggleMode" :aria-pressed="mode==='register'">
        {{ mode==='login' ? 'Need an account? Register' : 'Have an account? Login' }}
      </button>
    </div>

    <p v-if="msg" class="muted" aria-live="polite">{{ msg }}</p>
    <p v-if="err" class="err" role="alert" aria-live="assertive">{{ err }}</p>
  </form>
</template>

<script setup>
import { ref } from 'vue'
import { useStore } from '../utils/useStore'
const store = useStore()

const email = ref('')
const password = ref('')
const mode = ref('login')
const msg = ref('')
const err = ref('')

function toggleMode(){
  mode.value = mode.value === 'login' ? 'register' : 'login'
  err.value = ''; msg.value = ''
}

async function onSubmit(){
  err.value = ''; msg.value = ''
  try{
    if (mode.value === 'login'){
      await store.login(email.value, password.value)
      msg.value = 'Logged in.'
    }else{
      await store.register(email.value, password.value)
      msg.value = 'Account created.'
    }
  }catch(e){ err.value = e?.message || String(e) }
}
</script>

<style scoped>
.field{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
.err{color:#b91c1c}
</style>
