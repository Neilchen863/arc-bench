<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { store, REMINDERS_ID } from '../store'

const props = defineProps({
  expanded: { type: Boolean, default: true },
  view: { type: Object, required: true }, // { kind, labelId }
  searching: { type: Boolean, default: false },
})
const emit = defineEmits(['select', 'edit-labels'])

const entries = computed(() => {
  const userLabels = store.labels
    .filter(l => l.id !== REMINDERS_ID)
    .sort((a, b) => a.name.localeCompare(b.name))
  return [
    { key: 'notes', text: 'Notes', icon: 'bulb', view: { kind: 'notes' } },
    { key: REMINDERS_ID, text: 'Reminders', icon: 'bell', view: { kind: 'label', labelId: REMINDERS_ID } },
    ...userLabels.map(l => ({ key: l.id, text: l.name, icon: 'label', view: { kind: 'label', labelId: l.id } })),
    { key: 'edit-labels', text: 'Edit Labels', icon: 'pencil', action: true },
    { key: 'archive', text: 'Archived', icon: 'archive', view: { kind: 'archive' } },
    { key: 'trash', text: 'Trash', icon: 'trash', view: { kind: 'trash' } },
  ]
})

function isCurrent(entry) {
  if (props.searching || entry.action) return false
  return entry.view.kind === props.view.kind && entry.view.labelId === props.view.labelId
}
function activate(entry) {
  if (entry.action) emit('edit-labels')
  else emit('select', entry.view)
}
</script>

<template>
  <nav id="sidebar" class="sidebar" :class="{ collapsed: !expanded }" aria-label="Sidebar">
    <ul>
      <li v-for="entry in entries" :key="entry.key">
        <button
          type="button"
          class="side-item"
          :class="{ current: isCurrent(entry) }"
          :aria-current="isCurrent(entry) ? 'true' : undefined"
          :aria-label="entry.text"
          :title="expanded ? undefined : entry.text"
          @click="activate(entry)"
        >
          <AppIcon :name="entry.icon" />
          <span class="side-text">{{ entry.text }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>
