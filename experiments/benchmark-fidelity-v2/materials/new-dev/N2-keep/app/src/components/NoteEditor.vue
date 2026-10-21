<script setup>
// (variant N2) rich-text content editor
import { ref, reactive, watch, computed } from 'vue';
import { Brush, PriceTag } from '@element-plus/icons-vue';
import PinIcon from './PinIcon.vue';
import LabelChooser from './LabelChooser.vue';
import { COLORS } from '../colors.js';
import { formatDate } from '../api.js';

// Note editor: used both for creating a note and for editing an existing one.
// There is no Save button: closing the editor (Close button, Esc, click outside) saves.
const props = defineProps({
  modelValue: Boolean,
  note: { type: Object, default: null },
  labels: { type: Array, required: true },
  initialLabels: { type: Array, default: () => [] },
  // Async autosave handler supplied by the parent; the editor closes once it has resolved.
  save: { type: Function, required: true },
});
const emit = defineEmits(['update:modelValue']);
const saving = ref(false);

const draft = reactive({ title: '', content: '', pinned: false, color: null, labels: [] });
const chooserOpen = ref(false);
const titleInput = ref(null);
// Variant N2: the note text is a rich-text (contenteditable) field; each line is a block, Enter starts a new line.
const contentEl = ref(null);
function syncFromRich() { draft.content = (contentEl.value?.innerText ?? '').replace(/\n$/, ''); }
function fillRich() {
  if (!contentEl.value) return;
  contentEl.value.innerHTML = '';
  for (const line of (draft.content || '').split('\n')) {
    const div = document.createElement('div');
    if (line) div.textContent = line; else div.appendChild(document.createElement('br'));
    contentEl.value.appendChild(div);
  }
  if (!draft.content) contentEl.value.innerHTML = '';
}

watch(() => props.modelValue, open => {
  if (!open) return;
  const n = props.note;
  Object.assign(draft, {
    title: n?.title ?? '',
    content: n?.content ?? '',
    pinned: !!n?.pinned,
    color: n?.color ?? null,
    labels: [...(n ? n.labels ?? [] : props.initialLabels)],
  });
  setTimeout(fillRich);
}, { immediate: true });

const draftLabels = computed(() => draft.labels.map(id => props.labels.find(l => l.id === id)).filter(Boolean));

async function close() {
  if (!props.modelValue || saving.value) return;
  saving.value = true;
  try {
    await props.save({ ...draft, labels: [...draft.labels] });
  } catch {
    return; // save failed: stay open
  } finally {
    saving.value = false;
  }
  emit('update:modelValue', false);
}
</script>

<template>
  <el-dialog :model-value="modelValue" :title="note ? 'Edit note' : 'New note'" width="560px" :show-close="false"
    :before-close="() => close()" class="note-editor" @opened="titleInput?.focus()">
    <div class="editor-head">
      <el-input ref="titleInput" v-model="draft.title" placeholder="Title" aria-label="Title" class="editor-title" />
      <el-button text circle :aria-pressed="String(draft.pinned)" aria-label="Pin note"
        :title="draft.pinned ? 'Unpin note' : 'Pin note'" @click="draft.pinned = !draft.pinned">
        <PinIcon :filled="draft.pinned" />
      </el-button>
    </div>
    <div ref="contentEl" class="editor-content rich-content" contenteditable="true" role="textbox" aria-multiline="true"
      aria-label="Note text" data-placeholder="Take a note…" @input="syncFromRich" @vue:mounted="fillRich"></div>
    <div v-if="draftLabels.length" class="note-labels" aria-label="Labels on this note">
      <el-tag v-for="l in draftLabels" :key="l.id" size="small" round type="info" disable-transitions>{{ l.name }}</el-tag>
    </div>
    <p v-if="note?.editedAt" class="edited">Edited {{ formatDate(note.editedAt) }}</p>
    <template #footer>
      <div class="editor-toolbar">
        <el-popover trigger="click" placement="top" width="auto">
          <template #reference>
            <el-button text circle :icon="Brush" aria-label="Background color" title="Background color" />
          </template>
          <div class="swatches" role="group" aria-label="Background color">
            <button v-for="c in COLORS" :key="c.id ?? 'default'" type="button" class="swatch"
              :style="{ background: c.value }" :aria-label="c.name" :title="c.name"
              :aria-pressed="String(draft.color === c.id)" @click="draft.color = c.id" />
          </div>
        </el-popover>
        <el-button text circle :icon="PriceTag" aria-label="Change labels" title="Change labels"
          @click="chooserOpen = true" />
        <span class="spacer" />
        <el-button text :loading="saving" @click="close">Close</el-button>
      </div>
    </template>
    <LabelChooser v-model="chooserOpen" :labels="labels" :selected="draft.labels" :note-title="draft.title"
      @done="ids => (draft.labels = ids)" />
  </el-dialog>
</template>
