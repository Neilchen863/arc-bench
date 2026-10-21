<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, byCreated } from '../api.js';

const router = useRouter();
const books = ref([]);
const loading = ref(true);

onMounted(async () => {
  books.value = ((await api.list('books')) || []).sort(byCreated);
  loading.value = false;
});
</script>

<template>
  <div class="content-card">
    <section aria-labelledby="books-heading">
      <div class="list-header">
        <h1 id="books-heading">Books</h1>
        <el-button type="primary" @click="router.push('/books/new')">New book</el-button>
      </div>
      <p v-if="loading" class="muted">Loading books...</p>
      <el-empty v-else-if="!books.length" description="No books yet. Create the first one." />
      <ul v-else class="entity-list books">
        <li v-for="book in books" :key="book.id">
          <router-link :to="`/books/${book.id}`">{{ book.name }}</router-link>
          <p v-if="book.description">{{ book.description }}</p>
        </li>
      </ul>
    </section>
  </div>
</template>
