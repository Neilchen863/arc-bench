<script setup>
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { api, businessNow } from '../api.js';
import { sanitize } from '../sanitize.js';
import RichTextEditor from '../components/RichTextEditor.vue';

// Used for both a new page (bookId) and editing an existing page (id).
const props = defineProps({ id: { type: String, default: '' }, bookId: { type: String, default: '' } });
const router = useRouter();
const editing = computed(() => !!props.id);
const title = ref('');
const body = ref('');
const parentBookId = ref(props.bookId);
const error = ref('');
const saving = ref(false);
const loaded = ref(!props.id);

onMounted(async () => {
  if (!props.id) return;
  try {
    const page = await api.get('pages', props.id);
    title.value = page.title || '';
    body.value = page.html || '';
    parentBookId.value = page.bookId;
    loaded.value = true;
  } catch { error.value = 'This page could not be found.'; }
});

async function save() {
  if (!title.value.trim()) { error.value = 'Please give the page a title.'; return; }
  saving.value = true;
  error.value = '';
  try {
    const now = await businessNow();
    const data = { title: title.value.trim(), html: sanitize(body.value), updated: now };
    if (editing.value) {
      await api.patch('pages', props.id, data);
      router.push(`/pages/${props.id}`);
    } else {
      await api.create('pages', { ...data, bookId: parentBookId.value, created: now });
      router.push(`/books/${parentBookId.value}`);
    }
  } catch { error.value = 'The page could not be saved. Please try again.'; saving.value = false; }
}
const backTo = computed(() => (editing.value ? `/pages/${props.id}` : `/books/${parentBookId.value}`));
</script>

<template>
  <div class="container editor-container">
    <form class="editor" novalidate @submit.prevent="save">
      <div class="editor-bar">
        <RouterLink :to="backTo" class="back">← Back</RouterLink>
        <h1 class="editor-heading">{{ editing ? 'Editing page' : 'New page' }}</h1>
        <button type="submit" class="btn primary" :disabled="saving || !loaded">Save page</button>
      </div>
      <p v-if="error" role="alert" class="error">{{ error }}</p>
      <div v-if="loaded" class="card editor-card">
        <label class="field">
          <span class="field-label">Title</span>
          <input v-model="title" type="text" class="title-input" autocomplete="off" placeholder="Page title" />
        </label>
        <RichTextEditor v-model="body" label="Page content" placeholder="Write your page content here..." min-height="18rem" />
      </div>
    </form>
  </div>
</template>
