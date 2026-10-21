<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

// In-page surface for the composer: the editor expands where the "New note" button was.
// Escape inside it, or a press outside it, emits `dismiss` (same contract as BaseDialog).
defineProps({ labelledby: { type: String, default: undefined }, label: { type: String, default: undefined } })
const emit = defineEmits(['dismiss'])
const el = ref(null)

function onDocPointerDown(e) {
  if (el.value && !el.value.contains(e.target)) emit('dismiss')
}
function onKeydown(e) {
  if (e.key === 'Escape') { e.preventDefault(); emit('dismiss') }
}
onMounted(() => document.addEventListener('pointerdown', onDocPointerDown, true))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointerDown, true))
</script>

<template>
  <section ref="el" class="inline-editor" :aria-labelledby="labelledby" :aria-label="label" @keydown="onKeydown">
    <slot />
  </section>
</template>
