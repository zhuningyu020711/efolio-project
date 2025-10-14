<template>
  <section class="card" aria-labelledby="srv-h1">
    <h2 id="srv-h1">Serverless (Firebase Functions)</h2>

    <!-- 计算示例 /add -->
    <fieldset class="block">
      <legend>Adder API</legend>
      <div class="grid2">
        <div class="field">
          <label for="a">A</label>
          <input id="a" type="number" v-model.number="a" />
        </div>
        <div class="field">
          <label for="b">B</label>
          <input id="b" type="number" v-model.number="b" />
        </div>
      </div>
      <div class="inline">
        <button type="button" class="btn primary" @click="runAdd">Calculate</button>
        <span aria-live="polite" class="muted">{{ addStatus }}</span>
      </div>
      <p v-if="addError" class="err" role="alert" aria-live="assertive">{{ addError }}</p>
      <p v-if="sum!==null" class="pill">Result: <strong>{{ sum }}</strong></p>
    </fieldset>

    <!-- 发信示例 /sendMail -->
    <fieldset class="block">
      <legend>Send email (via Firebase)</legend>

      <div class="field">
        <label for="to">To</label>
        <input id="to" type="email" v-model.trim="to" required inputmode="email" />
      </div>
      <div class="field">
        <label for="subject">Subject</label>
        <input id="subject" v-model.trim="subject" required />
      </div>
      <div class="field">
        <label for="msg">Message</label>
        <textarea id="msg" rows="5" v-model="text" required></textarea>
      </div>

      <div class="inline">
        <button type="button" class="btn primary" @click="sendMail">Send</button>
        <span class="muted" aria-live="polite">{{ mailStatus }}</span>
      </div>
      <p v-if="mailError" class="err" role="alert" aria-live="assertive">{{ mailError }}</p>
    </fieldset>

    <!-- 基础信息 -->
    <details class="block">
      <summary>Function base URL</summary>
      <code>{{ BASE }}</code>
    </details>
  </section>
</template>

<script setup>
import { ref } from 'vue'

/** 拼接 Firebase Functions 基础 URL */
const REGION  = import.meta.env.VITE_FUNCTIONS_REGION || 'us-central1'
const PROJECT = import.meta.env.VITE_FIREBASE_PROJECT_ID
const BASE    = `https://${REGION}-${PROJECT}.cloudfunctions.net`

// /add
const a = ref(2)
const b = ref(5)
const sum = ref(null)
const addStatus = ref('')
const addError = ref('')

async function runAdd(){
  addStatus.value = 'Calling…'
  addError.value = ''
  sum.value = null
  try{
    const url = `${BASE}/add?a=${encodeURIComponent(a.value)}&b=${encodeURIComponent(b.value)}`
    const r = await fetch(url)
    const data = await r.json()
    if (!data.ok) throw new Error(data.error || 'Failed')
    sum.value = data.sum
    addStatus.value = 'Done ✅'
  }catch(e){
    addError.value = e.message || String(e)
    addStatus.value = ''
  }
}

// /sendMail
const to = ref('')
const subject = ref('Hello from Firebase Functions')
const text = ref('It works!')
const mailStatus = ref('')
const mailError = ref('')

async function sendMail(){
  mailStatus.value = 'Sending…'
  mailError.value = ''
  try{
    const r = await fetch(`${BASE}/sendMail`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ to: to.value, subject: subject.value, text: text.value })
    })
    const data = await r.json()
    if (!data.ok) throw new Error(data.error || 'Failed')
    mailStatus.value = 'Sent ✅'
  }catch(e){
    mailError.value = e.message || String(e)
    mailStatus.value = ''
  }
}
</script>

<style scoped>
.block{border-top:1px dashed #e5e7eb; padding-top:12px; margin-top:12px}
.field{display:flex; flex-direction:column; gap:6px; margin-bottom:10px}
.inline{display:flex; gap:8px; align-items:center; flex-wrap:wrap}
.grid2{display:grid; grid-template-columns:1fr 1fr; gap:10px}
.pill{display:inline-flex; gap:6px; align-items:center; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:999px; padding:4px 8px}
.err{color:#b91c1c}
</style>
