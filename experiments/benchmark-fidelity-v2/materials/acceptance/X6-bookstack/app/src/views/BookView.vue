<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, formatDate } from '../api.js';
import { sanitize, toPlainText } from '../sanitize.js';

const props = defineProps({ id: { type: String, required: true } });
const router = useRouter();
const book = ref(null);
const pages = ref([]);
const error = ref('');

onMounted(async () => {
  try {
    const [b, all] = await Promise.all([api.get('books', props.id), api.list('pages')]);
    book.value = b;
    pages.value = all.filter(p => p.bookId === props.id);
    document.title = `${b.name} | BookStack`;
  } catch { error.value = 'This book could not be found.'; }
});
</script>

<template>
  <div class="container">
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <template v-if="book">
      <nav aria-label="Breadcrumb" class="crumbs">
        <RouterLink to="/books">Books</RouterLink> <span aria-hidden="true">›</span>
        <span aria-current="page">{{ book.name }}</span>
      </nav>
      <div class="layout">
        <article class="card">
          <h1>{{ book.name }}</h1>
          <div v-if="book.description" class="rich" v-html="sanitize(book.description)"></div>
          <ul v-if="book.tags && book.tags.length" class="tags" aria-label="Tags">
            <li v-for="t in book.tags" :key="t">{{ t }}</li>
          </ul>
          <section aria-labelledby="pages-heading" class="pages">
            <h2 id="pages-heading">Pages</h2>
            <p v-if="!pages.length" class="muted">This book has no pages yet.</p>
            <ul v-else class="card-grid">
              <li v-for="p in pages" :key="p.id">
                <article class="page-card">
                  <h3 class="page-card-title"><RouterLink :to="`/pages/${p.id}`" class="stretched">{{ p.title }}</RouterLink></h3>
                  <p class="page-card-excerpt">{{ toPlainText(p.html).slice(0, 90) }}</p>
                  <p class="muted small" v-if="p.updated">Updated {{ formatDate(p.updated) }}</p>
                </article>
              </li>
            </ul>
          </section>
        </article>
        <aside class="side" aria-label="Book details and actions">
          <h2>Details</h2>
          <p class="muted" v-if="book.created">Created {{ formatDate(book.created) }}</p>
          <p class="muted" v-if="book.updated && book.updated !== book.created">Updated {{ formatDate(book.updated) }}</p>
          <h2>Actions</h2>
          <div class="actions">
            <button type="button" class="btn action" @click="router.push(`/books/${book.id}/pages/new`)">New Page</button>
            <button type="button" class="btn action" @click="router.push(`/books/${book.id}/edit`)">Edit book</button>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>
