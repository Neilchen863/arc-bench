<script setup>
import { onMounted, ref, watch, useId } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, required: true },
  placeholder: { type: String, default: '' },
  minHeight: { type: String, default: '12rem' },
});
const emit = defineEmits(['update:modelValue']);
const el = ref(null);
const labelId = useId();

function sync() {
  if (!el.value) return;
  const html = el.value.innerHTML;
  // Treat an editor that only holds a stray <br> as empty.
  emit('update:modelValue', el.value.textContent.trim() === '' && !/<(li|img)/i.test(html) ? '' : html);
}
function setContent(html) {
  if (el.value && el.value.innerHTML !== html) el.value.innerHTML = html || '';
}
onMounted(() => setContent(props.modelValue));
watch(() => props.modelValue, v => {
  if (document.activeElement !== el.value) setContent(v);
});

function exec(cmd, arg) {
  el.value.focus();
  document.execCommand(cmd, false, arg);
  sync();
}
function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
    const k = e.key.toLowerCase();
    if (k === 'b') { e.preventDefault(); exec('bold'); }
    if (k === 'i') { e.preventDefault(); exec('italic'); }
  }
}
function focusEditor() { el.value?.focus(); }
</script>

<template>
  <div class="rte">
    <span :id="labelId" class="field-label" @click="focusEditor">{{ label }}</span>
    <div class="rte-toolbar" role="toolbar" :aria-label="`${label} formatting`">
      <button type="button" aria-label="Bold" title="Bold (Ctrl+B)" @mousedown.prevent @click="exec('bold')"><b>B</b></button>
      <button type="button" aria-label="Italic" title="Italic (Ctrl+I)" @mousedown.prevent @click="exec('italic')"><i>I</i></button>
      <button type="button" aria-label="Heading" title="Heading" @mousedown.prevent @click="exec('formatBlock', 'h3')">H</button>
      <button type="button" aria-label="Bulleted list" title="Bulleted list" @mousedown.prevent @click="exec('insertUnorderedList')">&bull;&equiv;</button>
      <button type="button" aria-label="Numbered list" title="Numbered list" @mousedown.prevent @click="exec('insertOrderedList')">1.</button>
    </div>
    <div
      ref="el"
      class="rte-surface"
      contenteditable="true"
      role="textbox"
      aria-multiline="true"
      :aria-labelledby="labelId"
      :data-placeholder="placeholder"
      :style="{ minHeight }"
      tabindex="0"
      @input="sync"
      @blur="sync"
      @keydown="onKeydown"
    ></div>
  </div>
</template>
