<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, formatDate } from '../api.js';
import { sanitize } from '../sanitize.js';

const props = defineProps({ id: { type: String, required: true } });
const router = useRouter();
const page = ref(null);
const book = ref(null);
const error = ref('');

onMounted(async () => {
  try {
    page.value = await api.get('pages', props.id);
    document.title = `${page.value.title} | BookStack`;
    book.value = await api.get('books', page.value.bookId).catch(() => null);
  } catch { error.value = 'This page could not be found.'; }
});
</script>

<template>
  <div class="container">
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <template v-if="page">
      <nav aria-label="Breadcrumb" class="crumbs">
        <RouterLink to="/books">Books</RouterLink> <span aria-hidden="true">›</span>
        <template v-if="book"><RouterLink :to="`/books/${book.id}`">{{ book.name }}</RouterLink> <span aria-hidden="true">›</span></template>
        <span aria-current="page">{{ page.title }}</span>
      </nav>
      <div class="layout">
        <article class="card page-content">
          <h1>{{ page.title }}</h1>
          <div class="rich" v-html="sanitize(page.html)"></div>
        </article>
        <aside class="side" aria-label="Page details and actions">
          <h2>Details</h2>
          <p class="muted" v-if="page.created">Created {{ formatDate(page.created) }}</p>
          <p class="muted" v-if="page.updated && page.updated !== page.created">Updated {{ formatDate(page.updated) }}</p>
          <h2>Actions</h2>
          <div class="actions">
            <button type="button" class="btn action" @click="router.push(`/pages/${page.id}/edit`)">Edit page</button>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>
