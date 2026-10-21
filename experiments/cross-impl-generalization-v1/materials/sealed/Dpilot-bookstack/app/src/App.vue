<script setup>
import { ref } from 'vue';
const query = ref('');
const searchNote = ref('');
function onSearch() {
  searchNote.value = query.value.trim() ? 'Search is not available in this edition.' : '';
}
</script>

<template>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="topbar">
    <RouterLink to="/" class="brand" aria-label="BookStack home">
      <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h12a2 2 0 0 1 2 2v13H6a2 2 0 0 1-2-2zm2 15h14V8h-1v12H6z"/></svg>
      <span>BookStack</span>
    </RouterLink>
    <form class="search" role="search" @submit.prevent="onSearch">
      <input v-model="query" type="search" aria-label="Search" placeholder="Search" />
    </form>
    <nav aria-label="Main">
      <RouterLink to="/shelves">Shelves</RouterLink>
      <RouterLink to="/books">Books</RouterLink>
      <RouterLink to="/login">Login</RouterLink>
    </nav>
  </header>
  <p v-if="searchNote" class="notice" role="status">{{ searchNote }}</p>
  <main id="main" tabindex="-1">
    <RouterView :key="$route.fullPath" />
  </main>
</template>
