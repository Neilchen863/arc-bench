<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppBreadcrumbs from '../components/AppBreadcrumbs.vue';
import { api, formatDate } from '../api.js';

const props = defineProps({
  bookId: { type: String, required: true },
  pageId: { type: String, required: true },
});
const router = useRouter();
const book = ref(null);
const page = ref(null);
const loading = ref(true);

onMounted(async () => {
  const [b, p] = await Promise.all([api.get('books', props.bookId), api.get('pages', props.pageId)]);
  book.value = b;
  page.value = p && p.bookId === props.bookId ? p : null;
  loading.value = false;
});
</script>

<template>
  <p v-if="loading" class="muted">Loading...</p>
  <el-result v-else-if="!page || !book" icon="warning" title="Page not found">
    <template #extra><router-link to="/books">Back to books</router-link></template>
  </el-result>
  <template v-else>
    <AppBreadcrumbs :items="[{ label: 'Books', to: '/books' }, { label: book.name, to: `/books/${book.id}` }, { label: page.title }]" />
    <div class="layout">
      <article class="content-card">
        <h1>{{ page.title }}</h1>
        <div class="page-body">{{ page.body }}</div>
      </article>
      <aside class="side" aria-label="Page details and actions">
        <section>
          <h2>Details</h2>
          <p class="muted">Created {{ formatDate(page.createdOn) }}</p>
          <p v-if="page.updatedOn && page.updatedOn !== page.createdOn" class="muted">Updated {{ formatDate(page.updatedOn) }}</p>
        </section>
        <section>
          <h2>Actions</h2>
          <div class="actions">
            <el-button type="primary" plain @click="router.push(`/books/${book.id}/pages/${page.id}/edit`)">Edit</el-button>
          </div>
        </section>
      </aside>
    </div>
  </template>
</template>
