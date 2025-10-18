<template>
  <section class="card email" aria-labelledby="email-h1">
    <h1 id="email-h1">Send Email</h1>

    <form class="form" @submit.prevent="onSubmit">
      <div class="row">
        <label class="lbl" for="to">To (multiple allowed)</label>
        <textarea
          id="to"
          class="input"
          rows="2"
          v-model.trim="form.to"
          placeholder="alice@example.com, bob@example.com&#10;"
        ></textarea>
        <p class="mini muted">Use comma / semicolon / space / newline to separate multiple recipients.</p>
      </div>

      <div class="row">
        <label class="lbl" for="cc">CC (optional, multiple allowed)</label>
        <input
          id="cc"
          class="input"
          v-model.trim="form.cc"
          placeholder="team@example.com; manager@example.com"
        />
      </div>

      <div class="row">
        <label class="lbl" for="subject">Subject</label>
        <input id="subject" class="input" v-model.trim="form.subject" placeholder="Subject" />
      </div>

      <div class="row">
        <label class="lbl" for="msg">Message</label>
        <textarea id="msg" class="input" rows="6" v-model.trim="form.message" placeholder="Type your message here..."></textarea>
      </div>

      <div class="row-inline">
        <button class="btn primary" type="submit" :disabled="sending">
          {{ sending ? 'Sending…' : 'Send' }}
        </button>
        <button class="btn" type="button" @click="useSample">Use sample recipients</button>
        <button class="btn" type="button" @click="clearForm">Clear</button>
        <span class="mini muted">Logged in as: <strong>{{ sessionEmail || 'Guest' }}</strong></span>
      </div>

      <p class="ok" v-if="ok">{{ ok }}</p>
      <p class="err" v-if="err">{{ err }}</p>

      <div v-if="report.total>0" class="panel">
        <h3>Delivery Report</h3>
        <p class="mini">
          Total: <strong>{{ report.total }}</strong> —
          Success: <strong style="color:#16a34a">{{ report.success }}</strong> —
          Fail: <strong style="color:#b91c1c">{{ report.fail }}</strong>
        </p>
        <ul class="list">
          <li v-for="(r,i) in report.items" :key="i">
            <code>{{ r.to }}</code> — <span :class="r.ok ? 'ok' : 'err'">{{ r.ok ? 'OK' : 'FAILED' }}</span>
            <span v-if="!r.ok" class="muted"> ({{ r.msg }})</span>
          </li>
        </ul>
      </div>
    </form>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import emailjs from 'emailjs-com'
import { useStore } from '../utils/useStore'

const store = useStore()
const sessionEmail = computed(() => store.state?.session?.email || '')

const form = ref({
  to: localStorage.getItem('email_draft_to') || '',
  cc: localStorage.getItem('email_draft_cc') || '',
  subject: localStorage.getItem('email_draft_subject') || '',
  message: localStorage.getItem('email_draft_message') || '',
})
watch(form, v => {
  localStorage.setItem('email_draft_to', v.to || '')
  localStorage.setItem('email_draft_cc', v.cc || '')
  localStorage.setItem('email_draft_subject', v.subject || '')
  localStorage.setItem('email_draft_message', v.message || '')
}, { deep: true })

const sending = ref(false)
const ok = ref('')
const err = ref('')

const report = ref({ total: 0, success: 0, fail: 0, items: [] })

function useSample(){
  form.value.to = 'alice@example.com; bob@example.com, charlie@example.com'
  form.value.subject = 'Campus Event Update'
  form.value.message = `Hello everyone,

This is a friendly reminder about our upcoming campus events.

Best,
Student Union`
}

function clearForm(){
  form.value = { to: '', cc: '', subject: '', message: '' }
  ok.value = ''; err.value = ''
  report.value = { total:0, success:0, fail:0, items:[] }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseEmails(raw){
  return (raw || '')
    .split(/[\s,;]+/)         // 逗号 / 分号 / 空格 / 换行
    .map(s => s.trim())
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i) // 去重
}

function validate(){
  const toList = parseEmails(form.value.to)
  const ccList = parseEmails(form.value.cc)
  const all = [...toList, ...ccList]
  const bad = all.filter(e => !EMAIL_RE.test(e))
  if (toList.length === 0) throw new Error('Please enter at least one valid recipient in "To".')
  if (bad.length > 0) throw new Error(`Invalid emails: ${bad.join(', ')}`)
  if (!form.value.subject?.trim()) throw new Error('Please enter subject.')
  if (!form.value.message?.trim()) throw new Error('Please enter message.')
  return { toList, ccList }
}

async function sendOne(to, ccList){
  const serviceId  = import.meta.env.VITE_EMAILJS_SERVICE_ID
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
  const publicKey  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

  if (!serviceId || !templateId || !publicKey){
    throw new Error('EmailJS env missing: VITE_EMAILJS_SERVICE_ID / TEMPLATE_ID / PUBLIC_KEY')
  }

  const params = {
    to_email: to,                // 你的 EmailJS 模板里使用 {{to_email}}
    cc: ccList.join(', '),       // 可选：模板里 {{cc}}
    subject: form.value.subject,
    message: form.value.message,
    reply_to: sessionEmail.value || 'noreply@example.com',
    from_name: (store.state?.session?.displayName || 'Campus App'),
  }

  // 逐个发送，保证每个收件人都收得到
  return emailjs.send(serviceId, templateId, params, publicKey)
}

async function onSubmit(){
  ok.value = ''; err.value = ''
  report.value = { total:0, success:0, fail:0, items:[] }

  let toList, ccList
  try{
    ({ toList, ccList } = validate())
  }catch(e){
    err.value = e.message || 'Invalid form'
    return
  }

  sending.value = true
  try{
    const results = await Promise.allSettled(toList.map(to => sendOne(to, ccList)))
    let success = 0, fail = 0
    const items = results.map((r, idx) => {
      const to = toList[idx]
      if (r.status === 'fulfilled'){ success++; return { to, ok: true, msg: 'sent' } }
      fail++; return { to, ok: false, msg: r.reason?.text || r.reason?.message || 'error' }
    })
    report.value = { total: toList.length, success, fail, items }
    ok.value = `Done: ${success} sent, ${fail} failed.`
  }catch(e){
    err.value = e.message || 'Send failed'
  }finally{
    sending.value = false
  }
}
</script>

<style scoped>
.email{display:flex;flex-direction:column;gap:12px}
.form{display:flex;flex-direction:column;gap:10px}
.row{display:flex;flex-direction:column;gap:6px}
.row-inline{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.lbl{font-weight:600}
.input{border:1px solid #d1d5db;border-radius:8px;padding:8px;min-height:36px}
.btn{border:1px solid #475569;background:#f8fafc;color:#111827;border-radius:8px;padding:8px 12px;cursor:pointer}
.btn.primary{background:#1d4ed8;color:#fff;border:none}
.panel{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px}
.list{list-style:none;margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px}
.ok{color:#16a34a}
.err{color:#b91c1c}
.muted{color:#6b7280}
.mini{font-size:12px}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px}
</style>
