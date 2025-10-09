// src/services/fbauth.js
import {
  browserLocalPersistence,
  setPersistence,
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
  const store = useStore()

  setPersistence(auth, browserLocalPersistence).catch(() => {})

  // 🔹 同步 Firebase 状态到 Vue Store
  onAuthStateChanged(auth, (user) => {
    if (user) {
      const session = {
        id: user.uid,
        displayName: user.displayName || user.email.split('@')[0],
        email: user.email,
        role: user.email === 'admin@demo.local' ? 'admin' : 'user',
      }
      store.setSession(session)
    } else {
      store.clearSession()
    }
  })
}

export async function fbRegister({ displayName, email, password }) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  if (displayName) await updateProfile(user, { displayName })
  return user
}

export async function fbLogin({ email, password }) {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  return user
}

export async function fbLogout() {
  await signOut(auth)
}
