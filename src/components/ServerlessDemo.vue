<template>
  <section class="card">
    <h2>Serverless (Firebase Functions)</h2>

    <!-- Adder -->
    <fieldset class="panel">
      <legend>Adder API</legend>
      <div class="grid2">
        <div>
          <label class="lbl" for="a">A</label>
          <input id="a" class="input" type="number" v-model.number="a" />
        </div>
        <div>
          <label class="lbl" for="b">B</label>
          <input id="b" class="input" type="number" v-model.number="b" />
        </div>
      </div>
      <div class="row">
        <button class="btn" @click="calcAdd">Calculate</button>
        <span v-if="addResult!==null" class="pill">Result: {{ addResult }}</span>
        <span v-if="addErr" class="err">Load failed</span>
      </div>
    </fieldset>

    <!-- Send email -->
    <fieldset class="panel">
      <legend>Send email (via Firebase)</legend>
      <label class="lbl" for="to">To</label>
      <input id="to" class="input" v-model.trim="to" placeholder="recipient@example.com" />

      <label class="lbl" for="sub">Subject</label>
      <input id="sub" class="input" v-model.trim="subject" placeholder="Hello from Firebase Functions" />

      <label class="lbl" for="msg">Message</label>
      <textarea id="msg" class="input" rows="5" v-model="message" placeholder="It works!"></textarea>

      <div class="row">
        <button class="btn" @click="sendMail">Send</button>
        <span v-if="mailOk" class="pill success">Sent</span>
        <span v-if="mailErr" class="err">Load failed</span>
      </div>
    </fieldset>

    <!-- Base URL -->
    <details class="panel">
      <summary>Function base URL</summary>
      <code>{{ BASE }}</code>
    </details>

    <p class="sr-only" aria-live="polite">{{ live }}</p>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const REGION  = import.meta.env.VITE_FUNCTIONS_REGION || 'us-central1'
const PROJECT = import.meta.env.VITE_FIREBASE_PROJECT_ID || ''
const LOCAL   = import.meta.env.VITE_FUNCTIONS_BASE || ''
const BASE    = LOCAL || `https://${REGION}-${PROJECT}.cloudfunctions.net`

const a = ref(2)
const b = ref(5)
const addResult = ref(null)
const addErr = ref(false)

const to = ref('')
const subject = ref('Hello from Firebase Functions')
const message = ref('It works!')
const mailOk = ref(false)
const mailErr = ref(false)

const live = ref('ready')

async function calcAdd(){
  addErr.value = false; addResult.value = null
  try{
    const url = `${BASE}/add?a=${encodeURIComponent(a.value)}&b=${encodeURIComponent(b.value)}`
    const r = await fetch(url, { method:'GET' })
    const j = await r.json()
    if (!j.ok) throw new Error(j.error || 'add failed')
    addResult.value = j.result
    live.value = 'Add success'
  }catch(e){
    addErr.value = true
    live.value = 'Add failed'
  }
}

async function sendMail(){
  mailErr.value = false; mailOk.value = false
  try{
    const url = `${BASE}/sendgrid-proxy`
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: to.value, subject: subject.value, message: message.value })
    })
    const j = await r.json()
    if (!j.ok) throw new Error(j.error || 'mail failed')
    mailOk.value = true
    live.value = 'Mail sent'
  }catch(e){
    mailErr.value = true
    live.value = 'Mail failed'
  }
}
</script>

<style scoped>
.panel{ border:1px dashed #e5e7eb; border-radius:10px; padding:12px; margin:12px 0 }
.grid2{ display:grid; grid-template-columns:1fr 1fr; gap:10px }
@media (max-width: 720px){ .grid2{ grid-template-columns:1fr } }
.row{ display:flex; gap:10px; align-items:center; margin-top:8px }
.lbl{ font-weight:600; margin-top:8px; display:block }
.input{ border:1px solid #d1d5db; border-radius:8px; padding:8px; width:100% }
.btn{ border:1px solid #475569; background:#f8fafc; color:#111827; border-radius:8px; padding:8px 12px; cursor:pointer }
.pill{ display:inline-flex; gap:6px; align-items:center; padding:4px 8px; border-radius:999px; background:#f2f2f2; border:1px solid #ccc; font-size:12px }
.pill.success{ background:#dcfce7; border-color:#16a34a }
.err{ color:#b91c1c; margin-left:6px }
.sr-only{ position:absolute; left:-9999px; width:1px; height:1px; overflow:hidden }
code{ display:inline-block; background:#f8fafc; border:1px solid #e5e7eb; border-radius:8px; padding:6px 8px; font-size:12px }
</style>
