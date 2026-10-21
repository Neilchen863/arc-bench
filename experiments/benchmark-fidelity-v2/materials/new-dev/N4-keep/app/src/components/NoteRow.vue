<script setup>
// Variant N4: a note rendered as a table row (same content and actions as NoteCard).
import { computed } from 'vue';
import { EditPen, MoreFilled } from '@element-plus/icons-vue';
import PinIcon from './PinIcon.vue';
import HighlightText from './HighlightText.vue';
import { colorValue } from '../colors.js';
import { formatDate } from '../api.js';

const props = defineProps({
  note: { type: Object, required: true },
  labels: { type: Array, required: true },
  keyword: { type: String, default: '' },
  readonly: Boolean,
});
const emit = defineEmits(['open', 'toggle-pin', 'change-labels', 'archive', 'trash', 'restore']);
const titleId = computed(() => `note-title-${props.note.id}`);
const noteLabels = computed(() => (props.note.labels || []).map(id => props.labels.find(l => l.id === id)).filter(Boolean));
const displayTitle = computed(() => props.note.title || 'Untitled note');

function onCommand(cmd) { emit(cmd, props.note); }
</script>

<template>
  <tr class="note-row" :aria-labelledby="titleId" :style="{ background: colorValue(note.color) }">
    <th :id="titleId" scope="row" class="note-title" @click="!readonly && emit('open', note)">
      <HighlightText :text="displayTitle" :keyword="note.title ? keyword : ''" />
    </th>
    <td class="note-content" @click="!readonly && emit('open', note)">
      <HighlightText v-if="note.content" :text="note.content" :keyword="keyword" />
    </td>
    <td class="note-labels-cell">
      <el-tag v-for="l in noteLabels" :key="l.id" size="small" round type="info" disable-transitions>{{ l.name }}</el-tag>
      <span v-if="note.trashed && note.deletedAt" class="edited">Deleted {{ formatDate(note.deletedAt) }}</span>
    </td>
    <td class="note-actions">
      <template v-if="!readonly">
        <el-button text circle size="small" :aria-pressed="String(!!note.pinned)" :aria-label="`Pin ${displayTitle}`"
          :title="note.pinned ? 'Unpin note' : 'Pin note'" @click="emit('toggle-pin', note)">
          <PinIcon :filled="!!note.pinned" />
        </el-button>
        <el-button text circle size="small" :icon="EditPen" :aria-label="`Edit ${displayTitle}`" title="Edit note"
          @click="emit('open', note)" />
        <el-dropdown trigger="click" @command="onCommand">
          <el-button text circle size="small" :icon="MoreFilled" :aria-label="`More options for ${displayTitle}`"
            title="More options" />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="change-labels">Change labels</el-dropdown-item>
              <el-dropdown-item command="archive">Archive</el-dropdown-item>
              <el-dropdown-item command="trash">Delete note</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </template>
      <el-button v-else-if="note.archived && !note.trashed" size="small" text @click="emit('restore', note)">Unarchive</el-button>
      <el-button v-else size="small" text @click="emit('restore', note)">Restore</el-button>
    </td>
  </tr>
</template>
