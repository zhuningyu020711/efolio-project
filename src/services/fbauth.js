// src/services/fbauth.js
import { app } from '../firebase'
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { useStore } from '../utils/useStore'

// 单例
export const auth = getAuth(app)
const db = getFirestore(app)
const provider = new GoogleAuthProvider()

/** 登录（邮箱密码） */
export async function fbLogin({ email, password }) {
  await signInWithEmailAndPassword(auth, email, password)
}

/** 登录（Google，可选） */
export async function fbLoginGoogle() {
  await signInWithPopup(auth, provider)
}

/** 注册：写入 users 集合 + 默认 role=student（你可以在 Auth.vue 里扩展为 organizer/admin） */
export async function fbRegister({ displayName, email, password, role = 'student' }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  if (displayName) {
    await updateProfile(cred.user, { displayName })
  }
  // users/{uid}
  await setDoc(
    doc(db, 'users', cred.user.uid),
    {
      email: cred.user.email,
      displayName: cred.user.displayName || displayName || '',
      role,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  )
  return cred.user
}

/** 登出 */
export async function fbLogout() {
  await signOut(auth)
}

/** 把 Firebase Auth 状态同步到你的本地 store（App.vue 就依赖这个 store 来显示不同页面） */
export function initAuthBridge() {
  const store = useStore()
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // 读取角色
      let role = 'student'
      try {
        const snap = await getDoc(doc(db, 'users', user.uid))
        if (snap.exists()) role = snap.data().role || 'student'
      } catch (e) {
        console.warn('[fbauth] read user role failed:', e?.message || e)
      }

      // 把登录状态喂给你的 store（useStore.js 已有 login/logout）
      store.login({
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        role,
      })
    } else {
      store.logout()
    }
  })
}
