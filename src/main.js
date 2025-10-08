// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import 'bootstrap/dist/css/bootstrap.min.css'

import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import 'primeicons/primeicons.css'

import './style.css'

// 👉 关键：引入 Firebase 初始化 & bridge
import './firebase'
import { initAuthBridge } from './services/fbauth'

const app = createApp(App)
app.use(PrimeVue, { theme: { preset: Aura } })

app.mount('#app')

// 初始化与 store 的联动
initAuthBridge()
