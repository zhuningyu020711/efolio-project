<template>
  <section class="mail-wrap">
    <h2>Send Event Reminder</h2>

    <div class="grid">
      <label>
        <span class="lbl">Event name</span>
        <input v-model="eventName" placeholder="e.g. Welcome BBQ" required />
      </label>

      <label>
        <span class="lbl">Date & time</span>
        <input v-model="eventDate" placeholder="e.g. 2025-10-05 17:30" />
      </label>

      <label>
        <span class="lbl">Location</span>
        <input v-model="eventLocation" placeholder="e.g. Union Lawn" />
      </label>

      <label class="full">
        <span class="lbl">Recipients (comma separated emails)</span>
        <textarea v-model="recipients" rows="2" placeholder="alice@uni.edu, bob@uni.edu"></textarea>
      </label>

      <label class="full">
        <span class="lbl">Additional message (optional)</span>
        <textarea v-model="message" rows="4" placeholder="Any extra details you want to include..."></textarea>
      </label>

      <label class="full">
        <span class="lbl">Attachment (optional, e.g., poster.pdf)</span>
        <input type="file" @change="onFile" />
      </label>
    </div>

    <div class="row">
      <button class="btn primary" :disabled="sending" @click="send">
        {{ sending ? 'Sending...' : 'Send Reminder' }}
      </button>
      <span class="status" aria-live="polite">{{ status }}</span>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const REGION = import.meta.env.VITE_FUNCTIONS_REGION || 'us-central1'
const PROJECT = import.meta.env.VITE_FIREBASE_PROJECT_ID
// 你的云函数名字：看 functions 目录里 sendgrid-proxy 的导出名称
const ENDPOINT = `https://${REGION}-${PROJECT}.cloudfunctions.net/sendgrid-proxy`

const eventName = ref('')
const eventDate = ref('')
const eventLocation = ref('')
const recipients = ref('')
const message = ref('')

const sending = ref(false)
const status = ref('')
const attachment = ref(null)

function onFile(e) {
  const f = e.target.files?.[0]
  if (!f) { attachment.value = null; return }
  const reader = new FileReader()
  reader.onload = () => {
    const base64 = (reader.result || '').toString().split(',').pop() || ''
    attachment.value = { filename: f.name, type: f.type || 'application/octet-stream', contentBase64: base64 }
  }
  reader.readAsDataURL(f)
}

function buildHtml() {
  const lines = [
    `Dear Participant,`,
    ``,
    `This is a reminder for your upcoming event:`,
    `<strong>${eventName.value || 'Event'}</strong>`,
  ]
  if (eventDate.value) lines.push(`📅 <strong>Date:</strong> ${eventDate.value}`)
  if (eventLocation.value) lines.push(`📍 <strong>Location:</strong> ${eventLocation.value}`)
  if (message.value) { lines.push(``, message.value) }
  lines.push(``, `See you there!`)
  return lines.join('<br>')
}

function parseRecipients() {
  return recipients.value.split(',').map(s => s.trim()).filter(Boolean)
}

async function send() {
  const toList = parseRecipients()
  if (!toList.length) { status.value = '❌ Please enter at least one recipient'; return }
  if (!eventName.value) { status.value = '❌ Please fill event name'; return }

  sending.value = true
  status.value = ''
  try {
    const payload = {
      to: toList.join(','),
      subject: `Upcoming Event Reminder - ${eventName.value}`,
      html: buildHtml(),
    }
    if (attachment.value) {
      payload.attachments = [{
        filename: attachment.value.filename,
        type: attachment.value.type,
        content: attachment.value.contentBase64,
        disposition: 'attachment'
      }]
    }

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `HTTP ${res.status}`)
    }

    status.value = '✅ Email sent successfully'
  } catch (e) {
    console.error(e)
    status.value = '❌ Failed to send email'
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.mail-wrap{max-width:820px;margin:auto;padding:16px;background:#fff;border:1px solid #e5e7eb;border-radius:12px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.full{grid-column:1/-1}
.lbl{display:block;margin-bottom:6px;font-weight:600}
input, textarea{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px}
.row{display:flex;gap:12px;align-items:center;margin-top:12px}
.btn{padding:10px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#f3f4f6;cursor:pointer}
.btn.primary{background:#2563eb;color:#fff;border-color:#2563eb}
.status{min-height:20px}
@media (max-width: 840px){ .grid{grid-template-columns:1fr} }
</style>
