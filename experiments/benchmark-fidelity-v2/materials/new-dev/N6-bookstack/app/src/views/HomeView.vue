<script setup>
import { onMounted, ref } from 'vue';
import { api, byCreated } from '../api.js';

const books = ref([]);
onMounted(async () => {
  books.value = ((await api.list('books')) || []).sort(byCreated).reverse().slice(0, 5);
});
</script>

<template>
  <div class="content-card">
    <h1>Welcome to the knowledge base</h1>
    <p class="muted">Browse books and shelves, or start a new book to collect your pages.</p>
    <p>
      <router-link to="/books">Browse all books</router-link>
    </p>
    <section v-if="books.length" aria-labelledby="recent-books-heading">
      <h2 id="recent-books-heading">Recently created books</h2>
      <ul class="entity-list books">
        <li v-for="book in books" :key="book.id">
          <router-link :to="`/books/${book.id}`">{{ book.name }}</router-link>
        </li>
      </ul>
    </section>
  </div>
</template>
