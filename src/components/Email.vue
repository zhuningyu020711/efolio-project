<template>
    <form class="card" @submit.prevent="send" aria-labelledby="email-title">
      <h2 id="email-title">Send Email</h2>
  
      <div class="field">
        <label for="to">To</label>
        <input id="to" v-model.trim="to" type="email" required inputmode="email" aria-describedby="toHelp" />
        <p id="toHelp" class="muted">e.g. user@example.com</p>
      </div>
  
      <div class="field">
        <label for="subject">Subject</label>
        <input id="subject" v-model.trim="subject" required />
      </div>
  
      <div class="field">
        <label for="message">Message</label>
        <textarea id="message" v-model="message" rows="6" required></textarea>
      </div>
  
      <div class="field">
        <label for="file">Attachment (optional)</label>
        <input id="file" ref="fileEl" type="file" />
      </div>
  
      <div class="inline">
        <button type="submit" class="btn primary">Send</button>
        <span aria-live="polite" class="muted">{{ status }}</span>
      </div>
  
      <p v-if="error" role="alert" aria-live="assertive" class="err">{{ error }}</p>
    </form>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import emailjs from '@emailjs/browser'
  
  const SERVICE_ID = 'service_xxxxx'
  const TEMPLATE_ID = 'template_xxxxx'
  const PUBLIC_KEY = 'xxxxxxxxxxxxxxxxxxxxx'
  
  const to = ref(''); const subject = ref(''); const message = ref('')
  const status = ref(''); const error = ref(''); const fileEl = ref(null)
  
  async function send(){
    status.value='Sending…'; error.value=''
    try{
      const form = new FormData()
      form.append('to_email', to.value)
      form.append('subject', subject.value)
      form.append('message', message.value)
      if (fileEl.value?.files?.[0]) form.append('attachment', fileEl.value.files[0])
  
      await emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, form, PUBLIC_KEY)
      status.value='Sent ✅'
      to.value=''; subject.value=''; message.value=''; if(fileEl.value) fileEl.value.value=''
    }catch(e){ error.value = e?.text || e?.message || String(e); status.value='' }
  }
  </script>
  
  <style scoped>
  .field{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
  .err{color:#b91c1c}
  </style>
  