<template>
  <section class="card" aria-labelledby="email-h1">
    <h2 id="email-h1">Send Event Reminder (EmailJS)</h2>

    <!-- 成功/失败无障碍提示 -->
    <p class="sr-only" aria-live="polite">{{ live }}</p>

    <!-- 发送表单（sendForm 才支持附件） -->
    <form ref="formRef" class="form" @submit.prevent="onSubmit" enctype="multipart/form-data" aria-describedby="helper">
      <div class="grid2">
        <div>
          <label class="lbl" for="event">Event name</label>
          <input id="event" class="input" name="event_name" v-model.trim="eventName" placeholder="Welcome Party" required />
        </div>
        <div>
          <label class="lbl" for="dt">Date & time</label>
          <input id="dt" class="input" name="date_time" v-model.trim="dateTime" placeholder="2025-10-05 19:00" />
        </div>
      </div>

      <label class="lbl" for="loc">Location</label>
      <input id="loc" class="input" name="location" v-model.trim="location" placeholder="Campus Hall A" />

      <div class="grid2">
        <div>
          <label class="lbl" for="to">Recipient email</label>
          <input id="to" class="input" type="email" name="to_email" v-model.trim="toEmail" placeholder="someone@example.com" required />
        </div>
        <div>
          <label class="lbl" for="sub">Subject</label>
          <input id="sub" class="input" name="subject" v-model.trim="subject" :placeholder="`[Reminder] ${eventName || 'Event'}`" />
        </div>
      </div>

      <label class="lbl" for="msg">Message</label>
      <textarea id="msg" class="input" name="message" rows="6"
                :placeholder="defaultMessagePlaceholder"
                v-model="message"></textarea>

      <div class="row">
        <div class="file">
          <label class="lbl" for="file">Attachment (optional)</label>
          <!-- EmailJS sendForm 支持的字段名必须叫 files / files[] -->
          <input id="file" class="input" type="file" name="files" />
        </div>
        <div class="hint" id="helper">
          You can leave subject/message blank to auto-generate them from event info.
        </div>
      </div>

      <div class="actions">
        <button type="submit" class="btn primary" :disabled="sending" aria-label="Send reminder">
          {{ sending ? 'Sending…' : 'Send Reminder' }}
        </button>
        <button type="button" class="btn" @click="resetForm" :disabled="sending" aria-label="Reset form">
          Reset
        </button>

        <span v-if="ok" class="pill success" role="status">✓ Sent</span>
        <span v-if="err" class="pill danger" role="alert">✗ Failed to send</span>
      </div>

      <details class="panel">
        <summary>Debug</summary>
        <div class="muted small">
          SERVICE_ID: <code>{{ SERVICE_ID || '(missing)' }}</code><br />
          TEMPLATE_ID: <code>{{ TEMPLATE_ID || '(missing)' }}</code><br />
          PUBLIC_KEY: <code>{{ PUBLIC_KEY ? '***' : '(missing)' }}</code>
        </div>
      </details>
    </form>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import emailjs from '@emailjs/browser'

// 从环境变量读取 EmailJS 配置
const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

// 表单引用（sendForm 必须绑定 form 元素）
const formRef   = ref(null)

// 表单数据
const eventName = ref('Welcome Party')
const dateTime  = ref('')
const location  = ref('')
const toEmail   = ref('')
const subject   = ref('')
const message   = ref('')

// 状态
const sending = ref(false)
const ok = ref(false)
const err = ref(false)
const live = ref('ready')

// 默认消息（当未手填时，会自动拼一份）
const defaultMessagePlaceholder = computed(() => {
  return [
    `Event: ${eventName.value || '-'}`,
    `Date & time: ${dateTime.value || '-'}`,
    `Location: ${location.value || '-'}`,
    '',
    '(You can add more details here.)'
  ].join('\n')
})

// 发送
async function onSubmit(){
  ok.value = err.value = false
  live.value = 'Sending…'
  sending.value = true

  try {
    if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
      throw new Error('Missing EmailJS env: VITE_EMAILJS_SERVICE_ID / VITE_EMAILJS_TEMPLATE_ID / VITE_EMAILJS_PUBLIC_KEY')
    }

    // 如果主题/正文为空，自动生成一份不改动表单值
    if (!subject.value) {
      const sub = `[Reminder] ${eventName.value || 'Event'}`
      // 动态临时设置 input[name=subject] 的值，保证被 sendForm 发送
      setHiddenValue('subject', sub)
    }
    if (!message.value) {
      setHiddenValue('message', defaultMessagePlaceholder.value)
    }

    const res = await emailjs.sendForm(
      SERVICE_ID,
      TEMPLATE_ID,
      formRef.value,
      { publicKey: PUBLIC_KEY }
    )
    if (res?.status === 200) {
      ok.value = true
      live.value = 'Mail sent'
    } else {
      throw new Error('EmailJS returned non-200')
    }
  } catch (e) {
    console.error(e)
    err.value = true
    live.value = 'Mail failed'
  } finally {
    sending.value = false
  }
}

// 辅助：为 sendForm 注入临时隐藏字段值（当用户没填 subject/message）
function setHiddenValue(name, value){
  const form = formRef.value
  if (!form) return
  let el = form.querySelector(`[name="${name}"]`)
  if (!el) {
    el = document.createElement('input')
    el.type = 'hidden'
    el.name = name
    form.appendChild(el)
  }
  el.value = value
}

// 重置
function resetForm(){
  eventName.value = 'Welcome Party'
  dateTime.value  = ''
  location.value  = ''
  toEmail.value   = ''
  subject.value   = ''
  message.value   = ''
  ok.value = err.value = false
  live.value = 'ready'
  // 清空文件
  const fileInput = formRef.value?.querySelector('input[type="file"][name="files"]')
  if (fileInput) fileInput.value = ''
}

onMounted(() => {
  // 可选：初始化 EmailJS（不是必须，sendForm 会自动处理）
  // emailjs.init({ publicKey: PUBLIC_KEY })
})
</script>

<style scoped>
.note{background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:10px;margin-bottom:12px}
.form{display:block}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media (max-width: 720px){.grid2{grid-template-columns:1fr}}
.lbl{font-weight:600;margin-top:8px;display:block}
.input{border:1px solid #d1d5db;border-radius:8px;padding:8px;width:100%}
.row{display:flex;gap:10px;align-items:flex-end;margin-top:8px;flex-wrap:wrap}
.hint{color:#6b7280;font-size:12px}
.actions{display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap}
.btn{border:1px solid #4b5563;background:#f3f4f6;color:#111827;border-radius:8px;padding:8px 14px;cursor:pointer}
.btn.primary{background:#1d4ed8;color:#fff;border:none}
.pill{display:inline-flex;gap:6px;align-items:center;padding:4px 8px;border-radius:999px;background:#f2f2f2;border:1px solid #ccc;font-size:12px}
.pill.success{background:#dcfce7;border-color:#16a34a}
.pill.danger{background:#fee2e2;border-color:#ef4444}
.panel{border:1px dashed #e5e7eb;border-radius:10px;padding:10px;margin-top:14px}
.muted{color:#6b7280}
.small{font-size:12px}
.sr-only{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
</style>
