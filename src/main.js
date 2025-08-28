import { createApp } from 'vue'
import App from './App.vue'
import 'bootstrap/dist/css/bootstrap.min.css'

import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import 'primeicons/primeicons.css'

import './style.css'

const app = createApp(App)
app.use(PrimeVue, { theme: { preset: Aura } })
app.mount('#app')

// ===== Force Light Theme (runtime injection, always last in <head>) =====
const forceLightCSS = `
  :root {
    --bg:#f5f7fa; --panel:#fff; --text:#111; --muted:#333;
    --brand:#2b68ff; --accent:#1dbb72; --danger:#cc3f3f;
  }
  html,body,#app { background:var(--bg)!important; color:var(--text)!important }
  header.bar { background:#ffffffee!important; border-bottom:1px solid #ddd!important }
  .card { background:#fff!important; border:1px solid #ddd!important; box-shadow:0 4px 10px rgba(0,0,0,.08)!important }
  .muted,.note { color:var(--muted)!important }
  .input { background:#fff!important; color:#111!important; border:1px solid #ccc!important }
  .input::placeholder { color:#666!important }
  .btn { background:#f0f0f0!important; color:#111!important; border:1px solid #ccc!important }
  .btn.primary { background:var(--brand)!important; color:#fff!important; border:none!important }
  .btn.success { background:var(--accent)!important; color:#fff!important; border:none!important }
  .btn.danger  { background:var(--danger)!important; color:#fff!important; border:none!important }
  .pill { background:#f2f2f2!important; border:1px solid #ccc!important; color:#111!important }
`
const styleEl = document.createElement('style')
styleEl.setAttribute('id','force-light')
styleEl.textContent = forceLightCSS
document.head.appendChild(styleEl)
