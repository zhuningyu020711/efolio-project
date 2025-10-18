// src/main.js
import { createApp } from 'vue'
import App from './App.vue'

// ✅ PrimeVue 主题与核心
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'   // 官方主题预设
import 'primeicons/primeicons.css'         // 图标

// ✅ 引入前端路由
import router from './index.js'             // ← 确保 index.js 里有 { path:'/auth', component:Auth }

// ✅ 初始化 Firebase 与 Auth 状态桥接
import './firebase'
import { initAuthBridge } from './services/fbauth'

const app = createApp(App)

app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: { darkModeSelector: '.dark' }
  }
})

// ✅ 关键：挂载路由，让 <router-view /> 可渲染
app.use(router)

app.mount('#app')
// 可选：访问  /?seed=1  自动导入；访问 /?seed=force 强制覆盖导入


// ✅ 初始化 Auth 状态同步（不影响布局）
initAuthBridge()
