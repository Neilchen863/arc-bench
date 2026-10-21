<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppBreadcrumbs from '../components/AppBreadcrumbs.vue';
import { api, businessNow } from '../api.js';

const props = defineProps({
  bookId: { type: String, required: true },
  pageId: { type: String, default: null },
});
const router = useRouter();
const editing = !!props.pageId;
const formRef = ref();
const book = ref(null);
const loading = ref(true);
const missing = ref(false);
const saving = ref(false);
const form = reactive({ title: '', body: '' });
const rules = { title: [{ required: true, whitespace: true, message: 'Please give the page a title', trigger: 'blur' }] };

onMounted(async () => {
  book.value = await api.get('books', props.bookId);
  if (editing) {
    const page = await api.get('pages', props.pageId);
    if (page && page.bookId === props.bookId) {
      form.title = page.title;
      form.body = page.body || '';
    } else {
      missing.value = true;
    }
  }
  if (!book.value) missing.value = true;
  loading.value = false;
});

async function save() {
  if (!(await formRef.value.validate().catch(() => false))) return;
  saving.value = true;
  try {
    const now = await businessNow();
    const data = { title: form.title.trim(), body: form.body, updatedOn: now };
    if (editing) {
      await api.patch('pages', props.pageId, data);
      router.push(`/books/${props.bookId}/pages/${props.pageId}`);
    } else {
      await api.create('pages', { ...data, bookId: props.bookId, createdOn: now });
      router.push(`/books/${props.bookId}`);
    }
  } finally {
    saving.value = false;
  }
}

function cancel() {
  router.push(editing ? `/books/${props.bookId}/pages/${props.pageId}` : `/books/${props.bookId}`);
}
</script>

<template>
  <p v-if="loading" class="muted">Loading...</p>
  <el-result v-else-if="missing" icon="warning" title="Page not found">
    <template #extra><router-link to="/books">Back to books</router-link></template>
  </el-result>
  <template v-else>
    <AppBreadcrumbs :items="[{ label: 'Books', to: '/books' }, { label: book.name, to: `/books/${bookId}` }, { label: editing ? 'Edit page' : 'New page' }]" />
    <div class="content-card">
      <h1>{{ editing ? 'Edit page' : 'New page' }}</h1>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" hide-required-asterisk @submit.prevent="save">
        <el-form-item label="Title" prop="title">
          <el-input v-model="form.title" maxlength="255" aria-required="true" />
        </el-form-item>
        <el-form-item label="Content" prop="body">
          <el-input v-model="form.body" type="textarea" :autosize="{ minRows: 12, maxRows: 30 }" placeholder="Write your page content here..." />
        </el-form-item>
        <div class="form-actions">
          <el-button @click="cancel">Cancel</el-button>
          <el-button type="primary" native-type="submit" :loading="saving">Save page</el-button>
        </div>
      </el-form>
    </div>
  </template>
</template>
