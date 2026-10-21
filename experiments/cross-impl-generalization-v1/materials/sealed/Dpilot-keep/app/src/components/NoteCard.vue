<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import MenuButton from './MenuButton.vue'
import HighlightText from './HighlightText.vue'
import { colorValue } from '../colors'
import { labelName } from '../store'

const props = defineProps({
  note: { type: Object, required: true },
  query: { type: String, default: '' },
  readonly: { type: Boolean, default: false },
})
const emit = defineEmits(['open', 'toggle-pin', 'change-labels'])
const titleId = computed(() => `note-title-${props.note.id}`)
const labelNames = computed(() => (props.note.labels || []).map(labelName).filter(Boolean))
const displayTitle = computed(() => props.note.title || 'Untitled note')

function onSurfaceClick(e) {
  if (props.readonly) return
  if (e.target.closest('button, a, input, [role="menu"]')) return
  if (window.getSelection()?.toString()) return
  emit('open')
}
function onMenu(id) {
  if (id === 'labels') emit('change-labels')
  if (id === 'edit') emit('open')
}
</script>

<template>
  <article
    class="note-card"
    :class="{ pending: note.pending }"
    :style="{ background: colorValue(note.color) }"
    :aria-labelledby="titleId"
    @click="onSurfaceClick"
  >
    <h3 :id="titleId" class="note-title" :class="{ untitled: !note.title }">
      <span v-if="readonly"><HighlightText :text="displayTitle" :query="query" /></span>
      <button v-else type="button" class="title-btn" @click="emit('open')">
        <HighlightText :text="displayTitle" :query="query" />
      </button>
    </h3>
    <p v-if="note.content" class="note-body"><HighlightText :text="note.content" :query="query" /></p>
    <ul v-if="labelNames.length" class="chips" aria-label="Labels">
      <li v-for="name in labelNames" :key="name" class="chip">{{ name }}</li>
    </ul>
    <div v-if="!readonly" class="note-actions">
      <button
        type="button"
        class="icon-btn"
        aria-label="Pin note"
        :title="note.pinned ? 'Unpin note' : 'Pin note'"
        :aria-pressed="note.pinned ? 'true' : 'false'"
        @click="emit('toggle-pin')"
      >
        <AppIcon :name="note.pinned ? 'pinFilled' : 'pin'" :size="20" />
      </button>
      <MenuButton
        label="More options"
        :items="[{ id: 'edit', text: 'Edit note' }, { id: 'labels', text: 'Change labels' }]"
        @select="onMenu"
      />
    </div>
  </article>
</template>
