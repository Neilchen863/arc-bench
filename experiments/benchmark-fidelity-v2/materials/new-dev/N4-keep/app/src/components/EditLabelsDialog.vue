<script setup>
import { ref } from 'vue';
import { Check, Delete } from '@element-plus/icons-vue';

const props = defineProps({ modelValue: Boolean, labels: { type: Array, required: true } });
const emit = defineEmits(['update:modelValue', 'create', 'rename', 'delete']);
const newName = ref('');
const drafts = ref({});

function create() {
  const name = newName.value.trim();
  if (!name) return;
  emit('create', name);
  newName.value = '';
}
function draftOf(l) { return drafts.value[l.id] ?? l.name; }
function commitRename(l) {
  const name = (drafts.value[l.id] ?? l.name).trim();
  delete drafts.value[l.id];
  if (name && name !== l.name) emit('rename', l, name);
}
function close() { emit('update:modelValue', false); }
</script>

<template>
  <el-dialog :model-value="modelValue" title="Edit labels" width="360px" :before-close="() => close()">
    <form class="label-row" @submit.prevent="create">
      <el-input v-model="newName" placeholder="Create new label" aria-label="New label name" />
      <el-button native-type="submit" :icon="Check" circle aria-label="Create label" title="Create label" />
    </form>
    <ul class="label-manage-list">
      <li v-for="l in labels" :key="l.id" class="label-row">
        <el-input :model-value="draftOf(l)" :aria-label="`Label name ${l.name}`"
          @update:model-value="v => (drafts[l.id] = v)" @blur="commitRename(l)" @keyup.enter="commitRename(l)" />
        <el-button :icon="Delete" circle :aria-label="`Delete label ${l.name}`" :title="`Delete label ${l.name}`"
          @click="emit('delete', l)" />
      </li>
    </ul>
    <template #footer>
      <el-button type="primary" @click="close">Done</el-button>
    </template>
  </el-dialog>
</template>
