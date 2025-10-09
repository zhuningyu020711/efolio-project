// src/main.js
import { createApp } from 'vue'
import App from './App.vue'

// ✅ PrimeVue 主题与核心
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'   // 官方主题预设
import 'primeicons/primeicons.css'         // 图标

const app = createApp(App)

app.use(PrimeVue, {
  theme: {
    preset: Aura,       // 你也可以换成其它主题
    options: { darkModeSelector: '.dark' }
  }
})

app.mount('#app')
