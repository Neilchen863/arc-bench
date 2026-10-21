<script setup>
import { ref, computed } from 'vue'
import BaseDialog from './BaseDialog.vue'
import AppIcon from './AppIcon.vue'
import { store, REMINDERS_ID, createLabel, deleteLabel } from '../store'

const emit = defineEmits(['close'])
const name = ref('')
const message = ref('')
const busy = ref(false)
const userLabels = computed(() =>
  store.labels.filter(l => l.id !== REMINDERS_ID).sort((a, b) => a.name.localeCompare(b.name)),
)

async function submit() {
  const value = name.value.trim()
  if (!value) { message.value = 'Enter a label name.'; return }
  if (store.labels.some(l => l.name.toLowerCase() === value.toLowerCase())) {
    message.value = `A label named "${value}" already exists.`
    return
  }
  busy.value = true
  const created = await createLabel(value)
  busy.value = false
  if (created) { name.value = ''; message.value = `Label "${value}" created.` }
}
</script>

<template>
  <BaseDialog labelledby="edit-labels-title" @dismiss="emit('close')">
    <div class="edit-labels">
      <h2 id="edit-labels-title" class="dialog-title">Edit labels</h2>
      <form class="new-label" @submit.prevent="submit">
        <AppIcon name="plus" :size="20" />
        <input
          v-model="name"
          type="text"
          aria-label="New label"
          placeholder="Create new label"
          maxlength="50"
          autocomplete="off"
          @input="message = ''"
        />
        <button type="submit" class="icon-btn" aria-label="Create label" title="Create label" :disabled="busy">
          <AppIcon name="check" :size="20" />
        </button>
      </form>
      <p class="small muted" role="status">{{ message }}</p>
      <ul class="label-list" aria-label="Your labels">
        <li v-for="label in userLabels" :key="label.id">
          <AppIcon name="label" :size="18" />
          <span class="grow">{{ label.name }}</span>
          <button type="button" class="icon-btn" :aria-label="`Delete label ${label.name}`" :title="`Delete label ${label.name}`" @click="deleteLabel(label.id)">
            <AppIcon name="trash" :size="18" />
          </button>
        </li>
      </ul>
      <div class="dialog-actions">
        <button type="button" class="text-btn" @click="emit('close')">Done</button>
      </div>
    </div>
  </BaseDialog>
</template>
