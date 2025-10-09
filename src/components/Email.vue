<template>
    <section class="card" style="max-width:720px;margin:0 auto">
      <h2>Email (EmailJS)</h2>
  
      <!-- 可见表单（用户操作） -->
      <form class="grid" @submit.prevent="onSend">
        <label>To
          <input class="input" type="email" v-model.trim="form.to" required />
        </label>
  
        <label>Subject
          <input class="input" v-model.trim="form.subject" required minlength="2" />
        </label>
  
        <label>Message (HTML allowed)
          <textarea class="input" rows="8" v-model="form.html" required placeholder="<p>Hello...</p>"></textarea>
        </label>
  
        <label>Attachments (optional)
          <input type="file" multiple @change="onFiles" />
          <small v-if="files.length" class="muted">{{ files.length }} file(s) selected</small>
        </label>
  
        <div class="inline">
          <button class="btn primary" :disabled="loading">Send</button>
          <span v-if="loading" class="muted">Sending…</span>
          <span v-if="status" :class="status.includes('✅') ? 'ok' : 'err'">{{ status }}</span>
        </div>
      </form>
  
      <!-- 隐藏表单（仅在有附件时给 emailjs.sendForm 使用） -->
      <form ref="hiddenForm" v-show="false">
        <input name="to_email" :value="form.to" />
        <input name="subject"  :value="form.subject" />
        <textarea name="message">{{ form.html }}</textarea>
        <input ref="hiddenFile" type="file" name="attachments" multiple />
      </form>
    </section>
  </template>
  
  <script setup>
  import { reactive, ref } from 'vue'
  import { sendMailBasic, sendMailWithForm } from '../services/email'
  
  const loading = ref(false)
  const status  = ref('')
  const files   = ref([])
  
  const hiddenForm = ref(null)
  const hiddenFile = ref(null)
  
  const form = reactive({
    to: '',
    subject: '',
    html: '<p>Hello from Campus Event System!</p>'
  })
  
  function onFiles(e){
    files.value = Array.from(e.target.files || [])
    // 同步到隐藏 form 的 file input
    if (hiddenFile.value) {
      // 构造一个新的 DataTransfer 把文件塞进隐藏 input
      const dt = new DataTransfer()
      files.value.forEach(f => dt.items.add(f))
      hiddenFile.value.files = dt.files
    }
  }
  
  async function onSend(){
    loading.value = true
    status.value  = ''
    try{
      let res
      if (files.value.length > 0) {
        // 走附件通道：sendForm
        res = await sendMailWithForm(hiddenForm.value)
      } else {
        // 走最稳通道：send（无附件）
        res = await sendMailBasic({ to: form.to, subject: form.subject, html: form.html })
      }
      status.value = res.ok ? 'Sent ✅' : ('Failed ❌ ' + (res.error?.text || res.error?.message || ''))
    }catch(err){
      status.value = 'Failed ❌ ' + (err?.message || String(err))
    }finally{
      loading.value = false
    }
  }
  </script>
  
  <style scoped>
  .grid{display:grid;gap:12px}
  .inline{display:flex;gap:10px;align-items:center}
  .input{width:100%;border:1px solid #ccc;background:#fff;color:#222;border-radius:8px;padding:8px 10px}
  .muted{color:#6b7280}
  .ok{color:#16a34a}
  .err{color:#ef4444}
  .btn{border:1px solid #ccc;background:#f0f0f0;color:#222;border-radius:8px;padding:8px 14px;cursor:pointer}
  .btn.primary{background:#3b82f6;color:#fff;border:none}
  .card{background:#fff;border:1px solid #ddd;border-radius:12px;padding:16px;box-shadow:0 4px 10px rgba(0,0,0,0.08)}
  </style>
  