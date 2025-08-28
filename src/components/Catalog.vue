<script setup>
import { ref, reactive, computed } from 'vue'
import { useStore } from '../utils/useStore'

const store = useStore()
const q = ref('')
const form = reactive({})

const items = computed(() => store.state.items)

// 初始化 form 不再用 watch，直接在需要时生成
const filtered = computed(() => {
  const s = (q.value || '').trim().toLowerCase()
  if (!s) return items.value
  if (s.length < 3) return []
  return items.value.filter(it =>
    [it.title, it.category, it.description].some(t => t.toLowerCase().includes(s))
  )
})

function submit(id){
  const { rating, comment } = form[id] || { rating:5, comment:'' }
  try{
    store.submitReview(id, { rating, comment })
    form[id] = { rating:5, comment:'' }
  }catch(e){ alert(e.message) }
}
</script>
