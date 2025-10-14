// 统一拼接 Firebase Functions 的基础 URL
const REGION = import.meta.env.VITE_FUNCTIONS_REGION || 'us-central1';
const PROJECT = import.meta.env.VITE_FIREBASE_PROJECT_ID;

export function functionsBase() {
  if (!PROJECT) console.warn('VITE_FIREBASE_PROJECT_ID missing');
  return `https://${REGION}-${PROJECT}.cloudfunctions.net`;
}
