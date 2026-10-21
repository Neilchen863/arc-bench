<script setup>
import { ref, nextTick, onBeforeUnmount } from 'vue'
import AppIcon from './AppIcon.vue'

// Button + popup menu following the WAI-ARIA menu button pattern.
const props = defineProps({
  label: { type: String, required: true },
  icon: { type: String, default: 'more' },
  items: { type: Array, required: true }, // [{ id, text }]
})
const emit = defineEmits(['select'])
const open = ref(false)
const button = ref(null)
const menu = ref(null)
const uid = `menu-${Math.random().toString(36).slice(2, 9)}`

function itemEls() {
  return menu.value ? [...menu.value.querySelectorAll('[role="menuitem"]')] : []
}
async function show(focusLast = false) {
  open.value = true
  document.addEventListener('pointerdown', onOutside, true)
  await nextTick()
  const els = itemEls()
  els[focusLast ? els.length - 1 : 0]?.focus()
}
function hide(returnFocus = true) {
  open.value = false
  document.removeEventListener('pointerdown', onOutside, true)
  if (returnFocus) button.value?.focus()
}
function onOutside(e) {
  if (!menu.value?.contains(e.target) && !button.value?.contains(e.target)) hide(false)
}
function toggle() {
  open.value ? hide() : show()
}
function onButtonKey(e) {
  if (e.key === 'ArrowDown') { e.preventDefault(); show() }
  if (e.key === 'ArrowUp') { e.preventDefault(); show(true) }
}
function onMenuKey(e) {
  const els = itemEls()
  const i = els.indexOf(document.activeElement)
  if (e.key === 'ArrowDown') { e.preventDefault(); els[(i + 1) % els.length].focus() }
  else if (e.key === 'ArrowUp') { e.preventDefault(); els[(i - 1 + els.length) % els.length].focus() }
  else if (e.key === 'Home') { e.preventDefault(); els[0].focus() }
  else if (e.key === 'End') { e.preventDefault(); els[els.length - 1].focus() }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hide() }
  else if (e.key === 'Tab') hide(false)
}
function choose(item) {
  hide(false)
  emit('select', item.id)
}
onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutside, true))
</script>

<template>
  <div class="menu-wrap">
    <button
      ref="button"
      type="button"
      class="icon-btn"
      :aria-label="props.label"
      :title="props.label"
      aria-haspopup="menu"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="open ? uid : undefined"
      @click="toggle"
      @keydown="onButtonKey"
    >
      <AppIcon :name="icon" :size="20" />
    </button>
    <ul v-if="open" :id="uid" ref="menu" role="menu" class="menu" :aria-label="props.label" @keydown="onMenuKey">
      <li v-for="item in items" :key="item.id" role="none">
        <button type="button" role="menuitem" tabindex="-1" @click="choose(item)">{{ item.text }}</button>
      </li>
    </ul>
  </div>
</template>
