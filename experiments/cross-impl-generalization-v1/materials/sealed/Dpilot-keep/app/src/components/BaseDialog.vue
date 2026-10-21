<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

// Modal built on the native <dialog> element (focus containment, Escape, top layer).
// Mount it with v-if; it opens on mount and returns focus to the opener on unmount.
// Escape and a click on the backdrop emit `dismiss`; the owner decides what that means.
defineProps({ labelledby: { type: String, default: undefined }, label: { type: String, default: undefined } })
const emit = defineEmits(['dismiss'])
const el = ref(null)
let opener = null
let pressStartedOnBackdrop = false

onMounted(() => {
  opener = document.activeElement
  el.value.showModal()
})
onBeforeUnmount(() => {
  if (el.value?.open) el.value.close()
  if (opener && document.contains(opener)) opener.focus()
})

function onCancel(e) {
  e.preventDefault()
  emit('dismiss')
}
function onPointerDown(e) {
  pressStartedOnBackdrop = e.target === el.value
}
function onClick(e) {
  if (e.target === el.value && pressStartedOnBackdrop) emit('dismiss')
  pressStartedOnBackdrop = false
}
</script>

<template>
  <dialog
    ref="el"
    class="dialog"
    :aria-labelledby="labelledby"
    :aria-label="label"
    @cancel="onCancel"
    @pointerdown="onPointerDown"
    @click="onClick"
  >
    <div class="dialog-inner"><slot /></div>
  </dialog>
</template>
