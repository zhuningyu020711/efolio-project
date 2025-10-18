<template>
    <div class="rating" role="group" :aria-label="`Rate ${label}`">
      <button
        v-for="n in 5"
        :key="n"
        class="star"
        :aria-pressed="n <= value"
        :aria-label="`Rate ${n} out of 5`"
        @click="$emit('update:modelValue', n)"
        @keydown.enter="$emit('update:modelValue', n)"
      >{{ n <= value ? '★' : '☆' }}</button>
      <span class="avg" aria-live="polite">{{ hint }}</span>
    </div>
  </template>
  
  <script setup>
  const props = defineProps({
    modelValue: { type: Number, default: 0 },
    label: { type: String, default: 'item' },
  })
  const emit = defineEmits(['update:modelValue'])
  const value = computed(() => Math.min(5, Math.max(0, props.modelValue)))
  const hint  = computed(() => `${value.value}/5`)
  </script>
  
  <style scoped>
  .rating{display:inline-flex;gap:6px;align-items:center}
  .star{font-size:20px;cursor:pointer;background:transparent;border:none;line-height:1}
  .star:focus-visible{outline:2px solid #0ea5e9;outline-offset:2px;border-radius:4px}
  .avg{font-size:12px;color:#64748b;margin-left:6px}
  </style>
  