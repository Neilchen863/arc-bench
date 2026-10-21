<script setup>
import { onMounted, ref } from 'vue';
import { api } from '../api.js';
const books = ref([]);
onMounted(async () => { books.value = (await api.list('books')).slice(-5).reverse(); });
</script>

<template>
  <div class="container narrow">
    <h1>Welcome to BookStack</h1>
    <p>Browse the knowledge base by shelf or by book. Anyone can create books and pages.</p>
    <div class="home-entries">
      <RouterLink class="card-link" to="/shelves">Browse shelves</RouterLink>
      <RouterLink class="card-link" to="/books">Browse books</RouterLink>
    </div>
    <section v-if="books.length" aria-labelledby="recent-books">
      <h2 id="recent-books">Recently created books</h2>
      <ul class="plain-list">
        <li v-for="b in books" :key="b.id"><RouterLink :to="`/books/${b.id}`">{{ b.name }}</RouterLink></li>
      </ul>
    </section>
  </div>
</template>
