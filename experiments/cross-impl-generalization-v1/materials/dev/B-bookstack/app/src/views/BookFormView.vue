<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, businessNow } from '../api.js';

const props = defineProps({ bookId: { type: String, default: null } });
const router = useRouter();
const editing = !!props.bookId;
const formRef = ref();
const saving = ref(false);
const notFound = ref(false);
const form = reactive({ name: '', description: '', tags: '' });
const rules = { name: [{ required: true, whitespace: true, message: 'Please enter a book name', trigger: 'blur' }] };

onMounted(async () => {
  if (!editing) return;
  const book = await api.get('books', props.bookId);
  if (!book) { notFound.value = true; return; }
  form.name = book.name;
  form.description = book.description || '';
  form.tags = (book.tags || []).join(', ');
});

const parseTags = (s) => s.split(',').map((t) => t.trim()).filter(Boolean);

async function save() {
  if (!(await formRef.value.validate().catch(() => false))) return;
  saving.value = true;
  try {
    const now = await businessNow();
    const data = { name: form.name.trim(), description: form.description, tags: parseTags(form.tags), updatedOn: now };
    const book = editing
      ? await api.patch('books', props.bookId, data)
      : await api.create('books', { ...data, createdOn: now });
    router.push(`/books/${book.id}`);
  } finally {
    saving.value = false;
  }
}

function cancel() {
  router.push(editing ? `/books/${props.bookId}` : '/books');
}
</script>

<template>
  <div class="content-card">
    <el-result v-if="notFound" icon="warning" title="Book not found" />
    <template v-else>
      <h1>{{ editing ? 'Edit book' : 'New book' }}</h1>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" hide-required-asterisk @submit.prevent="save">
        <el-form-item label="Name" prop="name">
          <el-input v-model="form.name" maxlength="255" aria-required="true" />
        </el-form-item>
        <el-form-item label="Description" prop="description">
          <el-input v-model="form.description" type="textarea" :autosize="{ minRows: 4, maxRows: 12 }" />
        </el-form-item>
        <el-form-item label="Tags" prop="tags">
          <el-input v-model="form.tags" placeholder="Comma separated, e.g. manual, handbook" />
        </el-form-item>
        <div class="form-actions">
          <el-button @click="cancel">Cancel</el-button>
          <el-button type="primary" native-type="submit" :loading="saving">Save book</el-button>
        </div>
      </el-form>
    </template>
  </div>
</template>
