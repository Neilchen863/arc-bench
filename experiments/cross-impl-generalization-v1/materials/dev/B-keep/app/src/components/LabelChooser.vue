<script setup>
import { ref, watch } from 'vue';

// Dialog for choosing which labels a note carries. Works on a local copy; Done emits the result.
const props = defineProps({
  modelValue: Boolean,
  labels: { type: Array, required: true },
  selected: { type: Array, default: () => [] },
  noteTitle: { type: String, default: '' },
  // Optional async persister; when given, the chooser stays open until it resolves.
  save: { type: Function, default: null },
});
const emit = defineEmits(['update:modelValue', 'done']);
const picked = ref([]);
watch(() => props.modelValue, open => { if (open) picked.value = [...props.selected]; }, { immediate: true });

const busy = ref(false);
async function done() {
  if (busy.value) return;
  const ids = [...picked.value];
  if (props.save) {
    busy.value = true;
    try { await props.save(ids); } finally { busy.value = false; }
  }
  emit('done', ids);
  emit('update:modelValue', false);
}
</script>

<template>
  <el-dialog :model-value="modelValue" title="Label note" width="320px" append-to-body
    :before-close="() => done()" class="label-chooser">
    <p v-if="noteTitle" class="chooser-sub">Labels for “{{ noteTitle }}”</p>
    <el-checkbox-group v-model="picked" class="chooser-list" aria-label="Available labels">
      <el-checkbox v-for="l in labels" :key="l.id" :value="l.id">{{ l.name }}</el-checkbox>
    </el-checkbox-group>
    <template #footer>
      <el-button type="primary" :loading="busy" @click="done">Done</el-button>
    </template>
  </el-dialog>
</template>
