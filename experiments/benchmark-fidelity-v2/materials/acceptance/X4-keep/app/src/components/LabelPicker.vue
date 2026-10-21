<script setup>
import { ref, computed } from 'vue'
import BaseDialog from './BaseDialog.vue'
import AppIcon from './AppIcon.vue'
import { store, REMINDERS_ID } from '../store'

// Chooser for a note's labels. Selections are kept whether it is left with Done, Escape or a backdrop click.
const props = defineProps({ selected: { type: Array, default: () => [] }, noteTitle: { type: String, default: '' } })
const emit = defineEmits(['done'])
const chosen = ref([...props.selected])
const headingId = `picker-${Math.random().toString(36).slice(2, 9)}`

const labels = computed(() => [
  ...store.labels.filter(l => l.id === REMINDERS_ID),
  ...store.labels.filter(l => l.id !== REMINDERS_ID).sort((a, b) => a.name.localeCompare(b.name)),
])
function toggle(id) {
  chosen.value = chosen.value.includes(id) ? chosen.value.filter(x => x !== id) : [...chosen.value, id]
}
function finish() {
  // Keep only labels that still exist, preserving the order of the label list.
  emit('done', labels.value.map(l => l.id).filter(id => chosen.value.includes(id)))
}
</script>

<template>
  <BaseDialog :labelledby="headingId" @dismiss="finish">
    <div class="picker">
      <h2 :id="headingId" class="dialog-title">Note labels</h2>
      <p v-if="noteTitle" class="muted small">{{ noteTitle }}</p>
      <ul class="picker-list">
        <li v-for="label in labels" :key="label.id">
          <button
            type="button"
            class="switch-row"
            role="switch"
            :aria-checked="chosen.includes(label.id) ? 'true' : 'false'"
            @click="toggle(label.id)"
          >
            <AppIcon :name="label.id === REMINDERS_ID ? 'bell' : 'label'" :size="18" />
            <span class="grow">{{ label.name }}</span>
            <span class="switch-track" aria-hidden="true"><span class="switch-thumb"></span></span>
          </button>
        </li>
      </ul>
      <p v-if="labels.length === 1" class="muted small">Create more labels with Edit Labels in the sidebar.</p>
      <div class="dialog-actions">
        <button type="button" class="text-btn" @click="finish">Done</button>
      </div>
    </div>
  </BaseDialog>
</template>
