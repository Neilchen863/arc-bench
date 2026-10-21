<script setup>
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { api, businessNow, parseTags } from '../api.js';
import { sanitize } from '../sanitize.js';
import RichTextEditor from '../components/RichTextEditor.vue';

const props = defineProps({ id: { type: String, default: '' } });
const router = useRouter();
const editing = computed(() => !!props.id);
const name = ref('');
const description = ref('');
const tags = ref('');
const error = ref('');
const saving = ref(false);
const loaded = ref(!props.id);

onMounted(async () => {
  if (!props.id) return;
  try {
    const book = await api.get('books', props.id);
    name.value = book.name || '';
    description.value = book.description || '';
    tags.value = (book.tags || []).join(', ');
    loaded.value = true;
  } catch { error.value = 'This book could not be found.'; }
});

async function save() {
  if (!name.value.trim()) { error.value = 'Please enter a name for the book.'; return; }
  saving.value = true;
  error.value = '';
  try {
    const now = await businessNow();
    const data = { name: name.value.trim(), description: sanitize(description.value), tags: parseTags(tags.value), updated: now };
    if (editing.value) {
      await api.patch('books', props.id, data);
      router.push(`/books/${props.id}`);
    } else {
      const book = await api.create('books', { ...data, created: now });
      router.push(`/books/${book.id}`);
    }
  } catch { error.value = 'The book could not be saved. Please try again.'; saving.value = false; }
}
function cancel() {
  router.push(editing.value ? `/books/${props.id}` : '/books');
}
</script>

<template>
  <div class="container narrow">
    <nav aria-label="Breadcrumb" class="crumbs"><RouterLink to="/books">Books</RouterLink></nav>
    <form class="card form" novalidate @submit.prevent="save">
      <h1>{{ editing ? 'Edit Book' : 'Create New Book' }}</h1>
      <p v-if="error" role="alert" class="error">{{ error }}</p>
      <template v-if="loaded">
        <label class="field">
          <span class="field-label">Name</span>
          <input v-model="name" type="text" required autocomplete="off" />
        </label>
        <RichTextEditor v-model="description" label="Description" min-height="7rem" />
        <label class="field">
          <span class="field-label">Tags</span>
          <input v-model="tags" type="text" autocomplete="off" aria-describedby="tags-hint" />
          <small id="tags-hint" class="muted">Separate tags with commas, e.g. manual, handbook</small>
        </label>
        <div class="form-actions">
          <button type="button" class="btn" @click="cancel">Cancel</button>
          <button type="submit" class="btn primary" :disabled="saving">Save Book</button>
        </div>
      </template>
    </form>
  </div>
</template>
