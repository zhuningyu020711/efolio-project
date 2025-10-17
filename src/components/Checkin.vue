<template>
    <section class="card" aria-live="polite">
      <h2>Event Check-in</h2>
  
      <div v-if="status==='ok'" class="ok">
        ✅ Check-in successful!
        <div class="mini">Event: <strong>{{ eventId }}</strong></div>
        <div class="mini">Time: {{ timeText }}</div>
      </div>
  
      <div v-else-if="status==='dup'" class="ok">
        ✅ You have already checked in for this event.
      </div>
  
      <div v-else-if="status==='loading'">Processing...</div>
  
      <div v-else class="err">❌ {{ errorMsg || 'Invalid or expired QR.' }}</div>
  
      <div class="actions">
        <button class="btn" @click="$emit('back')">Back to app</button>
      </div>
    </section>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  
  // 可选：如果你的项目里已经初始化了 Firebase，可以打开下面注释使用 Firestore 写入
  // import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'
  // import { app } from '../services/firebase' // 你的 firebase 初始化（按你的路径改）
  
  const status = ref('loading') // loading | ok | dup | error
  const errorMsg = ref('')
  const eventId = ref('')
  const timeText = ref('')
  
  function decodePayloadFromHash () {
    try {
      const hash = window.location.hash || ''
      const q = new URLSearchParams(hash.split('?')[1] || '')
      const p = q.get('p')
      if (!p) throw new Error('Missing payload')
      const json = decodeURIComponent(atob(p))
      return JSON.parse(json)
    } catch (e) {
      throw new Error('Bad payload')
    }
  }
  
  async function writeAttendanceLocal (eventId) {
    const key = 'attendance_local'
    const all = JSON.parse(localStorage.getItem(key) || '[]')
    const already = all.find(r => r.eventId === eventId)
    if (already) return 'dup'
    all.push({ eventId, ts: Date.now() })
    localStorage.setItem(key, JSON.stringify(all))
    return 'ok'
  }
  
  // 如果想写到 Firestore，把这个函数改为真正 addDoc：
  // async function writeAttendanceCloud(eventId) {
  //   const db = getFirestore(app)
  //   await addDoc(collection(db, 'attendance'), {
  //     eventId,
  //     ts: serverTimestamp()
  //   })
  //   return 'ok'
  // }
  
  onMounted(async () => {
    try {
      const payload = decodePayloadFromHash()
      if (payload?.type !== 'attendance' || !payload.eventId) {
        throw new Error('Invalid payload')
      }
      eventId.value = payload.eventId
      timeText.value = new Date(payload.ts || Date.now()).toLocaleString()
  
      // 先本地去重写入；如果你要上云，换成 writeAttendanceCloud
      const result = await writeAttendanceLocal(payload.eventId)
      status.value = result // 'ok' | 'dup'
    } catch (e) {
      status.value = 'error'
      errorMsg.value = e.message
    }
  })
  </script>
  
  <style scoped>
  .card{ background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px }
  .ok{ color:#065f46 }
  .err{ color:#b91c1c }
  .mini{ color:#6b7280;font-size:12px;margin-top:4px }
  .actions{ margin-top:14px }
  .btn{ border:1px solid #475569;background:#f8fafc;border-radius:8px;padding:8px 12px;cursor:pointer }
  </style>
  