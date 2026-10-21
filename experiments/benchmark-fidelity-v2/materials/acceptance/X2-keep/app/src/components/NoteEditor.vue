<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import BaseDialog from './BaseDialog.vue'
import InlineShell from './InlineShell.vue'
import AppIcon from './AppIcon.vue'
import LabelPicker from './LabelPicker.vue'
import { COLORS, colorValue } from '../colors'
import { labelName, formatDate } from '../store'

// Editor for a new or existing note. There is no save button: leaving the editor
// (Close, Escape or clicking outside) hands the draft to the owner, which saves it.
const props = defineProps({
  note: { type: Object, default: null }, // null => new note
  initialLabels: { type: Array, default: () => [] },
  inline: { type: Boolean, default: false }, // expand in the composer instead of a modal
})
const emit = defineEmits(['close'])

const title = ref(props.note?.title ?? '')
const pinned = ref(props.note?.pinned ?? false)
const color = ref(props.note?.color ?? null)
const labels = ref([...(props.note?.labels ?? props.initialLabels)])
const body = ref(null)
const titleInput = ref(null)
const pickerOpen = ref(false)
const paletteOpen = ref(false)
const paletteBtn = ref(null)
const headingId = `editor-${Math.random().toString(36).slice(2, 9)}`
const bodyEmpty = ref(!(props.note?.content))

const labelNames = computed(() => labels.value.map(labelName).filter(Boolean))

onMounted(async () => {
  body.value.textContent = props.note?.content ?? ''
  await nextTick()
  if (props.note) {
    body.value.focus()
    const range = document.createRange()
    range.selectNodeContents(body.value)
    range.collapse(false)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
  } else {
    titleInput.value.focus()
  }
})

function readBody() {
  // innerText turns <br>/<div> line breaks into "\n"; drop the trailing break browsers leave behind.
  return (body.value?.innerText ?? '').replace(/\r\n?/g, '\n').replace(/\n+$/, '')
}
function onBodyInput() {
  bodyEmpty.value = readBody() === ''
}
function onBodyPaste(e) {
  // Keep the note body plain text.
  e.preventDefault()
  const text = e.clipboardData.getData('text/plain')
  document.execCommand('insertText', false, text)
}
function onBodyKeydown(e) {
  // Browsers without plaintext-only editing would insert <div> blocks; a line break is what users expect.
  if (e.key === 'Enter' && !e.shiftKey && body.value.contentEditable !== 'plaintext-only') {
    e.preventDefault()
    document.execCommand('insertLineBreak')
  }
}
function close() {
  if (pickerOpen.value) return
  emit('close', {
    title: title.value.trim(),
    content: readBody(),
    pinned: pinned.value,
    color: color.value,
    labels: labels.value,
  })
}
function onDismiss() {
  if (paletteOpen.value) { paletteOpen.value = false; paletteBtn.value?.focus(); return }
  close()
}
function onLabelsDone(ids) {
  labels.value = ids
  pickerOpen.value = false
}
function pickColor(id) {
  color.value = id
}
</script>

<template>
  <component :is="inline ? InlineShell : BaseDialog" :labelledby="headingId" @dismiss="onDismiss">
    <div class="editor" :style="{ background: colorValue(color) }">
      <h2 :id="headingId" class="visually-hidden">{{ note ? 'Edit note' : 'New note' }}</h2>
      <div class="editor-head">
        <input
          ref="titleInput"
          v-model="title"
          class="editor-title"
          type="text"
          aria-label="Title"
          placeholder="Title"
          autocomplete="off"
          @keydown.enter.prevent="body.focus()"
        />
        <button
          type="button"
          class="icon-btn"
          :aria-label="'Pin note'"
          :title="pinned ? 'Unpin note' : 'Pin note'"
          :aria-pressed="pinned ? 'true' : 'false'"
          @click="pinned = !pinned"
        >
          <AppIcon :name="pinned ? 'pinFilled' : 'pin'" />
        </button>
      </div>
      <div
        ref="body"
        class="editor-body"
        :class="{ empty: bodyEmpty }"
        contenteditable="plaintext-only"
        role="textbox"
        aria-multiline="true"
        aria-label="Note text"
        data-placeholder="Write a note…"
        spellcheck="true"
        @input="onBodyInput"
        @paste="onBodyPaste"
        @keydown="onBodyKeydown"
      ></div>
      <ul v-if="labelNames.length" class="chips" aria-label="Labels on this note">
        <li v-for="name in labelNames" :key="name" class="chip">{{ name }}</li>
      </ul>
      <p v-if="note?.editedAt" class="edited small muted">Edited {{ formatDate(note.editedAt) }}</p>
      <div class="editor-tools">
        <div class="palette-wrap">
          <button
            ref="paletteBtn"
            type="button"
            class="icon-btn"
            aria-label="Background color"
            title="Background color"
            :aria-expanded="paletteOpen ? 'true' : 'false'"
            aria-controls="palette"
            @click="paletteOpen = !paletteOpen"
          >
            <AppIcon name="palette" :size="20" />
          </button>
          <div v-if="paletteOpen" id="palette" class="palette" role="group" aria-label="Background color options">
            <button
              v-for="c in COLORS"
              :key="c.name"
              type="button"
              class="swatch"
              :style="{ background: c.value }"
              :aria-label="c.name"
              :title="c.name"
              :aria-pressed="color === c.id ? 'true' : 'false'"
              @click="pickColor(c.id)"
            >
              <AppIcon v-if="color === c.id" name="check" :size="16" />
            </button>
          </div>
        </div>
        <button type="button" class="icon-btn" aria-label="Change labels" title="Change labels" @click="pickerOpen = true">
          <AppIcon name="label" :size="20" />
        </button>
        <span class="grow"></span>
        <button type="button" class="text-btn" @click="close">Close</button>
      </div>
    </div>
    <LabelPicker v-if="pickerOpen" :selected="labels" :note-title="title" @done="onLabelsDone" />
  </component>
</template>
