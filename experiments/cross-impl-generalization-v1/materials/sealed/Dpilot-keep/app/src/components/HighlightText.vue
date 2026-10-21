<script setup>
import { computed } from 'vue'

// Renders text with every case-insensitive occurrence of `query` wrapped in <mark>.
const props = defineProps({ text: { type: String, default: '' }, query: { type: String, default: '' } })

const parts = computed(() => {
  const q = props.query.trim().toLowerCase()
  const text = props.text || ''
  if (!q) return [{ text, hit: false }]
  const lower = text.toLowerCase()
  const out = []
  let from = 0
  for (let at = lower.indexOf(q); at !== -1; at = lower.indexOf(q, from)) {
    if (at > from) out.push({ text: text.slice(from, at), hit: false })
    out.push({ text: text.slice(at, at + q.length), hit: true })
    from = at + q.length
  }
  if (from < text.length) out.push({ text: text.slice(from), hit: false })
  return out
})
</script>

<template><template v-for="(p, i) in parts" :key="i"><mark v-if="p.hit" class="match">{{ p.text }}</mark><template v-else>{{ p.text }}</template></template></template>
