<template>
  <form class="card" @submit.prevent="onSend" aria-labelledby="email-h1">
    <h2 id="email-h1">Send Email (via Firebase Functions)</h2>

    <div class="field">
      <label for="to">To</label>
      <input id="to" type="email" v-model.trim="to" required inputmode="email" aria-describedby="toHelp"/>
      <p id="toHelp" class="muted">e.g. user@example.com</p>
    </div>

    <div class="field">
      <label for="subject">Subject</label>
      <input id="subject" v-model.trim="subject" required />
    </div>

    <div class="field">
      <label for="message">Message</label>
      <textarea id="message" v-model="text" rows="6" required></textarea>
    </div>

    <div class="inline">
      <button type="submit" class="btn primary">Send</button>
      <span class="muted" aria-live="polite">{{ status }}</span>
    </div>

    <p v-if="error" class="err" role="alert" aria-live="assertive">{{ error }}</p>
    <details class="block"><summary>Function base URL</summary><code>{{ BASE }}</code></details>
  </form>
</template>

<script setup>
import { ref } from 'vue'

/** Firebase Functions base URL */
const REGION  = import.meta.env.VITE_FUNCTIONS_REGION || 'us-central1'
const PROJECT = import.meta.env.VITE_FIREBASE_PROJECT_ID
const BASE    = `https://${REGION}-${PROJECT}.cloudfunctions.net`

const to = ref('')
const subject = ref('Hello from Firebase Functions')
const text = ref('It works!')
const status = ref('')
const error  = ref('')

async function onSend(){
  status.value='Sending…'; error.value=''
  try{
    const r = await fetch(`${BASE}/sendMail`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ to: to.value, subject: subject.value, text: text.value })
    })
    const data = await r.json()
    if (!data.ok) throw new Error(data.error || 'Failed')
    status.value='Sent ✅'
    to.value=''; subject.value=''; text.value=''
  }catch(e){
    error.value = e.message || String(e)
    status.value = ''
  }
}
</script>

<style scoped>
.field{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
.inline{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.block{border-top:1px dashed #e5e7eb; padding-top:12px; margin-top:12px}
.err{color:#b91c1c}
</style>
