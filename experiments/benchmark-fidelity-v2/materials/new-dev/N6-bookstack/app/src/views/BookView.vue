<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppBreadcrumbs from '../components/AppBreadcrumbs.vue';
import { api, byCreated, formatDate } from '../api.js';

const props = defineProps({ bookId: { type: String, required: true } });
const router = useRouter();
const book = ref(null);
const pages = ref([]);
const loading = ref(true);

onMounted(async () => {
  const [b, all] = await Promise.all([api.get('books', props.bookId), api.list('pages')]);
  book.value = b;
  pages.value = (all || []).filter((p) => p.bookId === props.bookId).sort(byCreated);
  loading.value = false;
});

const excerpt = (text) => (text || '').replace(/\s+/g, ' ').slice(0, 160);
</script>

<template>
  <p v-if="loading" class="muted">Loading...</p>
  <el-result v-else-if="!book" icon="warning" title="Book not found">
    <template #extra><router-link to="/books">Back to books</router-link></template>
  </el-result>
  <template v-else>
    <AppBreadcrumbs :items="[{ label: 'Books', to: '/books' }, { label: book.name }]" />
    <div class="layout">
      <article class="content-card">
        <h1>{{ book.name }}</h1>
        <p v-if="book.description" class="description">{{ book.description }}</p>
        <ul v-if="book.tags?.length" class="tags" aria-label="Tags">
          <li v-for="tag in book.tags" :key="tag"><el-tag type="info">{{ tag }}</el-tag></li>
        </ul>
        <section aria-labelledby="pages-heading">
          <h2 id="pages-heading">Pages</h2>
          <el-empty v-if="!pages.length" description="This book has no pages yet." :image-size="80" />
          <ul v-else class="entity-list">
            <li v-for="page in pages" :key="page.id">
              <router-link :to="`/books/${book.id}/pages/${page.id}`">{{ page.title }}</router-link>
              <p v-if="page.body">{{ excerpt(page.body) }}</p>
            </li>
          </ul>
        </section>
      </article>
      <aside class="side" aria-label="Book details and actions">
        <section>
          <h2>Details</h2>
          <p class="muted">Created {{ formatDate(book.createdOn) }}</p>
          <p v-if="book.updatedOn && book.updatedOn !== book.createdOn" class="muted">Updated {{ formatDate(book.updatedOn) }}</p>
        </section>
        <section>
          <h2>Actions</h2>
          <div class="actions">
            <el-button type="primary" plain @click="router.push(`/books/${book.id}/pages/new`)">New page</el-button>
            <el-button @click="router.push(`/books/${book.id}/edit`)">Edit book</el-button>
          </div>
        </section>
      </aside>
    </div>
  </template>
</template>
