<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api.js';
import { toPlainText } from '../sanitize.js';

const router = useRouter();
const books = ref(null);
const error = ref('');
onMounted(async () => {
  try { books.value = await api.list('books'); } catch (e) { error.value = 'Books could not be loaded.'; }
});
</script>

<template>
  <div class="container">
    <div class="page-head">
      <h1>Books</h1>
      <button type="button" class="btn primary" @click="router.push('/books/new')">Create New Book</button>
    </div>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <section aria-label="Book list" class="card">
      <p v-if="books && !books.length" class="muted">No books yet. Create the first one.</p>
      <p v-else-if="!books" class="muted">Loading…</p>
      <ul v-else class="entity-list">
        <li v-for="b in books" :key="b.id" class="entity book-entity">
          <RouterLink :to="`/books/${b.id}`" class="entity-title">{{ b.name }}</RouterLink>
          <p v-if="b.description" class="excerpt">{{ toPlainText(b.description) }}</p>
        </li>
      </ul>
    </section>
  </div>
</template>
