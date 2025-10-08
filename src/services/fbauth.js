// src/services/fbauth.js
import {
    setPersistence,
    browserLocalPersistence,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
  } from 'firebase/auth'
  import { auth } from '../firebase'
  import { useStore } from '../utils/useStore'
  
  let inited = false
  
  export function initAuthBridge() {
    if (inited) return
    inited = true
  
    // 登录状态持久化到浏览器
    setPersistence(auth, browserLocalPersistence).catch(() => {})
  
    // 监听 Firebase 的用户变化 → 同步到本地 store
    onAuthStateChanged(auth, (user) => {
      const store = useStore()
      if (user) {
        const role = user.email === 'admin@demo.local' ? 'admin' : 'user'
        const session = {
          id: user.uid,
          displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
          email: user.email || '',
          role,
        }
        store.setSession(session)   // 写入到本地 store
      } else {
        useStore().clearSession()
      }
    })
  }
  
  export async function fbRegister({ displayName, email, password }) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    // 设定昵称（可选）
    if (displayName) {
      try { await updateProfile(user, { displayName }) } catch {}
    }
    return user
  }
  
  export async function fbLogin({ email, password }) {
    const { user } = await signInWithEmailAndPassword(auth, email, password)
    return user
  }
  
  export async function fbLogout() {
    await signOut(auth)
  }
  